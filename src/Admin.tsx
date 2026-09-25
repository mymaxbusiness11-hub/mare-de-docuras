import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  tag: string | null;
  sold_out: boolean;
  featured: boolean;
  sort_order: number;
};

type ProductOption = {
  id: number;
  product_id: number;
  name: string;
  type: string;
  price_delta: number;
  available: boolean;
};

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [addingOption, setAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionType, setNewOptionType] = useState("flavor");
  const [newOptionPrice, setNewOptionPrice] = useState(0);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);

      if (session) {
        loadProducts();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setLoggedIn(!!session);
    setCheckingSession(false);

    if (session) {
      loadProducts();
    }
  }

  async function loadProducts() {
    setLoadingProducts(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setError("Não foi possível carregar os produtos.");
      console.error(error);
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    setLoggedIn(true);
    setLoading(false);
  }

  async function saveProduct() {
    if (!editingProduct) return;

    setLoadingProducts(true);
    setError("");

    if (creatingProduct) {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: editingProduct.name,
          description: editingProduct.description,
          price: editingProduct.price,
          image_url: editingProduct.image_url,
          category: editingProduct.category,
          tag: editingProduct.tag,
          sold_out: editingProduct.sold_out,
          featured: editingProduct.featured,
          sort_order: editingProduct.sort_order,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setError("Não foi possível criar o produto.");
        setLoadingProducts(false);
        return;
      }

      setProducts((currentProducts) => [...currentProducts, data]);
      setEditingProduct(null);
      setCreatingProduct(false);
      setLoadingProducts(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        image_url: editingProduct.image_url,
        category: editingProduct.category,
        tag: editingProduct.tag,
        sold_out: editingProduct.sold_out,
        featured: editingProduct.featured,
      })
      .eq("id", editingProduct.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setError("Não foi possível salvar as alterações.");
      setLoadingProducts(false);
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === data.id ? data : product
      )
    );

    setEditingProduct(null);
    setLoadingProducts(false);
  }

