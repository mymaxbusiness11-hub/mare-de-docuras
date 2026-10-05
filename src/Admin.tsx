import { useEffect, useMemo, useState, type FormEvent } from "react";

import { supabase } from "./lib/supabase";



type Section = "products" | "orders" | "cakes" | "settings";

type OrderFilter = "new" | "production" | "ready" | "history";



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

  is_new: boolean;

  promo_active: boolean;

  promo_price: number | null;

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



type OrderItem = {

  id: number;

  order_id: number;

  product_id: number | null;

  product_name: string;

  quantity: number;

  unit_price: number;

  options: string | null;

  subtotal: number;

};



type CakeRequest = {
  id: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  desired_date: string;
  size: string;
  servings: string | null;
  base_price: number;
  flavor: string;
  filling: string;
  add_ons: string[] | null;
  decoration: string | null;
  reference_image_url: string | null;
  status: "pending" | "contacted" | "approved" | "rejected" | "completed";
  notes: string | null;
};


type Order = {

  id: number;

  created_at: string;

  customer_name: string;

  customer_phone: string | null;

  order_type: string;

  status: string;

  total: number;

  payment_method: string | null;

  address: string | null;

  order_items: OrderItem[];

};



function money(value: number) {

  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

}



function statusLabel(status: string) {

  switch (status) {

    case "new":

      return "Novo";

    case "production":

      return "Em preparo";

    case "ready":

      return "Pronto";

    case "completed":

      return "Concluído";

    case "cancelled":

      return "Cancelado";

    default:

      return status || "Novo";

  }

}



function statusStyle(status: string) {

  switch (status) {

    case "new":

      return "bg-blue-50 text-blue-700";

    case "production":

      return "bg-orange-50 text-orange-700";

    case "ready":

      return "bg-green-50 text-green-700";

    case "completed":

      return "bg-gray-100 text-gray-600";

    case "cancelled":

      return "bg-red-50 text-red-600";

    default:

      return "bg-gray-100 text-gray-600";

  }

}



function orderBelongsToFilter(order: Order, filter: OrderFilter) {

  if (filter === "new") {

    return order.status === "new";

  }



  if (filter === "production") {

    return order.status === "production";

  }



  if (filter === "ready") {

    return order.status === "ready";

  }



  return order.status === "completed" || order.status === "cancelled";

}



