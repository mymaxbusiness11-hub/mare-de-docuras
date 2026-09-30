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

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  async function handleLogout() {
    await supabase.auth.signOut();

    setLoggedIn(false);
    setProducts([]);
    setEmail("");
    setPassword("");
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
                <h2 className="text-xl font-bold text-[#333]">
                  Produtos
                </h2>

                <p className="text-sm text-gray-500">
                  {products.length} produto(s) cadastrado(s)
                </p>
              </div>

              <button
                disabled
                className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 font-semibold opacity-50 cursor-not-allowed"
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

                    <div className="flex items-center">
                      <button
                        disabled
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 opacity-50 cursor-not-allowed"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
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
            <p className="text-sm text-red-500 text-center">
              {error}
            </p>
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