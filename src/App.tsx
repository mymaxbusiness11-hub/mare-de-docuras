import { useEffect, useMemo, useState } from "react";
import Admin from "./Admin";
import logoUrl from "./imports/ChatGPT_Image_24_de_set._de_2026__16_49_11.png";
import boloFlamengo from "./imports/IMG_7341.jpeg";
import boloAniversario from "./imports/IMG_7342.jpeg";
import boloAzul from "./imports/IMG_7343.jpeg";
import { supabase } from "./lib/supabase";

const WHATSAPP_NUMBER = "5521972347730";

type Option = { name: string; price?: number; soldOut?: boolean };
type AddOn = { name: string; price: number };

type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "cash";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
};

type DeliveryArea = {
  name: string;
  fee: number;
};

const deliveryAreas: DeliveryArea[] = [
  { name: "Nova Holanda", fee: 2 },
  { name: "Parque União", fee: 3 },
  { name: "Ramos", fee: 5 },
  { name: "Baixa do Sapateiro", fee: 3 },
  { name: "Vila do João", fee: 3 },
];

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  promo_active: boolean;
  promo_price: number | null;
  image: string;
  category: string;
  tag?: string;
  soldOut?: boolean;
  flavors?: Option[];
  addOns?: AddOn[];
};

type CartItem = {
  key: string;
  product: Product;
  quantity: number;
  flavor?: Option;
  addOns: AddOn[];
};