function formatDate(date: string) {

  return new Date(date).toLocaleString("pt-BR", {

    day: "2-digit",

    month: "2-digit",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function nextStatus(status: string) {

  if (status === "new") return "production";

  if (status === "production") return "ready";

  if (status === "ready") return "completed";

  return status;

}



function nextStatusLabel(status: string) {

  if (status === "new") return "Iniciar preparo";

  if (status === "production") return "Marcar como pronto";

  if (status === "ready") return "Finalizar pedido";

  return "";

}



export default function Admin() {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);

  const [loggedIn, setLoggedIn] = useState(false);

  const [error, setError] = useState("");



  const [section, setSection] = useState<Section>("products");

  const [orderFilter, setOrderFilter] = useState<OrderFilter>("new");
  const [orderSearch, setOrderSearch] = useState("");




  const [products, setProducts] = useState<Product[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);



  const [orders, setOrders] = useState<Order[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);

  const [cakeRequests, setCakeRequests] = useState<CakeRequest[]>([]);
  const [loadingCakeRequests, setLoadingCakeRequests] = useState(false);



  const [editingProduct, setEditingProduct] =

    useState<Product | null>(null);



  const [creatingProduct, setCreatingProduct] = useState(false);



  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);



  const [addingOption, setAddingOption] = useState(false);

  const [newOptionName, setNewOptionName] = useState("");

  const [newOptionType, setNewOptionType] = useState("flavor");

  const [newOptionPrice, setNewOptionPrice] = useState(0);

  const [editingOptionId, setEditingOptionId] =

    useState<number | null>(null);



  const [printingOrderId, setPrintingOrderId] =

    useState<number | null>(null);



  const [uploadingImage, setUploadingImage] = useState(false);



  const [storeOpen, setStoreOpen] = useState(true);

  const [loadingStoreStatus, setLoadingStoreStatus] = useState(false);



  useEffect(() => {

    checkSession();



    const {

      data: { subscription },

    } = supabase.auth.onAuthStateChange((_event, session) => {

      setLoggedIn(!!session);



      if (session) {

        loadProducts();

        loadOrders();

        loadStoreStatus();

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

      await Promise.all([
        loadProducts(),
        loadOrders(),
        loadCakeRequests(),
        loadStoreStatus(),
      ]);

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

      console.error(error);

      setError("Não foi possível carregar os produtos.");

    } else {

      setProducts(data || []);

    }



    setLoadingProducts(false);

  }



  async function loadOrders() {

    setLoadingOrders(true);



    const { data, error } = await supabase

      .from("orders")

      .select(`

        *,

        order_items (*)

      `)

      .order("created_at", { ascending: false });



    if (error) {

      console.error(error);

      setError("Não foi possível carregar os pedidos.");

    } else {

      setOrders(data || []);

    }



    setLoadingOrders(false);

  }



  async function loadCakeRequests() {
    setLoadingCakeRequests(true);

    const { data, error } = await supabase
      .from("cake_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Não foi possível carregar as solicitações de bolos.");
    } else {
      setCakeRequests((data || []) as CakeRequest[]);
    }

    setLoadingCakeRequests(false);
  }

  async function changeCakeRequestStatus(
    request: CakeRequest,
    status: CakeRequest["status"]
  ) {
    setError("");

    const { error } = await supabase
      .from("cake_requests")
      .update({ status })
      .eq("id", request.id);

    if (error) {
      console.error(error);
      setError("Não foi possível atualizar o status da solicitação.");
      return;
    }

    setCakeRequests((current) =>
      current.map((item) =>
        item.id === request.id ? { ...item, status } : item
      )
    );
  }

  function cakeStatusStyle(status: CakeRequest["status"]) {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "contacted":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "approved":
        return "bg-green-50 text-green-700 border-green-100";
      case "rejected":
        return "bg-red-50 text-red-600 border-red-100";
      case "completed":
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  }
async function deleteCakeRequest(request: CakeRequest) {
  const confirmed = window.confirm(
    `Excluir a solicitação de bolo #${request.id} de ${request.customer_name}?\n\nEssa ação é permanente.`
  );

  if (!confirmed) return;

  setError("");

  // Se houver imagem de referência, tenta remover do Storage primeiro.
  if (request.reference_image_url) {
    const marcador =
      "/storage/v1/object/public/cake-references/";

    const indice =
      request.reference_image_url.indexOf(marcador);

    if (indice !== -1) {
      const caminho = decodeURIComponent(
        request.reference_image_url.substring(
          indice + marcador.length
        )
      );

      const { error: storageError } =
        await supabase.storage
          .from("cake-references")
          .remove([caminho]);

      if (storageError) {
        console.error(
          "ERRO AO EXCLUIR IMAGEM DA SOLICITAÇÃO:",
          storageError
        );

        setError(
          `Não foi possível excluir a imagem de referência da solicitação #${request.id}. A solicitação não foi excluída.`
        );

        return;
      }
    }
  }

  const { error: requestError } = await supabase
    .from("cake_requests")
    .delete()
    .eq("id", request.id);

  if (requestError) {
    console.error(
      "ERRO AO EXCLUIR SOLICITAÇÃO DE BOLO:",
      requestError
    );

    setError(
      `Não foi possível excluir a solicitação #${request.id}. ${requestError.message}`
    );

    return;
  }

  setCakeRequests((current) =>
    current.filter((item) => item.id !== request.id)
  );
}

  async function loadStoreStatus() {

    const { data, error } = await supabase

      .from("store_settings")

      .select("is_open")

      .eq("id", 1)

      .single();



    if (error) {

      console.error(error);

      setError("Não foi possível carregar o status da loja.");

      return;

    }



    setStoreOpen(Boolean(data?.is_open));

  }



  async function toggleStoreStatus() {

    setLoadingStoreStatus(true);

    setError("");

    const nextStatus = !storeOpen;



    const { error } = await supabase

      .from("store_settings")

      .update({ is_open: nextStatus, updated_at: new Date().toISOString() })

      .eq("id", 1);



    if (error) {

      console.error(error);

      setError("Não foi possível alterar o status da loja.");

    } else {

      setStoreOpen(nextStatus);

    }



    setLoadingStoreStatus(false);

  }



  async function handleLogin(e: FormEvent) {

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

    setOrders([]);

    setEmail("");

    setPassword("");

    setEditingProduct(null);

  }



  async function saveProduct() {

    if (!editingProduct) return;

    if (editingProduct.promo_active) {
      const promoPrice = Number(editingProduct.promo_price);

      if (!Number.isFinite(promoPrice) || promoPrice <= 0) {
        alert("Informe um preço promocional válido.");
        return;
      }

      if (promoPrice >= Number(editingProduct.price)) {
        alert("O preço promocional deve ser menor que o preço normal.");
        return;
      }
    }



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

          is_new: editingProduct.is_new,
          promo_active: editingProduct.promo_active,
          promo_price: editingProduct.promo_active ? editingProduct.promo_price : null,
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



      setProducts((current) => [...current, data]);

      closeEdit();

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
        is_new: editingProduct.is_new,
        promo_active: editingProduct.promo_active,
        promo_price: editingProduct.promo_active ? editingProduct.promo_price : null,
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



    setProducts((current) =>

      current.map((product) =>

        product.id === data.id ? data : product

      )

    );



    closeEdit();

    setLoadingProducts(false);

  }



  async function deleteProduct(product: Product) {

    const confirmed = window.confirm(

      `Excluir "${product.name}"?\n\nEssa ação excluirá o produto e seus sabores/adicionais.`

    );



    if (!confirmed) return;



    setError("");

    setLoadingProducts(true);



    const { error: optionsError } = await supabase

      .from("product_options")

      .delete()

      .eq("product_id", product.id);



    if (optionsError) {

      console.error(optionsError);

      setError("Não foi possível excluir as opções do produto.");

      setLoadingProducts(false);

      return;

    }



    const { error: productError } = await supabase

      .from("products")

      .delete()

      .eq("id", product.id);



    if (productError) {

      console.error(productError);

      setError("Não foi possível excluir o produto.");

      setLoadingProducts(false);

      return;

    }



    setProducts((current) =>

      current.filter((item) => item.id !== product.id)

    );



    if (editingProduct?.id === product.id) {

      closeEdit();

    }



    setLoadingProducts(false);

  }



  async function openEdit(product: Product) {

    setEditingProduct({ ...product });

    setCreatingProduct(false);

    setError("");



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

            is_new: false,
      promo_active: false,
      promo_price: null,
      sort_order: products.length + 1,

    });



    setProductOptions([]);

    setAddingOption(false);

    setEditingOptionId(null);

  }



  function closeEdit() {

    setEditingProduct(null);

    setCreatingProduct(false);

    setProductOptions([]);

    setAddingOption(false);

    setEditingOptionId(null);

  }



  async function compressImage(file: File): Promise<Blob> {

    const MAX_SIZE = 1600;

    const QUALITY = 0.85;



    const imageUrl = URL.createObjectURL(file);



    try {

      const image = new Image();



      await new Promise<void>((resolve, reject) => {

        image.onload = () => resolve();

        image.onerror = () => reject(new Error("Não foi possível ler a imagem."));

        image.src = imageUrl;

      });



      const scale = Math.min(1, MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));

      const width = Math.max(1, Math.round(image.naturalWidth * scale));

      const height = Math.max(1, Math.round(image.naturalHeight * scale));



      const canvas = document.createElement("canvas");

      canvas.width = width;

      canvas.height = height;



      const context = canvas.getContext("2d");

      if (!context) {

        throw new Error("Não foi possível preparar a imagem.");

      }



      context.imageSmoothingEnabled = true;

      context.imageSmoothingQuality = "high";

      context.drawImage(image, 0, 0, width, height);



      const blob = await new Promise<Blob | null>((resolve) => {

        canvas.toBlob(resolve, "image/jpeg", QUALITY);

      });



      if (!blob) {

        throw new Error("Não foi possível comprimir a imagem.");

      }



      return blob;

    } finally {

      URL.revokeObjectURL(imageUrl);

    }

  }



  async function handleImageUpload(file: File) {

    if (!file.type.startsWith("image/")) {

      setError("Selecione um arquivo de imagem válido.");

      return;

    }



    if (file.size > 50 * 1024 * 1024) {

      setError("A imagem deve ter no máximo 50 MB.");

      return;

    }



    setUploadingImage(true);

    setError("");



    try {

      let compressedImage: Blob;



      try {

        compressedImage = await compressImage(file);

      } catch (compressionError) {

        console.error("Erro ao otimizar imagem:", compressionError);

        setError(

          "Não foi possível ler essa foto no navegador. Se ela estiver em HEIC/HEIF, salve ou escolha uma versão JPG/PNG e tente novamente."

        );

        return;

      }



      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const filePath = `products/${uniqueId}.jpg`;



      const { error: uploadError } = await supabase.storage

        .from("product-images")

        .upload(filePath, compressedImage, {

          cacheControl: "31536000",

          upsert: false,

          contentType: "image/jpeg",

        });



      if (uploadError) {

        console.error("Erro ao enviar imagem:", uploadError);

        setError(`Não foi possível enviar a imagem: ${uploadError.message}`);

        return;

      }



      const { data } = supabase.storage

        .from("product-images")

        .getPublicUrl(filePath);



      if (!data?.publicUrl) {

        setError("A imagem foi enviada, mas não foi possível obter a URL.");

        return;

      }



      updateEditingProduct("image_url", data.publicUrl);

    } catch (uploadError) {

      console.error("Erro ao preparar/enviar imagem:", uploadError);

      setError(

        uploadError instanceof Error

          ? uploadError.message

          : "Ocorreu um erro ao preparar a imagem."

      );

    } finally {

      setUploadingImage(false);

    }

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



  async function addOption() {

    if (!editingProduct || creatingProduct) return;



    if (!newOptionName.trim()) {

      setError("Digite o nome da opção.");

      return;

    }



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

      setError("Não foi possível cadastrar a opção.");

      return;

    }



    setProductOptions((current) => [...current, data]);



    setNewOptionName("");

    setNewOptionType("flavor");

    setNewOptionPrice(0);

    setAddingOption(false);

  }



  async function saveOption() {

    if (editingOptionId === null) return;



    if (!newOptionName.trim()) {

      setError("Digite o nome da opção.");

      return;

    }



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

      setError("Não foi possível salvar a opção.");

      return;

    }



    setProductOptions((current) =>

      current.map((option) =>

        option.id === data.id ? data : option

      )

    );



    setEditingOptionId(null);

    setNewOptionName("");

    setNewOptionType("flavor");

    setNewOptionPrice(0);

  }



  async function toggleOption(option: ProductOption) {

    const { error } = await supabase

      .from("product_options")

      .update({

        available: !option.available,

      })

      .eq("id", option.id);



    if (error) {

      console.error(error);

      setError("Não foi possível alterar a disponibilidade.");

      return;

    }



    setProductOptions((current) =>

      current.map((item) =>

        item.id === option.id

          ? { ...item, available: !option.available }

          : item

      )

    );

  }



  async function deleteOption(option: ProductOption) {

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

      setError("Não foi possível excluir a opção.");

      return;

    }



    setProductOptions((current) =>

      current.filter((item) => item.id !== option.id)

    );

  }



  async function changeOrderStatus(

    order: Order,

    status: string

  ) {

    setError("");



    const { error } = await supabase

      .from("orders")

      .update({ status })

      .eq("id", order.id);



    if (error) {

      console.error(error);

      setError("Não foi possível atualizar o pedido.");

      return;

    }



    setOrders((current) =>

      current.map((item) =>

        item.id === order.id

          ? { ...item, status }

          : item

      )

    );

  }



  async function deleteOrder(order: Order) {

    const confirmed = window.confirm(

      `Excluir o pedido #${order.id} de ${order.customer_name}?\\\n\\\nEssa ação é permanente e excluirá o pedido e seus itens.`

    );



    if (!confirmed) return;



    setError("");



    const { error: itemsError } = await supabase

      .from("order_items")

      .delete()

      .eq("order_id", order.id);



    if (itemsError) {

      console.error(itemsError);

      setError(

        `Não foi possível excluir os itens do pedido #${order.id}. ${itemsError.message}`

      );

      return;

    }



    const { error: orderError } = await supabase

      .from("orders")

      .delete()

      .eq("id", order.id);



    if (orderError) {

      console.error(orderError);

      setError(

        `Não foi possível excluir o pedido #${order.id}. ${orderError.message}`

      );

      return;

    }



    setOrders((current) =>

      current.filter((item) => item.id !== order.id)

    );

  }



  function printOrder(orderId: number) {

  setPrintingOrderId(orderId);



  const url = `mareprint://print?order_id=${orderId}`;



  window.location.href = url;



  setTimeout(() => {

    setPrintingOrderId(null);

  }, 2000);

}



  const filteredOrders = useMemo(() => {
  const search = orderSearch.trim();

  if (search) {
    return orders.filter((order) =>
      String(order.id).includes(search)
    );
  }

  return orders.filter((order) =>
    orderBelongsToFilter(order, orderFilter)
  );
}, [orders, orderFilter, orderSearch]);



  const counts = useMemo(() => {

    return {

      new: orders.filter((o) => o.status === "new").length,

      production: orders.filter((o) => o.status === "production").length,

      ready: orders.filter((o) => o.status === "ready").length,

      history: orders.filter(

        (o) =>

          o.status === "completed" ||

          o.status === "cancelled"

      ).length,

    };

  }, [orders]);



  const pendingCakeRequests = useMemo(
    () => cakeRequests.filter((request) => request.status === "pending").length,
    [cakeRequests]
  );

  if (checkingSession) {

    return (

      <div className="min-h-screen bg-[#fffaf5] flex items-center justify-center">

        <p className="text-gray-500">Carregando...</p>

      </div>

    );

  }



  if (!loggedIn) {

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

              Entre para gerenciar a loja.

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



  return (

    <div className="min-h-screen bg-[#fffaf5] px-3 py-4 sm:px-6 sm:py-8">

      <div className="max-w-6xl mx-auto">



        {/* CABEÇALHO */}

        <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-8">



          <div className="flex items-center justify-between gap-3 mb-6">

            <div>

              <p className="text-sm text-[#e58b9c] font-semibold">

                Maré de Doçuras

              </p>



              <h1 className="text-2xl sm:text-3xl font-bold text-[#333] mt-1">

                Painel Administrativo

              </h1>



              <p className="text-sm text-gray-500 mt-1 hidden sm:block">

                Gerencie produtos, pedidos e solicitações de bolos da loja.

              </p>

            </div>



            <div className="flex items-center gap-2 flex-wrap justify-end">

              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${storeOpen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>

                <span className={`h-2 w-2 rounded-full ${storeOpen ? "bg-green-500" : "bg-red-500"}`} />

                {storeOpen ? "Loja aberta" : "Loja fechada"}

              </span>



              <button

                onClick={toggleStoreStatus}

                disabled={loadingStoreStatus}

                className={`rounded-xl px-3 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${

                  storeOpen

                    ? "bg-red-500 hover:bg-red-600"

                    : "bg-green-600 hover:bg-green-700"

                }`}

              >

                {loadingStoreStatus ? "..." : storeOpen ? "Fechar loja" : "Abrir loja"}

              </button>



              <button

                onClick={handleLogout}

                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"

              >

                Sair

              </button>

            </div>

          </div>



          {/* MENU PRINCIPAL */}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">

            <button

              onClick={() => setSection("products")}

              className={`rounded-2xl px-3 py-3 sm:py-4 text-sm font-bold transition ${

                section === "products"

                  ? "bg-[#e58b9c] text-white shadow-sm"

                  : "bg-[#fff5f6] text-gray-700 border border-[#f3dfe2]"

              }`}

            >

              📦

              <span className="block mt-1">

                Produtos

              </span>

            </button>



            <button

              onClick={() => {

                setSection("orders");

                setOrderFilter("new");

              }}

              className={`rounded-2xl px-3 py-3 sm:py-4 text-sm font-bold transition ${

                section === "orders"

                  ? "bg-[#e58b9c] text-white shadow-sm"

                  : "bg-[#fff5f6] text-gray-700 border border-[#f3dfe2]"

              }`}

            >

              🛍️

              <span className="block mt-1">

                Pedidos

              </span>



              {counts.new > 0 && (

                <span className="inline-flex mt-1 min-w-5 h-5 items-center justify-center rounded-full bg-red-500 text-white text-[11px] px-1">

                  {counts.new}

                </span>

              )}

            </button>



            <button
              onClick={() => setSection("cakes")}
              className={`rounded-2xl px-3 py-3 sm:py-4 text-sm font-bold transition ${
                section === "cakes"
                  ? "bg-[#e58b9c] text-white shadow-sm"
                  : "bg-[#fff5f6] text-gray-700 border border-[#f3dfe2]"
              }`}
            >
              🎂
              <span className="block mt-1">Bolos</span>
              {pendingCakeRequests > 0 && (
                <span className="inline-flex mt-1 min-w-5 h-5 items-center justify-center rounded-full bg-red-500 text-white text-[11px] px-1">
                  {pendingCakeRequests}
                </span>
              )}
            </button>

            <button

              onClick={() => setSection("settings")}

              className={`rounded-2xl px-3 py-3 sm:py-4 text-sm font-bold transition ${

                section === "settings"

                  ? "bg-[#e58b9c] text-white shadow-sm"

                  : "bg-[#fff5f6] text-gray-700 border border-[#f3dfe2]"

              }`}

            >

              ⚙️

              <span className="block mt-1">

                Configurações

              </span>

            </button>

          </div>



          {error && (

            <div className="mb-5 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">

              {error}

            </div>

          )}



          {/* ================= PRODUTOS ================= */}

          {section === "products" && (

            <>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">

                <div>

                  <h2 className="text-xl font-bold text-[#333]">

                    Produtos

                  </h2>



                  <p className="text-sm text-gray-500">

                    {products.length} produto(s) cadastrado(s)

                  </p>

                </div>



                <button

                  onClick={openCreate}

                  className="rounded-xl bg-[#e58b9c] text-white px-4 py-3 font-semibold hover:opacity-90 transition"

                >

                  + Novo produto

                </button>

              </div>



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



                                            {product.promo_active && (
                    <span className="rounded-full bg-pink-50 px-2 py-1 text-xs font-semibold text-pink-700">🔥 Promoção</span>
                  )}
                  {product.is_new && (
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">🆕 Novo</span>
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

                          {money(product.price)}

                        </p>

                      </div>



                      <div className="flex sm:flex-col gap-2">

                        <button

                          onClick={() => openEdit(product)}

                          className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"

                        >

                          Editar

                        </button>



                        <button

                          onClick={() => deleteProduct(product)}

                          disabled={loadingProducts}

                          className="flex-1 rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"

                        >

                          Excluir

                        </button>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </>

          )}


{/* ================= SOLICITAÇÕES DE BOLOS ================= */}

{section === "cakes" && (
  <>
    <div className="mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#333]">
            🎂 Solicitações de bolos
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Orçamentos de bolos personalizados enviados pelos clientes.
          </p>
        </div>

        <button
          onClick={loadCakeRequests}
          disabled={loadingCakeRequests}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingCakeRequests ? "Carregando..." : "🔄 Atualizar"}
        </button>
      </div>
    </div>

    {loadingCakeRequests ? (
      <div className="py-12 text-center text-gray-500">
        Carregando solicitações de bolos...
      </div>
    ) : cakeRequests.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-14 px-6 text-center">
        <div className="text-4xl">🎂</div>

        <h3 className="mt-3 text-lg font-bold text-[#333]">
          Nenhuma solicitação ainda
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Quando alguém montar um bolo personalizado no cardápio,
          a solicitação aparecerá aqui.
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {cakeRequests.map((request) => (
          <div
            key={request.id}
            className="rounded-3xl border border-[#f1e4df] bg-white p-4 sm:p-6 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row gap-5">
              
              <div className="flex-1 min-w-0">

                {/* CABEÇALHO */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-xs font-extrabold text-[#d95360]">
                    BOLO #{request.id}
                  </span>

                  <span className="text-xs text-gray-400">
                    {formatDate(request.created_at)}
                  </span>
                </div>

                {/* CLIENTE + STATUS */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#333]">
                      {request.customer_name}
                    </h3>

                    <a
                      href={`https://wa.me/${request.customer_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm font-semibold text-green-600 hover:underline"
                    >
                      📱 {request.customer_phone}
                    </a>
                  </div>

                  <select
                    value={request.status}
                    onChange={(event) =>
                      changeCakeRequestStatus(
                        request,
                        event.target.value as CakeRequest["status"]
                      )
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-bold outline-none ${cakeStatusStyle(
                      request.status
                    )}`}
                  >
                    <option value="pending">
                      Pendente
                    </option>

                    <option value="contacted">
                      Em contato
                    </option>

                    <option value="approved">
                      Aprovado
                    </option>

                    <option value="rejected">
                      Recusado
                    </option>

                    <option value="completed">
                      Concluído
                    </option>
                  </select>
                </div>

                {/* INFORMAÇÕES */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Data desejada
                    </p>

                    <p className="mt-1 font-bold text-[#333]">
                      {new Date(
                        `${request.desired_date}T12:00:00`
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Tamanho
                    </p>

                    <p className="mt-1 font-bold text-[#333]">
                      {request.size}
                    </p>

                    {request.servings && (
                      <p className="text-xs text-gray-500 mt-1">
                        {request.servings}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Preço-base
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#e58b9c]">
                      {money(request.base_price)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Massa
                    </p>

                    <p className="mt-1 font-semibold text-[#333]">
                      {request.flavor}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Recheio
                    </p>

                    <p className="mt-1 font-semibold text-[#333]">
                      {request.filling}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Adicionais
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#333]">
                      {request.add_ons?.length
                        ? request.add_ons.join(", ")
                        : "Nenhum"}
                    </p>
                  </div>

                </div>

                {/* DECORAÇÃO */}
                {request.decoration && (
                  <div className="mt-3 rounded-2xl border border-[#f1e4df] bg-white p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Decoração / tema
                    </p>

                    <p className="mt-1 text-sm text-[#333] whitespace-pre-line">
                      {request.decoration}
                    </p>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                {request.notes && (
                  <div className="mt-3 rounded-2xl border border-[#f1e4df] bg-white p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      Observações
                    </p>

                    <p className="mt-1 text-sm text-[#333] whitespace-pre-line">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* AÇÕES */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2">

                  <a
                    href={`https://wa.me/${request.customer_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm font-bold text-center hover:bg-green-100"
                  >
                    📱 Falar no WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => deleteCakeRequest(request)}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-bold hover:bg-red-100"
                  >
                    🗑️ Excluir solicitação
                  </button>

                </div>

              </div>

              {/* IMAGEM DE REFERÊNCIA */}
              {request.reference_image_url && (
                <div className="w-full lg:w-48 shrink-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">
                    Imagem de referência
                  </p>

                  <a
                    href={request.reference_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={request.reference_image_url}
                      alt={`Referência do bolo de ${request.customer_name}`}
                      className="h-48 w-full object-cover transition hover:scale-[1.02]"
                    />
                  </a>

                  <p className="mt-2 text-center text-xs text-gray-400">
                    Clique para abrir maior
                  </p>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    )}
  </>
)}
          {/* ================= PEDIDOS ================= */}

          {section === "orders" && (

            <>

              <div className="mb-5">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <h2 className="text-xl font-bold text-[#333]">

                      Pedidos

                    </h2>



                    <p className="text-sm text-gray-500">

                      Acompanhe os pedidos da loja.

                    </p>

                  </div>

<div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    🔎 Procurar pedido pelo número
  </label>

  <div className="flex gap-2">
    <input
      type="text"
      inputMode="numeric"
      value={orderSearch}
      onChange={(e) =>
        setOrderSearch(e.target.value.replace(/\D/g, ""))
      }
      placeholder="Digite o número do pedido..."
      className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#e58b9c]"
    />

    {orderSearch && (
      <button
        type="button"
        onClick={() => setOrderSearch("")}
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
      >
        Limpar
      </button>
    )}
  </div>

  {orderSearch && (
    <p className="text-xs text-gray-500 mt-2">
      {filteredOrders.length} pedido(s) encontrado(s).
    </p>
  )}
</div>

                  <button

                    onClick={loadOrders}

                    disabled={loadingOrders}

                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"

                  >

                    🔄

                  </button>

                </div>

              </div>



              {/* FILTROS */}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">

                <button

                  onClick={() => setOrderFilter("new")}

                  className={`rounded-2xl p-3 text-left border transition ${

                    orderFilter === "new"

                      ? "border-blue-300 bg-blue-50"

                      : "border-gray-100 bg-white"

                  }`}

                >

                  <span className="text-xl">🆕</span>

                  <span className="block text-sm font-bold mt-1">

                    Novos

                  </span>

                  <span className="text-xs text-gray-500">

                    {counts.new}

                  </span>

                </button>



                <button

                  onClick={() => setOrderFilter("production")}

                  className={`rounded-2xl p-3 text-left border transition ${

                    orderFilter === "production"

                      ? "border-orange-300 bg-orange-50"

                      : "border-gray-100 bg-white"

                  }`}

                >

                  <span className="text-xl">👨‍🍳</span>

                  <span className="block text-sm font-bold mt-1">

                    Em preparo

                  </span>

                  <span className="text-xs text-gray-500">

                    {counts.production}

                  </span>

                </button>



                <button

                  onClick={() => setOrderFilter("ready")}

                  className={`rounded-2xl p-3 text-left border transition ${

                    orderFilter === "ready"

                      ? "border-green-300 bg-green-50"

                      : "border-gray-100 bg-white"

                  }`}

                >

                  <span className="text-xl">✅</span>

                  <span className="block text-sm font-bold mt-1">

                    Prontos

                  </span>

                  <span className="text-xs text-gray-500">

                    {counts.ready}

                  </span>

                </button>



                <button

                  onClick={() => setOrderFilter("history")}

                  className={`rounded-2xl p-3 text-left border transition ${

                    orderFilter === "history"

                      ? "border-gray-300 bg-gray-50"

                      : "border-gray-100 bg-white"

                  }`}

                >

                  <span className="text-xl">📜</span>

                  <span className="block text-sm font-bold mt-1">

                    Histórico

                  </span>

                  <span className="text-xs text-gray-500">

                    {counts.history}

                  </span>

                </button>

              </div>



              {loadingOrders ? (

                <div className="py-12 text-center text-gray-500">

                  Carregando pedidos...

                </div>

              ) : filteredOrders.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">

                  <div className="text-4xl">📭</div>



                  <p className="font-semibold text-gray-700 mt-3">

                    Nenhum pedido aqui

                  </p>



                  <p className="text-sm text-gray-500 mt-1">

                    Não há pedidos nesta etapa.

                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {filteredOrders.map((order) => (

                    <div

                      key={order.id}

                      className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm"

                    >

                      {/* TOPO DO PEDIDO */}

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-lg font-bold text-[#333]">

                              Pedido #{order.id}

                            </h3>



                            <span

                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle(

                                order.status

                              )}`}

                            >

                              {statusLabel(order.status)}

                            </span>

                          </div>



                          <p className="text-sm text-gray-500 mt-1">

                            {formatDate(order.created_at)}

                          </p>

                        </div>



                        <strong className="text-lg text-[#079FA6] whitespace-nowrap">

                          {money(order.total)}

                        </strong>

                      </div>



                      {/* CLIENTE */}

                      <div className="mt-4 rounded-xl bg-[#fffaf5] p-3">

                        <p className="font-semibold text-gray-800">

                          👤 {order.customer_name}

                        </p>



                        {order.customer_phone && (

                          <p className="text-sm text-gray-500 mt-1">

                            📱 {order.customer_phone}

                          </p>

                        )}



                        <p className="text-sm text-gray-500 mt-1">

                          {order.order_type === "delivery"

                            ? "🛵 Entrega"

                            : "🏪 Retirada"}

                        </p>



                        {order.payment_method && (

                          <p className="text-sm text-gray-500 mt-1">

                            💳 {order.payment_method}

                          </p>

                        )}



                        {order.address && (

                          <p className="text-sm text-gray-500 mt-1">

                            📍 {order.address}

                          </p>

                        )}

                      </div>



                      {/* ITENS */}

                      <div className="mt-4 space-y-2">

                        {order.order_items?.map((item) => (

                          <div

                            key={item.id}

                            className="flex items-start justify-between gap-3 text-sm"

                          >

                            <div className="min-w-0">

                              <p className="font-semibold text-gray-800">

                                {item.quantity}x{" "}

                                {item.product_name}

                              </p>



                              {item.options && (

                                <p className="text-xs text-gray-500 mt-1">

                                  {item.options}

                                </p>

                              )}

                            </div>



                            <span className="font-semibold text-gray-700 whitespace-nowrap">

                              {money(item.subtotal)}

                            </span>

                          </div>

                        ))}

                      </div>



                      {/* AÇÕES */}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">

                        <button

                          onClick={() => printOrder(order.id)}

                          disabled={printingOrderId === order.id}

                          className="rounded-xl bg-[#079FA6] text-white px-4 py-3 text-sm font-bold hover:opacity-90 disabled:opacity-50"

                        >

                          {printingOrderId === order.id

                            ? "Enviando..."

                            : "🖨️ Imprimir pedido"}

                        </button>



                        {nextStatus(order.status) !== order.status && (

                          <button

                            onClick={() =>

                              changeOrderStatus(

                                order,

                                nextStatus(order.status)

                              )

                            }

                            className="rounded-xl bg-[#e58b9c] text-white px-4 py-3 text-sm font-bold hover:opacity-90"

                          >

                            {nextStatusLabel(order.status)}

                          </button>

                        )}

                      </div>



                      {/* CANCELAR */}

                      {order.status !== "completed" &&

                        order.status !== "cancelled" && (

                          <button

                            onClick={() => {

                              const confirmed = window.confirm(

                                `Cancelar o pedido #${order.id}?`

                              );



                              if (confirmed) {

                                changeOrderStatus(

                                  order,

                                  "cancelled"

                                );

                              }

                            }}

                            className="w-full mt-2 rounded-xl border border-red-100 text-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-50"

                          >

                            Cancelar pedido

                          </button>

                        )}



                      {/* EXCLUIR */}

                      <button

                        onClick={() => deleteOrder(order)}

                        className="w-full mt-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 text-sm font-semibold hover:bg-red-100"

                      >

                        🗑️ Excluir pedido

                      </button>

                    </div>

                  ))}

                </div>

              )}

            </>

          )}



          {/* ================= CONFIGURAÇÕES ================= */}

          {section === "settings" && (

            <>

              <div className="mb-5">

                <h2 className="text-xl font-bold text-[#333]">Configurações</h2>

                <p className="text-sm text-gray-500 mt-1">Informações e configurações do painel.</p>

              </div>



              <div className="space-y-3">

                <div className={`rounded-2xl border p-5 ${storeOpen ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <div>

                      <p className={`text-xs font-bold uppercase tracking-wide ${storeOpen ? "text-green-700" : "text-red-700"}`}>Status da loja</p>

                      <h3 className={`text-xl font-bold mt-1 ${storeOpen ? "text-green-800" : "text-red-800"}`}>

                        {storeOpen ? "🟢 Loja aberta" : "🔴 Loja fechada"}

                      </h3>

                      <p className={`text-sm mt-1 ${storeOpen ? "text-green-700" : "text-red-700"}`}>

                        {storeOpen ? "Os clientes podem fazer pedidos normalmente." : "Os produtos continuam visíveis, mas novos pedidos ficam bloqueados."}

                      </p>

                    </div>

                    <button

                      onClick={toggleStoreStatus}

                      disabled={loadingStoreStatus}

                      className={`rounded-xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-50 ${storeOpen ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}

                    >

                      {loadingStoreStatus ? "Salvando..." : storeOpen ? "Fechar loja" : "Abrir loja"}

                    </button>

                  </div>

                </div>



                <div className="rounded-2xl border border-gray-100 bg-[#fffaf5] p-5">

                  <p className="text-xs font-bold uppercase tracking-wide text-[#e58b9c]">Loja</p>

                  <h3 className="font-bold text-gray-800 mt-1">Maré de Doçuras</h3>

                  <p className="text-sm text-gray-500 mt-1">Sistema de cardápio e pedidos online.</p>

                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">

                  <p className="font-semibold text-gray-800">📦 Produtos</p>

                  <p className="text-sm text-gray-500 mt-1">{products.length} produto(s) cadastrado(s).</p>

                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">

                  <p className="font-semibold text-gray-800">🛍️ Pedidos</p>

                  <p className="text-sm text-gray-500 mt-1">{orders.length} pedido(s) registrado(s).</p>

                </div>

                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">

                  <p className="font-semibold text-yellow-800">🚧 Próximas configurações</p>

                  <p className="text-sm text-yellow-700 mt-1">Taxa de entrega, formas de pagamento e outras opções serão adicionadas futuramente. Promoções já estão disponíveis no cadastro dos produtos.</p>

                </div>

              </div>

            </>

          )}



        {/* ================= MODAL PRODUTO ================= */}

        {editingProduct && (

          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">

            <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-5 sm:p-8">



              <div className="flex items-start justify-between gap-4 mb-6">

                <div>

                  <p className="text-sm text-[#e58b9c] font-semibold">

                    {creatingProduct

                      ? "Novo produto"

                      : "Editando produto"}

                  </p>



                  <h2 className="text-2xl font-bold text-[#333] mt-1">

                    {editingProduct.name || "Novo produto"}

                  </h2>

                </div>



                <button

                  onClick={closeEdit}

                  className="w-10 h-10 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"

                >

                  ×

                </button>

              </div>



              {/* OPÇÕES */}

              {!creatingProduct && (

                <div className="mb-7">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <h3 className="text-lg font-bold text-[#333]">

                        Sabores e adicionais

                      </h3>



                      <p className="text-sm text-gray-500">

                        Gerencie as opções deste produto.

                      </p>

                    </div>



                    <button

                      type="button"

                      onClick={() => {

                        setAddingOption(true);

                        setEditingOptionId(null);

                        setNewOptionName("");

                        setNewOptionType("flavor");

                        setNewOptionPrice(0);

                      }}

                      className="rounded-xl bg-[#e58b9c] text-white px-3 py-2 text-sm font-semibold"

                    >

                      + Adicionar

                    </button>

                  </div>



                  {(addingOption || editingOptionId !== null) && (

                    <div className="mt-4 rounded-2xl bg-[#fffaf5] border border-gray-100 p-4 space-y-4">

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

                          <option value="flavor">

                            Sabor

                          </option>

                          <option value="addon">

                            Adicional

                          </option>

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

                            setNewOptionPrice(

                              Number(e.target.value)

                            )

                          }

                          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"

                        />

                      </div>



                      <div className="flex gap-2">

                        <button

                          type="button"

                          onClick={

                            editingOptionId !== null

                              ? saveOption

                              : addOption

                          }

                          className="rounded-xl bg-[#e58b9c] text-white px-4 py-2 text-sm font-semibold"

                        >

                          {editingOptionId !== null

                            ? "Salvar alteração"

                            : "Salvar opção"}

                        </button>



                        <button

                          type="button"

                          onClick={() => {

                            setAddingOption(false);

                            setEditingOptionId(null);

                          }}

                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"

                        >

                          Cancelar

                        </button>

                      </div>

                    </div>

                  )}



                  <div className="mt-4 space-y-2">

                    {loadingOptions ? (

                      <div className="rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">

                        Carregando opções...

                      </div>

                    ) : productOptions.length === 0 ? (

                      <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">

                        Nenhum sabor ou adicional cadastrado.

                      </div>

                    ) : (

                      productOptions.map((option) => (

                        <div

                          key={option.id}

                          className="rounded-2xl border border-gray-100 p-4"

                        >

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                            <div>

                              <p className="font-semibold text-gray-800">

                                {option.name}

                              </p>



                              <p className="text-sm text-gray-500 mt-1">

                                {option.type === "flavor"

                                  ? "Sabor"

                                  : "Adicional"}



                                {Number(option.price_delta) > 0 &&

                                  ` • +${money(

                                    Number(option.price_delta)

                                  )}`}

                              </p>

                            </div>



                            <div className="flex flex-wrap gap-2">

                              <button

                                type="button"

                                onClick={() => {

                                  setEditingOptionId(option.id);

                                  setAddingOption(false);

                                  setNewOptionName(option.name);

                                  setNewOptionType(option.type);

                                  setNewOptionPrice(

                                    Number(option.price_delta)

                                  );

                                }}

                                className="text-xs font-semibold px-3 py-2 rounded-full bg-blue-50 text-blue-600"

                              >

                                Editar

                              </button>



                              <button

                                type="button"

                                onClick={() =>

                                  toggleOption(option)

                                }

                                className={`text-xs font-semibold px-3 py-2 rounded-full ${

                                  option.available

                                    ? "bg-green-50 text-green-600"

                                    : "bg-red-50 text-red-600"

                                }`}

                              >

                                {option.available

                                  ? "Disponível"

                                  : "Indisponível"}

                              </button>



                              <button

                                type="button"

                                onClick={() =>

                                  deleteOption(option)

                                }

                                className="text-xs font-semibold px-3 py-2 rounded-full bg-gray-100 text-gray-600"

                              >

                                Excluir

                              </button>

                            </div>

                          </div>

                        </div>

                      ))

                    )}

                  </div>

                </div>

              )}



              {/* DADOS DO PRODUTO */}

              <div className="space-y-5">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Nome

                  </label>



                  <input

                    type="text"

                    value={editingProduct.name}

                    onChange={(e) =>

                      updateEditingProduct(

                        "name",

                        e.target.value

                      )

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

                      updateEditingProduct(

                        "description",

                        e.target.value

                      )

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

                        updateEditingProduct(

                          "category",

                          e.target.value

                        )

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

                      updateEditingProduct(

                        "tag",

                        e.target.value

                      )

                    }

                    placeholder="Ex.: Mais pedido"

                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"

                  />

                </div>



                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Imagem do produto

                  </label>



                  <div className="flex flex-col gap-2">

                    <input

                      id="product-image-upload"

                      type="file"

                      accept="image/jpeg,image/png,image/webp,image/gif,image/*"

                      disabled={uploadingImage}

                      onChange={(e) => {

                        const file = e.target.files?.[0];



                        if (!file) return;



                        void handleImageUpload(file);



                        // Permite escolher a mesma foto novamente depois.

                        e.target.value = "";

                      }}

                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-[#e58b9c] file:px-4 file:py-3 file:font-semibold file:text-white file:cursor-pointer disabled:opacity-50"

                    />



                    {uploadingImage && (

                      <p className="text-sm font-semibold text-[#e58b9c]">

                        ⏳ Enviando e otimizando imagem...

                      </p>

                    )}

                  </div>



                  <p className="text-xs text-gray-500 mt-2">

                    Escolha uma foto do celular ou cole uma URL abaixo. Máximo: 50 MB. A foto é otimizada automaticamente antes do envio.

                  </p>



                  <input

                    type="text"

                    value={editingProduct.image_url || ""}

                    onChange={(e) =>

                      updateEditingProduct(

                        "image_url",

                        e.target.value

                      )

                    }

                    placeholder="https\://..."

                    className="w-full mt-2 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]"

                  />

                </div>



                {editingProduct.image_url && (

                  <img

                    src={editingProduct.image_url}

                    alt={editingProduct.name}

                    className="w-full h-48 object-cover rounded-2xl"

                  />

                )}



                <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-4 cursor-pointer">

                  <div>

                    <p className="font-medium text-gray-800">

                      Produto disponível

                    </p>



                    <p className="text-sm text-gray-500">

                      Desative quando estiver esgotado.

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

                <div className="rounded-2xl border border-[#f3dfe2] bg-[#fffafb] p-4 space-y-4">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-800">🔥 Ativar promoção</p>
                      <p className="text-sm text-gray-500">Mostra o selo de promoção e o preço promocional no cardápio.</p>
                    </div>
                    <input type="checkbox" checked={editingProduct.promo_active} onChange={(e) => setEditingProduct((prev) => prev ? { ...prev, promo_active: e.target.checked, promo_price: e.target.checked ? prev.promo_price ?? prev.price : null } : prev)} className="w-5 h-5 accent-[#E85E69]" />
                  </label>
                  {editingProduct.promo_active && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Preço promocional</label>
                      <input type="number" min="0.01" step="0.01" value={editingProduct.promo_price ?? ""} onChange={(e) => updateEditingProduct("promo_price", e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#e58b9c]" placeholder="Ex.: 9.90" />
                      <p className="text-xs text-gray-500 mt-2">O valor deve ser menor que o preço normal de {money(editingProduct.price)}.</p>
                    </div>
                  )}
                </div>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-4 cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-800">🆕 Marcar como “Novo”</p>
                    <p className="text-sm text-gray-500">Exibe o selo 🆕 Novo no cardápio.</p>
                  </div>
                  <input type="checkbox" checked={editingProduct.is_new} onChange={(e) => updateEditingProduct("is_new", e.target.checked)} className="w-5 h-5 accent-[#078E95]" />
                </label>

              </div>



              {/* BOTÕES */}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">

                <button

                  onClick={closeEdit}

                  className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"

                >

                  Cancelar

                </button>



                <button

                  onClick={saveProduct}

                  disabled={loadingProducts}

                  className="rounded-xl bg-[#e58b9c] text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-50"

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

  </div>

  );

}