async function deleteProduct(product: Product) {
  const confirmed = window.confirm(
    `Excluir "${product.name}"?\n\nEssa ação excluirá o produto e todos os sabores/adicionais vinculados a ele.`
  );

  if (!confirmed) return;

  setError("");
  setLoadingProducts(true);

  // 1. Excluir sabores e adicionais vinculados ao produto
  const { error: optionsError } = await supabase
    .from("product_options")
    .delete()
    .eq("product_id", product.id);

  if (optionsError) {
    console.error("ERRO AO EXCLUIR OPÇÕES:", optionsError);
    setError(`Erro ao excluir opções: ${optionsError.message}`);
    setLoadingProducts(false);
    return;
  }

  // 2. Excluir o produto do banco
  const { error: productError } = await supabase
    .from("products")
    .delete()
    .eq("id", product.id);

  if (productError) {
    console.error("ERRO AO EXCLUIR PRODUTO:", productError);
    setError(`Erro ao excluir produto: ${productError.message}`);
    setLoadingProducts(false);
    return;
  }

  // 3. Só remove da tela depois que o banco confirmou
  setProducts((currentProducts) =>
    currentProducts.filter(
      (currentProduct) => currentProduct.id !== product.id
    )
  );

  if (editingProduct?.id === product.id) {
    setEditingProduct(null);
    setCreatingProduct(false);
    setProductOptions([]);
  }

  setLoadingProducts(false);
}

  async function handleLogout() {
    await supabase.auth.signOut();

    setLoggedIn(false);
    setProducts([]);
    setEmail("");
    setPassword("");
    setEditingProduct(null);
  }

  async function openEdit(product: Product) {
    setEditingProduct({ ...product });
    setCreatingProduct(false);

    setLoadingOptions(true);

    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_id", product.id)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setError("Não foi possível carregar os sabores e adicionais.");
      setProductOptions([]);
    } else {
      setProductOptions(data || []);
    }

    setLoadingOptions(false);
  }

  function openCreate() {
    setCreatingProduct(true);

    setEditingProduct({
      id: 0,
      name: "",
      description: "",
      price: 0,
      image_url: "",
      category: "",
      tag: "",
      sold_out: false,
      featured: false,
      sort_order: products.length + 1,
    });

    setProductOptions([]);
  }

  function closeEdit() {
    setEditingProduct(null);
    setCreatingProduct(false);
    setProductOptions([]);
    setAddingOption(false);
    setEditingOptionId(null);
    setNewOptionName("");
    setNewOptionType("flavor");
    setNewOptionPrice(0);
  }

  function updateEditingProduct(
    field: keyof Product,
    value: string | number | boolean | null
  ) {
    if (!editingProduct) return;

    setEditingProduct({
      ...editingProduct,
      [field]: value,
    });
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#fffaf5] flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (loggedIn) {
    return (
      <div className="min-h-screen bg-[#fffaf5] px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-sm text-[#e58b9c] font-semibold">
                  Maré de Doçuras
                </p>

                <h1 className="text-3xl font-bold text-[#333] mt-1">
                  Painel Administrativo
                </h1>

                <p className="text-gray-500 mt-2">
                  Gerencie os produtos do cardápio.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Sair
              </button>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-[#333]">Produtos</h2>

                <p className="text-sm text-gray-500">
                  {products.length} produto(s) cadastrado(s)
                </p>
              </div>

              <button
                onClick={openCreate}
                className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 font-semibold hover:opacity-90 transition"
              >
                + Novo produto
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {loadingProducts ? (
              <div className="py-12 text-center text-gray-500">
                Carregando produtos...
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4"
                  >
                    <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          Sem foto
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#333]">
                          {product.name}
                        </h3>

                        {product.featured && (
                          <span className="text-xs font-semibold bg-[#fff1d8] text-[#9a6a00] px-2 py-1 rounded-full">
                            Mais pedido
                          </span>
                        )}

                        {product.sold_out && (
                          <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-1 rounded-full">
                            Indisponível
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {product.category || "Sem categoria"}
                      </p>

                      {product.description && (
                        <p className="text-sm text-gray-500 mt-2">
                          {product.description}
                        </p>
                      )}

                      <p className="text-lg font-bold text-[#333] mt-3">
                        R$ {Number(product.price).toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => deleteProduct(product)}
                        disabled={loadingProducts}
                        className="rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editingProduct && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm text-[#e58b9c] font-semibold">
                      {creatingProduct ? "Novo produto" : "Editando produto"}
                    </p>

                    <h2 className="text-2xl font-bold text-[#333] mt-1">
                      {editingProduct.name}
                    </h2>
                  </div>

                  <button
                    onClick={closeEdit}
                    className="w-10 h-10 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-5">
                  {!creatingProduct && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#333]">
                          Sabores e adicionais
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          Opções cadastradas para este produto.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAddingOption(true);
                          setNewOptionName("");
                          setNewOptionType("flavor");
                          setNewOptionPrice(0);
                        }}
                        className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                      >
                        + Adicionar sabor/adicional
                      </button>

                      {addingOption && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-[#fffaf5] p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nome
                            </label>

                            <input
                              type="text"
                              value={newOptionName}
                              onChange={(e) =>
                                setNewOptionName(e.target.value)
                              }
                              placeholder="Ex.: Chocolate"
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo
                            </label>

                            <select
                              value={newOptionType}
                              onChange={(e) =>
                                setNewOptionType(e.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            >
                              <option value="flavor">Sabor</option>
                              <option value="addon">Adicional</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Acréscimo no preço
                            </label>

                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newOptionPrice}
                              onChange={(e) =>
                                setNewOptionPrice(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newOptionName.trim()) {
                                  setError(
                                    "Digite o nome do sabor ou adicional."
                                  );
                                  return;
                                }

                                if (!editingProduct || creatingProduct) return;

                                setError("");

                                const { data, error } = await supabase
                                  .from("product_options")
                                  .insert({
                                    product_id: editingProduct.id,
                                    name: newOptionName.trim(),
                                    type: newOptionType,
                                    price_delta: newOptionPrice,
                                    available: true,
                                  })
                                  .select()
                                  .single();

                                if (error) {
                                  console.error(error);
                                  setError(
                                    "Não foi possível cadastrar a opção."
                                  );
                                  return;
                                }

                                setProductOptions((currentOptions) => [
                                  ...currentOptions,
                                  data,
                                ]);

                                setNewOptionName("");
                                setNewOptionType("flavor");
                                setNewOptionPrice(0);
                                setAddingOption(false);
                              }}
                              className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                            >
                              Salvar opção
                            </button>
                          </div>
                        </div>
                      )}

                      {editingOptionId !== null && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-[#fffaf5] p-4 space-y-4">
                          <div>
                            <h4 className="font-bold text-gray-800">
                              Editar sabor/adicional
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Altere os dados desta opção.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nome
                            </label>

                            <input
                              type="text"
                              value={newOptionName}
                              onChange={(e) =>
                                setNewOptionName(e.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo
                            </label>

                            <select
                              value={newOptionType}
                              onChange={(e) =>
                                setNewOptionType(e.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            >
                              <option value="flavor">Sabor</option>
                              <option value="addon">Adicional</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Acréscimo no preço
                            </label>

                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newOptionPrice}
                              onChange={(e) =>
                                setNewOptionPrice(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newOptionName.trim()) {
                                  setError(
                                    "Digite o nome do sabor ou adicional."
                                  );
                                  return;
                                }

                                if (editingOptionId === null) return;

                                setError("");

                                const { data, error } = await supabase
                                  .from("product_options")
                                  .update({
                                    name: newOptionName.trim(),
                                    type: newOptionType,
                                    price_delta: newOptionPrice,
                                  })
                                  .eq("id", editingOptionId)
                                  .select()
                                  .single();

                                if (error) {
                                  console.error(error);
                                  setError(
                                    "Não foi possível salvar a alteração."
                                  );
                                  return;
                                }

                                setProductOptions((currentOptions) =>
                                  currentOptions.map((option) =>
                                    option.id === data.id ? data : option
                                  )
                                );

                                setEditingOptionId(null);
                                setNewOptionName("");
                                setNewOptionType("flavor");
                                setNewOptionPrice(0);
                              }}
                              className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                            >
                              Salvar alteração
                            </button>
                          </div>
                        </div>
                      )}

                      {loadingOptions ? (
                        <div className="rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
                          Carregando opções...
                        </div>
                      ) : productOptions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                          Nenhum sabor ou adicional cadastrado.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {productOptions.map((option) => (
                            <div
                              key={option.id}
                              className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4"
                            >
                              <div>
                                <p className="font-medium text-gray-800">
                                  {option.name}
                                </p>

                                <p className="text-sm text-gray-500">
                                  {option.type === "flavor"
                                    ? "Sabor"
                                    : "Adicional"}
                                  {Number(option.price_delta) > 0
                                    ? ` • +R$ ${Number(option.price_delta)
                                        .toFixed(2)
                                        .replace(".", ",")}`
                                    : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOptionId(option.id);
                                    setNewOptionName(option.name);
                                    setNewOptionType(option.type);
                                    setNewOptionPrice(
                                      Number(option.price_delta)
                                    );
                                    setAddingOption(false);
                                  }}
                                  className="text-xs font-semibold px-3 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from("product_options")
                                      .update({
                                        available: !option.available,
                                      })
                                      .eq("id", option.id);

                                    if (error) {
                                      console.error(error);
                                      setError(
                                        "Não foi possível alterar a disponibilidade."
                                      );
                                      return;
                                    }

                                    setProductOptions((currentOptions) =>
                                      currentOptions.map((currentOption) =>
                                        currentOption.id === option.id
                                          ? {
                                              ...currentOption,
                                              available: !option.available,
                                            }
                                          : currentOption
                                      )
                                    );
                                  }}
                                  className={`text-xs font-semibold px-3 py-2 rounded-full transition ${
                                    option.available
                                      ? "bg-green-50 text-green-600 hover:bg-green-100"
                                      : "bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  {option.available
                                    ? "Disponível"
                                    : "Indisponível"}
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmed = window.confirm(
                                      `Excluir "${option.name}"?`
                                    );

                                    if (!confirmed) return;

                                    const { error } = await supabase
                                      .from("product_options")
                                      .delete()
                                      .eq("id", option.id);

                                    if (error) {
                                      console.error(error);
                                      setError(
                                        "Não foi possível excluir a opção."
                                      );
                                      return;
                                    }

                                    setProductOptions((currentOptions) =>
                                      currentOptions.filter(
                                        (currentOption) =>
                                          currentOption.id !== option.id
                                      )
                                    );
                                  }}
                                  className="text-xs font-semibold px-3 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome
                    </label>

                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) =>
                        updateEditingProduct("name", e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>

                    <textarea
                      value={editingProduct.description || ""}
                      onChange={(e) =>
                        updateEditingProduct("description", e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preço
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingProduct.price}
                        onChange={(e) =>
                          updateEditingProduct(
                            "price",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoria
                      </label>

                      <input
                        type="text"
                        value={editingProduct.category || ""}
                        onChange={(e) =>
                          updateEditingProduct("category", e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag
                    </label>

                    <input
                      type="text"
                      value={editingProduct.tag || ""}
                      onChange={(e) =>
                        updateEditingProduct("tag", e.target.value)
                      }
                      placeholder="Ex.: Mais pedido"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL da imagem
                    </label>

                    <input
                      type="text"
                      value={editingProduct.image_url || ""}
                      onChange={(e) =>
                        updateEditingProduct("image_url", e.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
                    />
                  </div>

                  {editingProduct.image_url && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Pré-visualização
                      </p>

                      <img
                        src={editingProduct.image_url}
                        alt={editingProduct.name}
                        className="w-full h-48 object-cover rounded-2xl"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-4 cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-800">
                          Produto disponível
                        </p>

                        <p className="text-sm text-gray-500">
                          Desative quando o produto estiver esgotado.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={!editingProduct.sold_out}
                        onChange={(e) =>
                          updateEditingProduct(
                            "sold_out",
                            !e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-[#e58b9c]"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-4 cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-800">
                          Marcar como “Mais pedido”
                        </p>

                        <p className="text-sm text-gray-500">
                          Destaca o produto no cardápio.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={editingProduct.featured}
                        onChange={(e) =>
                          updateEditingProduct(
                            "featured",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-[#e58b9c]"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
                  <button
                    onClick={closeEdit}
                    className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={saveProduct}
                    disabled={loadingProducts}
                    className="rounded-xl bg-[#e58b9c] text-white px-5 py-3 font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loadingProducts
                      ? creatingProduct
                        ? "Cadastrando..."
                        : "Salvando..."
                      : creatingProduct
                        ? "Cadastrar produto"
                        : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">
        <div className="text-center mb-8">
          <p className="text-sm text-[#e58b9c] font-semibold mb-2">
            Maré de Doçuras
          </p>

          <h1 className="text-3xl font-bold text-[#333]">
            Painel Administrativo
          </h1>

          <p className="text-gray-500 mt-2">
            Entre para gerenciar o cardápio.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#e58b9c] text-white py-3 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