const fallbackProducts: Product[] = [
  {
    id: 1,
    name: "Bolo de Pote",
    description: "Camadas cremosas, massa fofinha e muito afeto.",
    price: 13.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1611293388250-580b08c4a145?auto=format&fit=crop&w=1000&q=90",
    category: "Bolos",
    tag: "Mais pedido",
    flavors: [
      { name: "Chocolate" },
      { name: "Ninho" },
      { name: "Morango", soldOut: true },
      { name: "Ninho com Nutella", price: 3 },
    ],
    addOns: [
      { name: "Nutella", price: 3 },
      { name: "Morango", price: 2 },
      { name: "Granulado", price: 1 },
    ],
  },
  {
    id: 2,
    name: "Brownie Belga",
    description: "Casquinha crocante e interior intenso e macio.",
    price: 12.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=90",
    category: "Brownies",
    tag: "Queridinho",
    addOns: [
      { name: "Nutella", price: 3 },
      { name: "Morango", price: 2 },
    ],
  },
  {
    id: 3,
    name: "Fatia Red Velvet",
    description: "Massa aveludada com creme suave de baunilha.",
    price: 16.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1602663491496-73f07481dbea?auto=format&fit=crop&w=1000&q=90",
    category: "Bolos",
    flavors: [
      { name: "Tradicional" },
      { name: "Com morangos", price: 2 },
    ],
  },
  {
    id: 4,
    name: "Caixa de Brigadeiros",
    description: "6 brigadeiros artesanais para presentear ou dividir.",
    price: 24.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1575377427642-087cf684f29d?auto=format&fit=crop&w=1000&q=90",
    category: "Kits",
    tag: "Presenteável",
    flavors: [
      { name: "Chocolate belga" },
      { name: "Meio a meio" },
      { name: "Ninho" },
    ],
  },
  {
    id: 5,
    name: "Cupcake da Maré",
    description: "Massa de chocolate e cobertura cremosa artesanal.",
    price: 9.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1576618148400-a5f1a7d7e1a1?auto=format&fit=crop&w=1000&q=90",
    category: "Doces",
    soldOut: true,
  },
  {
    id: 6,
    name: "Combo Doce Pausa",
    description: "2 brownies e 2 doces selecionados pela nossa cozinha.",
    price: 39.9,
    promo_active: false,
    promo_price: null,
    image:
      "https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&w=1000&q=90",
    category: "Combos",
  },
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function getProductBasePrice(product: Product) {
  if (
    product.promo_active &&
    product.promo_price !== null &&
    Number(product.promo_price) > 0
  ) {
    return Number(product.promo_price);
  }

  return Number(product.price);
}

function getDeliveryFee(district: string) {
  const area = deliveryAreas.find(
    (item) =>
      item.name.toLocaleLowerCase("pt-BR") ===
      district.trim().toLocaleLowerCase("pt-BR")
  );

  return area?.fee ?? 0;
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "bag"
    | "whatsapp"
    | "minus"
    | "plus"
    | "trash"
    | "close"
    | "chevron";
  size?: number;
}) {
  const paths = {
    bag: (
      <>
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5a8.5 8.5 0 0 1-12.5 7.48L3 20l1.1-4.24A8.5 8.5 0 1 1 20 11.5Z" />
        <path d="M8.4 7.7c.2-.45.4-.46.7-.47h.6c.18 0 .3.07.4.35l.72 1.73c.08.2.04.35-.08.52l-.55.7c-.13.15-.25.3-.1.56.17.27.75 1.2 1.82 1.94 1.28.88 2.14 1.16 2.48 1.3.25.1.42.08.57-.1l.9-1.04c.18-.22.35-.17.57-.1l1.76.84c.25.12.4.18.45.29.05.1.05.6-.15 1.15-.2.55-1.16 1.05-1.62 1.1-.44.04-1.02.2-3.35-.77-2.83-1.18-4.66-4.1-4.8-4.28-.13-.2-1.15-1.52-1.15-2.9 0-.7.37-1.43.83-1.82Z" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Header({
  onCart,
  storeOpen,
}: {
  onCart: () => void;
  storeOpen: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E9DDD1]/80 bg-[#FFF9F2]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img
            src={logoUrl}
            alt="Maré de Doçuras"
            className="h-14 w-14 rounded-2xl object-cover shadow-[0_5px_18px_rgba(232,94,105,.14)]"
          />

          <div className="leading-none">
            <strong className="font-display text-[22px] font-semibold text-[#E85E69]">
              Maré
            </strong>

            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#079FA6]">
              de Doçuras
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold sm:inline-flex ${
              storeOpen
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                storeOpen ? "bg-green-500" : "bg-red-500"
              }`}
            />

            {storeOpen ? "Loja aberta" : "Loja fechada"}
          </span>

          <a
            href="#produtos"
            className="hidden text-sm font-semibold text-[#675952] transition hover:text-[#E85E69] sm:block"
          >
            Cardápio
          </a>

          <button
            onClick={onCart}
            className="rounded-full bg-[#079FA6] p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#078c92]"
            aria-label="Abrir meu pedido"
          >
            <Icon name="bag" size={19} />
          </button>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#20BD5A]"
          >
            <Icon name="whatsapp" size={18} />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex h-11 items-center rounded-full border border-[#E5D8CB] bg-white shadow-sm">
      <button
        className="grid h-11 w-11 place-items-center text-[#E85E69] transition hover:bg-[#FFF1F1] disabled:opacity-35"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
      >
        <Icon name="minus" size={17} />
      </button>

      <span className="w-8 text-center text-sm font-bold">{value}</span>

      <button
        className="grid h-11 w-11 place-items-center text-[#E85E69] transition hover:bg-[#FFF1F1]"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  storeOpen,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  storeOpen: boolean;
}) {
  const basePrice = getProductBasePrice(product);

  const isPromotion =
    product.promo_active &&
    product.promo_price !== null &&
    Number(product.promo_price) > 0;

  return (
    <article className="group overflow-hidden rounded-[24px] border border-[#EFE5DC] bg-white shadow-[0_7px_24px_rgba(112,78,59,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(112,78,59,0.12)]">
      <div className="relative aspect-[1.12] overflow-hidden bg-[#f3ece6]">
        <img
          src={product.image}
          alt={product.name}
          className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.06] ${
            product.soldOut ? "grayscale-[.35] opacity-70" : ""
          }`}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />

        {isPromotion && !product.soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-[#E85E69] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-white shadow-sm">
            🔥 Promoção
          </span>
        )}

        {product.tag && !product.soldOut && !isPromotion && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#E85E69] shadow-sm backdrop-blur-sm">
            {product.tag}
          </span>
        )}

        {product.soldOut && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#403733]/90 px-4 py-2 text-xs font-extrabold tracking-[.12em] text-white">
            ESGOTADO
          </span>
        )}
      </div>

      <div className="flex min-h-[202px] flex-col p-4 sm:p-5">
        <h3 className="font-display text-[21px] font-semibold leading-tight text-[#3F3530] sm:text-2xl">
          {product.name}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#7D6D64] sm:text-sm">
          {product.description}
        </p>

        <div className="mt-auto pt-4">
          <span className="block text-[10px] font-bold uppercase tracking-[.08em] text-[#9B8A80]">
            a partir de
          </span>

          <div className="mt-1 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isPromotion && (
                <p className="text-sm text-gray-400 line-through">
                  {money(product.price)}
                </p>
              )}

              <strong
                className={`block text-lg sm:text-xl ${
                  isPromotion ? "text-[#E85E69]" : "text-[#079FA6]"
                }`}
              >
                {money(basePrice)}
              </strong>
            </div>

            <button
              disabled={product.soldOut || !storeOpen}
              onClick={() => onAdd(product)}
              className="rounded-full bg-[#E85E69] px-3 py-2.5 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#d94f5b] disabled:cursor-not-allowed disabled:bg-[#D8CEC7] sm:px-5 sm:text-sm"
            >
              {product.soldOut ? "Indisponível" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (item: Omit<CartItem, "key">) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  const availableFlavor = product.flavors?.find(
    (flavor) => !flavor.soldOut
  );

  const [flavor, setFlavor] = useState<Option | undefined>(
    availableFlavor
  );

  const [addOns, setAddOns] = useState<AddOn[]>([]);

  const basePrice = getProductBasePrice(product);

  const isPromotion =
    product.promo_active &&
    product.promo_price !== null &&
    Number(product.promo_price) > 0;

  const unitPrice =
    basePrice +
    (flavor?.price || 0) +
    addOns.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();

    document.addEventListener("keydown", close);

    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  const toggleAddOn = (addOn: AddOn) =>
    setAddOns((items) =>
      items.some((item) => item.name === addOn.name)
        ? items.filter((item) => item.name !== addOn.name)
        : [...items, addOn]
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#332824]/50 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] bg-[#FFF9F2] shadow-2xl sm:max-w-lg sm:rounded-[30px]">
        <div className="relative h-48 overflow-hidden sm:h-56">
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {isPromotion && (
            <span className="absolute bottom-4 left-4 rounded-full bg-[#E85E69] px-3 py-2 text-xs font-extrabold text-white shadow-sm">
              🔥 Promoção
            </span>
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#4B403A] shadow-md transition hover:scale-105"
            aria-label="Fechar"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#E85E69]">
            Monte do seu jeito
          </p>

          <h2 className="mt-1 font-display text-3xl font-semibold text-[#3F3530]">
            {product.name}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#776860]">
            {product.description}
          </p>

          <div className="mt-4">
            {isPromotion && (
              <p className="text-sm text-gray-400 line-through">
                De {money(product.price)}
              </p>
            )}

            <p
              className={`text-2xl font-extrabold ${
                isPromotion ? "text-[#E85E69]" : "text-[#079FA6]"
              }`}
            >
              {money(basePrice)}
            </p>
          </div>

          {product.flavors && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-extrabold text-[#4B403A]">
                Escolha o sabor
              </h3>

              <div className="space-y-2">
                {product.flavors.map((item) => (
                  <label
                    key={item.name}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                      item.soldOut
                        ? "cursor-not-allowed bg-[#F3ECE6] opacity-55"
                        : flavor?.name === item.name
                        ? "border-[#E85E69] bg-[#FFF1F1]"
                        : "border-[#E7DBD1] bg-white hover:border-[#E9A5AA]"
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <input
                        type="radio"
                        name="flavor"
                        checked={flavor?.name === item.name}
                        disabled={item.soldOut}
                        onChange={() => setFlavor(item)}
                        className="accent-[#E85E69]"
                      />

                      {item.name}
                    </span>

                    <span className="text-xs font-bold text-[#8B7A71]">
                      {item.soldOut
                        ? "ESGOTADO"
                        : item.price
                        ? `+ ${money(item.price)}`
                        : ""}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {product.addOns && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-extrabold text-[#4B403A]">
                Que tal um adicional?
              </h3>

              <div className="space-y-2">
                {product.addOns.map((item) => (
                  <label
                    key={item.name}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${
                      addOns.some((chosen) => chosen.name === item.name)
                        ? "border-[#079FA6] bg-[#EDFAF9]"
                        : "border-[#E7DBD1] bg-white hover:border-[#8DD5D3]"
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={addOns.some(
                          (chosen) => chosen.name === item.name
                        )}
                        onChange={() => toggleAddOn(item)}
                        className="accent-[#079FA6]"
                      />

                      {item.name}
                    </span>

                    <span className="text-xs font-bold text-[#079FA6]">
                      + {money(item.price)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <div className="mt-7 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#94837A]">
                Quantidade
              </span>

              <div className="mt-1">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#94837A]">
                Total
              </span>

              <strong
                className={`text-2xl ${
                  isPromotion ? "text-[#E85E69]" : "text-[#079FA6]"
                }`}
              >
                {money(unitPrice * quantity)}
              </strong>
            </div>
          </div>

          <button
            onClick={() =>
              onConfirm({
                product,
                quantity,
                flavor,
                addOns,
              })
            }
            className="mt-6 w-full rounded-full bg-[#E85E69] py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(232,94,105,.25)] transition hover:-translate-y-0.5 hover:bg-[#d94f5b]"
          >
            Adicionar ao pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function Cart({
  items,
  onClose,
  onQuantity,
  onRemove,
  storeOpen,
}: {
  items: CartItem[];
  onClose: () => void;
  onQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  storeOpen: boolean;
}) {
  const [method, setMethod] = useState<"delivery" | "pickup">(
    "delivery"
  );

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("pix");

  const [fields, setFields] = useState({
    name: "",
    address: "",
    number: "",
    complement: "",
    district: "",
    reference: "",
  });

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (getProductBasePrice(item.product) +
        (item.flavor?.price || 0) +
        item.addOns.reduce((s, addOn) => s + addOn.price, 0)) *
        item.quantity,
    0
  );

  const deliveryFee =
    method === "delivery" ? getDeliveryFee(fields.district) : 0;

  const total = subtotal + deliveryFee;

  const updateField = (name: string, value: string) =>
    setFields((current) => ({
      ...current,
      [name]: value,
    }));

  const finishOrder = async () => {
    if (!items.length) return;

    if (!fields.name.trim()) {
      document.getElementById("customer-name")?.focus();
      return;
    }

    if (
      method === "delivery" &&
      (!fields.address.trim() ||
        !fields.number.trim() ||
        !fields.district.trim())
    ) {
      document.getElementById("customer-address")?.focus();
      return;
    }

    if (method === "delivery" && deliveryFee <= 0) {
      alert("Selecione uma localidade de entrega válida.");
      return;
    }

    if (!paymentMethod) {
      alert("Escolha uma forma de pagamento.");
      return;
    }

    const { data: currentStoreStatus, error: storeStatusError } =
      await supabase
        .from("store_settings")
        .select("is_open")
        .eq("id", 1)
        .single();

    if (storeStatusError || !currentStoreStatus?.is_open) {
      alert("A loja está fechada no momento. Tente novamente mais tarde.");
      return;
    }

    const selectedDeliveryArea =
      method === "delivery"
        ? deliveryAreas.find(
            (item) =>
              item.name.toLocaleLowerCase("pt-BR") ===
              fields.district.trim().toLocaleLowerCase("pt-BR")
          )
        : null;

    const addressText =
      method === "delivery"
        ? `${fields.address}, ${fields.number}${
            fields.complement ? ` — ${fields.complement}` : ""
          }, ${fields.district}${
            fields.reference ? ` — Referência: ${fields.reference}` : ""
          }`
        : "Retirada";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: fields.name.trim(),
        customer_phone: "",
        order_type: method,
        status: "new",
        total,
        payment_method: paymentMethodLabels[paymentMethod],
        address: addressText,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("ERRO AO CRIAR PEDIDO:", orderError);
      alert("Não foi possível registrar o pedido. Tente novamente.");
      return;
    }

    const orderItems = items.map((item) => {
      const unitPrice =
        getProductBasePrice(item.product) +
        (item.flavor?.price || 0) +
        item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);

      const options = [
        item.flavor?.name ? `Sabor: ${item.flavor.name}` : "",
        item.addOns.length
          ? `Adicionais: ${item.addOns.map((a) => a.name).join(", ")}`
          : "",
        item.product.promo_active &&
        item.product.promo_price !== null
          ? `Promoção: de ${money(item.product.price)} por ${money(
              item.product.promo_price
            )}`
          : "",
      ]
        .filter(Boolean)
        .join(" — ");

      return {
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        options,
        subtotal: unitPrice * item.quantity,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("ERRO AO SALVAR ITENS DO PEDIDO:", itemsError);
      alert(
        "O pedido foi criado, mas não conseguimos salvar os itens. Tente novamente."
      );
      return;
    }

    const lines = items.map((item) => {
      const details = [
        item.flavor?.name && `Sabor ${item.flavor.name}`,
        item.addOns.length &&
          `Adicionais: ${item.addOns.map((a) => a.name).join(", ")}`,
        item.product.promo_active &&
        item.product.promo_price !== null
          ? `🔥 Promoção — de ${money(item.product.price)} por ${money(
              item.product.promo_price
            )}`
          : "",
      ]
        .filter(Boolean)
        .join(" — ");

      const unit =
        getProductBasePrice(item.product) +
        (item.flavor?.price || 0) +
        item.addOns.reduce((s, addOn) => s + addOn.price, 0);

      return `${item.quantity}x ${item.product.name}${
        details ? ` — ${details}` : ""
      } — ${money(unit * item.quantity)}`;
    });

    const address =
      method === "delivery"
        ? `\nEndereço: ${fields.address}, ${fields.number}${
            fields.complement ? ` — ${fields.complement}` : ""
          }\nBairro: ${fields.district}${
            fields.reference ? `\nReferência: ${fields.reference}` : ""
          }`
        : "";

    const deliveryLine =
      method === "delivery"
        ? `\nEntrega: ${money(deliveryFee)}`
        : `\nEntrega: ${money(0)}`;

    const message = `Olá! Gostaria de fazer um pedido na Maré de Doçuras.

PEDIDO #${order.id}

MEU PEDIDO:
${lines.join("\n")}

Subtotal: ${money(subtotal)}
Forma de recebimento: ${
      method === "delivery" ? "Entrega" : "Retirada"
    }${deliveryLine}
Total: ${money(total)}
Forma de pagamento: ${paymentMethodLabels[paymentMethod]}
Nome: ${fields.name}${address}

Aguardo a confirmação da disponibilidade${
      method === "delivery"
        ? ` e da entrega para ${selectedDeliveryArea?.name}`
        : ""
    }.`;

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#332824]/45 backdrop-blur-[2px]"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <aside className="flex h-full w-full max-w-[470px] flex-col bg-[#FFF9F2] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E9DDD1] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#E85E69]">
              Maré de Doçuras
            </p>

            <h2 className="font-display text-3xl font-semibold text-[#3F3530]">
              Meu pedido
            </h2>
          </div>

          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E5D8CB] bg-white transition hover:bg-[#FFF1F1]"
            aria-label="Fechar pedido"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {!items.length ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FBE4E4] text-[#E85E69]">
                  <Icon name="bag" size={28} />
                </div>

                <h3 className="mt-4 font-display text-2xl font-semibold">
                  Sua sacola está vazia
                </h3>

                <p className="mt-1 text-sm text-[#817168]">
                  Escolha uma doçura para começar.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => {
                  const unit =
                    getProductBasePrice(item.product) +
                    (item.flavor?.price || 0) +
                    item.addOns.reduce(
                      (sum, addOn) => sum + addOn.price,
                      0
                    );

                  const isPromotion =
                    item.product.promo_active &&
                    item.product.promo_price !== null;

                  return (
                    <div
                      key={item.key}
                      className="flex gap-3 rounded-[20px] border border-[#EAE0D7] bg-white p-3 shadow-sm"
                    >
                      <img
                        src={item.product.image}
                        alt=""
                        className="h-24 w-20 rounded-[14px] object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-[#443A35]">
                            {item.product.name}
                          </h3>

                          <button
                            onClick={() => onRemove(item.key)}
                            className="text-[#AB9990] transition hover:text-[#E85E69]"
                            aria-label="Remover item"
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>

                        {isPromotion && (
                          <p className="mt-0.5 text-xs font-bold text-[#E85E69]">
                            🔥 Preço promocional
                          </p>
                        )}

                        {item.flavor && (
                          <p className="mt-0.5 text-xs text-[#817168]">
                            Sabor: {item.flavor.name}
                          </p>
                        )}

                        {!!item.addOns.length && (
                          <p className="truncate text-xs text-[#817168]">
                            +{" "}
                            {item.addOns
                              .map((item) => item.name)
                              .join(", ")}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-[#E6DAD0]">
                            <button
                              onClick={() =>
                                item.quantity === 1
                                  ? onRemove(item.key)
                                  : onQuantity(
                                      item.key,
                                      item.quantity - 1
                                    )
                              }
                              className="grid h-7 w-7 place-items-center text-[#E85E69]"
                            >
                              <Icon name="minus" size={13} />
                            </button>

                            <span className="w-5 text-center text-xs font-bold">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                onQuantity(
                                  item.key,
                                  item.quantity + 1
                                )
                              }
                              className="grid h-7 w-7 place-items-center text-[#E85E69]"
                            >
                              <Icon name="plus" size={13} />
                            </button>
                          </div>

                          <strong
                            className={`text-sm ${
                              isPromotion
                                ? "text-[#E85E69]"
                                : "text-[#079FA6]"
                            }`}
                          >
                            {money(unit * item.quantity)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <section className="mt-7">
                <h3 className="font-display text-2xl font-semibold text-[#3F3530]">
                  Como você deseja receber?
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("delivery")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      method === "delivery"
                        ? "border-[#E85E69] bg-[#FFF0F0] shadow-sm"
                        : "border-[#E6DAD0] bg-white hover:border-[#E9A5AA]"
                    }`}
                  >
                    <span className="block text-sm font-extrabold">
                      🚚 Entrega
                    </span>

                    <span className="mt-1 block text-xs text-[#817168]">
                      Escolha seu bairro
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("pickup")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      method === "pickup"
                        ? "border-[#E85E69] bg-[#FFF0F0] shadow-sm"
                        : "border-[#E6DAD0] bg-white hover:border-[#E9A5AA]"
                    }`}
                  >
                    <span className="block text-sm font-extrabold">
                      🏪 Retirada
                    </span>

                    <span className="mt-1 block text-xs text-[#817168]">
                      Sem taxa
                    </span>
                  </button>
                </div>
              </section>

              <section className="mt-7">
                <h3 className="font-display text-2xl font-semibold text-[#3F3530]">
                  Forma de pagamento
                </h3>

                <p className="mt-1 text-xs text-[#817168]">
                  Escolha como deseja pagar seu pedido.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      ["pix", "🟢 Pix", "Pagamento via Pix"],
                      [
                        "credit_card",
                        "💳 Crédito",
                        "Cartão de crédito",
                      ],
                      [
                        "debit_card",
                        "💳 Débito",
                        "Cartão de débito",
                      ],
                      ["cash", "💵 Dinheiro", "Pagamento em dinheiro"],
                    ] as const
                  ).map(([value, title, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        paymentMethod === value
                          ? "border-[#079FA6] bg-[#EDFAF9] shadow-sm"
                          : "border-[#E6DAD0] bg-white hover:border-[#8DD5D3]"
                      }`}
                    >
                      <span className="block text-sm font-extrabold">
                        {title}
                      </span>

                      <span className="mt-1 block text-xs text-[#817168]">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-7">
                <h3 className="font-display text-2xl font-semibold text-[#3F3530]">
                  {method === "delivery"
                    ? "Dados da entrega"
                    : "Dados para retirada"}
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    id="customer-name"
                    className="input col-span-2"
                    placeholder="Nome *"
                    value={fields.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                  />

                  {method === "delivery" && (
                    <>
                      <input
                        id="customer-address"
                        className="input col-span-2"
                        placeholder="Endereço *"
                        value={fields.address}
                        onChange={(e) =>
                          updateField("address", e.target.value)
                        }
                      />

                      <input
                        className="input"
                        placeholder="Número *"
                        value={fields.number}
                        onChange={(e) =>
                          updateField("number", e.target.value)
                        }
                      />

                      <input
                        className="input"
                        placeholder="Complemento"
                        value={fields.complement}
                        onChange={(e) =>
                          updateField("complement", e.target.value)
                        }
                      />

                      <select
                        className="input col-span-2"
                        value={fields.district}
                        onChange={(e) =>
                          updateField("district", e.target.value)
                        }
                      >
                        <option value="">
                          Selecione seu bairro *
                        </option>

                        {deliveryAreas.map((area) => (
                          <option
                            key={area.name}
                            value={area.name}
                          >
                            {area.name} — {money(area.fee)}
                          </option>
                        ))}
                      </select>

                      <input
                        className="input col-span-2"
                        placeholder="Ponto de referência"
                        value={fields.reference}
                        onChange={(e) =>
                          updateField("reference", e.target.value)
                        }
                      />
                    </>
                  )}
                </div>

                {method === "delivery" && fields.district && (
                  <div className="mt-3 rounded-2xl border border-[#BFE3E1] bg-[#EDFAF9] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#3F3530]">
                        🚚 Entrega para {fields.district}
                      </span>

                      <strong className="text-sm text-[#079FA6]">
                        {money(deliveryFee)}
                      </strong>
                    </div>
                  </div>
                )}
              </section>

              {!storeOpen && (
                <section className="mt-7 rounded-[20px] border border-red-100 bg-red-50 p-5">
                  <h3 className="text-sm font-extrabold text-red-700">
                    🔴 Loja fechada no momento
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-red-600">
                    Os produtos continuam disponíveis para consulta, mas não
                    estamos recebendo novos pedidos agora.
                  </p>
                </section>
              )}

              <section className="mt-7 rounded-[20px] bg-[#EAF8F7] p-5">
                <h3 className="text-xs font-extrabold uppercase tracking-[.12em] text-[#078E95]">
                  Resumo do pedido
                </h3>

                <div className="mt-3 flex justify-between text-sm">
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span>Entrega</span>

                  <strong>
                    {method === "delivery"
                      ? fields.district
                        ? money(deliveryFee)
                        : "Selecione o bairro"
                      : money(0)}
                  </strong>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span>Total</span>

                  <strong className="text-base text-[#079FA6]">
                    {money(total)}
                  </strong>
                </div>

                <div className="mt-2 flex justify-between gap-4 text-sm">
                  <span>Pagamento</span>

                  <strong className="text-right">
                    {paymentMethodLabels[paymentMethod]}
                  </strong>
                </div>

                <p className="mt-4 border-t border-[#BFE3E1] pt-4 text-xs leading-relaxed text-[#56706E]">
                  Seu pedido será confirmado pelo WhatsApp após verificarmos
                  a disponibilidade
                  {method === "delivery"
                    ? " e os dados da entrega"
                    : ""}.
                </p>
              </section>
            </>
          )}
        </div>

        {!!items.length && (
          <div className="border-t border-[#E9DDD1] bg-white p-5 sm:px-7">
            <button
              onClick={finishOrder}
              disabled={
                !storeOpen ||
                (method === "delivery" &&
                  (!fields.district || deliveryFee <= 0))
              }
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1EAD72] py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(30,173,114,.2)] transition hover:-translate-y-0.5 hover:bg-[#189762] disabled:cursor-not-allowed disabled:bg-[#D8CEC7] disabled:shadow-none"
            >
              <Icon name="whatsapp" />

              {storeOpen
                ? method === "delivery" && !fields.district
                  ? "Selecione o bairro"
                  : "Finalizar pelo WhatsApp"
                : "Loja fechada"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  const [category, setCategory] = useState("Todos");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [cartOpen, setCartOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [products, setProducts] =
    useState<Product[]>(fallbackProducts);

  const [storeOpen, setStoreOpen] = useState(true);

  const [loadingStoreStatus, setLoadingStoreStatus] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStoreStatus = async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("is_open")
        .eq("id", 1)
        .single();

      if (error) {
        console.warn(
          "Não foi possível carregar o status da loja. Mantendo loja aberta.",
          error
        );

        if (!cancelled) setStoreOpen(true);
      } else if (!cancelled) {
        setStoreOpen(Boolean(data?.is_open));
      }

      if (!cancelled) setLoadingStoreStatus(false);
    };

    loadStoreStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      const { data: productRows, error: productsError } =
        await supabase
          .from("products")
          .select(
            "id,name,description,price,promo_active,promo_price,image_url,category,tag,sold_out,featured,sort_order"
          )
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });

      if (productsError || !productRows?.length) {
        if (productsError) {
          console.warn(
            "Não foi possível carregar produtos do Supabase. Usando os produtos locais.",
            productsError
          );
        }

        return;
      }

      const productIds = productRows.map((row) => row.id);

      const { data: optionRows, error: optionsError } =
        await supabase
          .from("product_options")
          .select(
            "id,product_id,name,type,price_delta,available"
          )
          .in("product_id", productIds)
          .order("id", { ascending: true });

      if (optionsError) {
        console.warn(
          "Não foi possível carregar as opções dos produtos.",
          optionsError
        );
      }

      const mappedProducts: Product[] = productRows.map((row) => {
        const localFallback = fallbackProducts.find(
          (item) => item.id === row.id
        );

        const options = (optionRows || []).filter(
          (option) => option.product_id === row.id
        );

        const flavors: Option[] = options
          .filter((option) => option.type === "flavor")
          .map((option) => ({
            name: option.name,
            price: Number(option.price_delta || 0),
            soldOut: !option.available,
          }));

        const addOns: AddOn[] = options
          .filter(
            (option) =>
              option.type === "addon" && option.available
          )
          .map((option) => ({
            name: option.name,
            price: Number(option.price_delta || 0),
          }));

        return {
          id: row.id,
          name: row.name,
          description: row.description || "",
          price: Number(row.price || 0),
          promo_active: Boolean(row.promo_active),
          promo_price:
            row.promo_price !== null &&
            row.promo_price !== undefined
              ? Number(row.promo_price)
              : null,
          image:
            row.image_url ||
            localFallback?.image ||
            "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=90",
          category: row.category || "Doces",
          tag:
            row.tag ||
            (row.featured ? "Mais pedido" : undefined),
          soldOut: Boolean(row.sold_out),
          flavors: flavors.length
            ? flavors
            : localFallback?.flavors,
          addOns: addOns.length
            ? addOns
            : localFallback?.addOns,
        };
      });

      if (!cancelled) {
        setProducts(mappedProducts);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter(
            (category): category is string => Boolean(category)
          )
      )
    );

    return [
      "Todos",
      "Mais pedidos",
      ...uniqueCategories.filter(
        (category) =>
          category !== "Todos" &&
          category !== "Mais pedidos"
      ),
    ];
  }, [products]);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory("Todos");
    }
  }, [categories, category]);

  const visibleProducts = useMemo(
    () =>
      category === "Todos"
        ? products
        : category === "Mais pedidos"
        ? products.filter(
            (product) =>
              product.tag === "Mais pedido" ||
              product.tag === "Queridinho"
          )
        : products.filter(
            (product) => product.category === category
          ),
    [category, products]
  );

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) =>
      sum +
      (getProductBasePrice(item.product) +
        (item.flavor?.price || 0) +
        item.addOns.reduce(
          (s, addOn) => s + addOn.price,
          0
        )) *
        item.quantity,
    0
  );

  useEffect(() => {
    document.body.style.overflow =
      selectedProduct || cartOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct, cartOpen]);

  const addToCart = (item: Omit<CartItem, "key">) => {
    if (!storeOpen) {
      alert("A loja está fechada no momento.");
      return;
    }

    const key = `${item.product.id}-${
      item.flavor?.name || "base"
    }-${item.addOns
      .map((addOn) => addOn.name)
      .sort()
      .join("-")}`;

    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.key === key
      );

      return existing
        ? current.map((cartItem) =>
            cartItem.key === key
              ? {
                  ...cartItem,
                  quantity:
                    cartItem.quantity + item.quantity,
                }
              : cartItem
          )
        : [
            ...current,
            {
              ...item,
              key,
            },
          ];
    });

    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#493E38]">
      <Header
        onCart={() => setCartOpen(true)}
        storeOpen={storeOpen}
      />

      <main>
        {!loadingStoreStatus && !storeOpen && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            🔴 A loja está fechada no momento. Você pode consultar o
            cardápio, mas novos pedidos estão temporariamente
            indisponíveis.
          </div>
        )}

        {/* =========================================================
            TOPO 3 — HERO EDITORIAL COM COLAGEM DE FOTOS
           ========================================================= */}
        <section className="relative overflow-hidden border-b border-[#E9DDD1] bg-[#FFF9F2]">
          <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#FFD9D8]/55 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#CBEFEC]/55 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-14">
            {/* TEXTO */}
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F3C8C9] bg-[#FFF0F0] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#D95360] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E85E69]" />
                Feito com amor, coragem e dedicação
              </span>

              <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.92] tracking-[-0.035em] text-[#3F3530] sm:text-6xl lg:text-[76px]">
                Nosso
                <span className="block text-[#E85E69]">
                  Cardápio
                </span>
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-[#75655D] sm:text-lg">
                Escolha seus doces favoritos e transforme um momento
                comum em uma lembrança especial.
                <span className="ml-1 text-[#E85E69]">♥</span>
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#produtos"
                  className="rounded-full bg-[#E85E69] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(232,94,105,.22)] transition hover:-translate-y-0.5 hover:bg-[#d94f5b]"
                >
                  Ver nossas doçuras
                </a>

                <span className="rounded-full border border-[#E4D7CC] bg-white/80 px-4 py-3 text-xs font-bold text-[#786860]">
                  Preparado com carinho
                </span>
              </div>

              <div className="mt-7 flex items-center gap-3">
                <div className="h-px w-10 bg-[#E85E69]" />

                <span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#9A8880]">
                  Maré de Doçuras
                </span>
              </div>
            </div>

            {/* COLAGEM 2x2 */}
            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
                {/* FOTO FLAMENGO */}
                <div className="group relative aspect-square overflow-hidden rounded-[28px] border-[5px] border-white bg-[#eee5de] shadow-[0_18px_45px_rgba(82,58,46,.16)] transition duration-500 hover:-translate-y-1">
                  <img
                    src={boloFlamengo}
                    alt="Bolo decorado do Flamengo"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />

                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4B403A] shadow-sm">
                    Feito para celebrar
                  </span>
                </div>

                {/* FOTO ANIVERSÁRIO */}
                <div className="group relative aspect-square overflow-hidden rounded-[28px] border-[5px] border-white bg-[#eee5de] shadow-[0_18px_45px_rgba(82,58,46,.16)] transition duration-500 hover:-translate-y-1">
                  <img
                    src={boloAniversario}
                    alt="Bolo de aniversário"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5" />

                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4B403A] shadow-sm">
                    Momentos especiais
                  </span>
                </div>

                {/* FOTO AZUL */}
                <div className="group relative aspect-square overflow-hidden rounded-[28px] border-[5px] border-white bg-[#eee5de] shadow-[0_18px_45px_rgba(82,58,46,.16)] transition duration-500 hover:-translate-y-1">
                  <img
                    src={boloAzul}
                    alt="Bolo azul decorado"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5" />

                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4B403A] shadow-sm">
                    Cada detalhe importa
                  </span>
                </div>

                {/* BLOCO EDITORIAL */}
                <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[28px] bg-[#079FA6] p-5 text-white shadow-[0_18px_45px_rgba(3,90,94,.2)] sm:p-7">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/10" />

                  <div className="relative">
                    <span className="text-[9px] font-extrabold uppercase tracking-[.18em] text-white/70">
                      Nossa história
                    </span>

                    <div className="mt-4 h-1 w-10 rounded-full bg-white/70" />
                  </div>

                  <div className="relative">
                    <h2 className="font-display text-2xl font-semibold leading-[1.05] sm:text-3xl">
                      Da nossa realidade para a sua mesa.
                    </h2>

                    <p className="mt-3 text-xs leading-relaxed text-white/80 sm:text-sm">
                      Cada doce é preparado com carinho, dedicação e
                      muita vontade de transformar sonhos em momentos
                      especiais.
                    </p>
                  </div>

                  <span className="relative text-2xl text-white/80">
                    ♥
                  </span>
                </div>
              </div>

              {/* DETALHE DECORATIVO */}
              <div className="pointer-events-none absolute -bottom-3 -right-3 hidden h-16 w-16 rounded-full border border-[#E85E69]/30 sm:block" />

              <div className="pointer-events-none absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-[#E85E69] shadow-lg sm:block" />
            </div>
          </div>
        </section>

        <section
          id="produtos"
          className="mx-auto max-w-7xl px-4 py-6 pb-32 sm:px-6 sm:py-9"
        >
          <div className="-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-4 py-2.5 text-xs font-extrabold transition sm:px-5 sm:text-sm ${
                    category === item
                      ? "bg-[#E85E69] text-white shadow-[0_6px_15px_rgba(232,94,105,.2)]"
                      : "border border-[#E6D9CD] bg-white text-[#75655D] hover:border-[#E9A5AA] hover:text-[#E85E69]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 mt-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[.11em] text-[#9B8980]">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1
                ? "doçura"
                : "doçuras"}
            </p>

            <span className="ml-4 h-px flex-1 bg-[#EADFD5]" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={setSelectedProduct}
                storeOpen={storeOpen}
              />
            ))}
          </div>
        </section>
      </main>

      {itemCount > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-24px)] max-w-xl -translate-x-1/2">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-[20px] bg-[#079FA6] p-3 text-left text-white shadow-[0_12px_35px_rgba(3,90,94,.35)] transition hover:-translate-y-0.5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
              <Icon name="bag" />
            </span>

            <span className="min-w-0 flex-1">
              <strong className="block text-sm">
                Meu pedido
              </strong>

              <span className="text-xs text-white/75">
                {itemCount}{" "}
                {itemCount === 1 ? "item" : "itens"} ·{" "}
                {money(total)}
              </span>
            </span>

            <span className="flex items-center gap-1 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-[#078E95]">
              Ver pedido
              <Icon name="chevron" size={14} />
            </span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={addToCart}
        />
      )}

      {cartOpen && (
        <Cart
          items={cart}
          storeOpen={storeOpen}
          onClose={() => setCartOpen(false)}
          onQuantity={(key, quantity) =>
            setCart((current) =>
              current.map((item) =>
                item.key === key
                  ? {
                      ...item,
                      quantity,
                    }
                  : item
              )
            )
          }
          onRemove={(key) =>
            setCart((current) =>
              current.filter((item) => item.key !== key)
            )
          }
        />
      )}
    </div>
  );
}