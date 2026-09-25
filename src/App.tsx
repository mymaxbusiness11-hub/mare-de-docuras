```tsx
import { useEffect, useMemo, useState } from "react";
import Admin from "./Admin";
import logoUrl from "./imports/ChatGPT_Image_24_de_set._de_2026__16_49_11.png";
import { supabase } from "./lib/supabase";

const WHATSAPP_NUMBER = "5521972347730";

type Option = { name: string; price?: number; soldOut?: boolean };
type AddOn = { name: string; price: number };
type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
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
    image:
      "https://images.unsplash.com/photo-1611293388250-580b08c4a145?auto=format&fit=crop&w=800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1602663491496-73f07481dbea?auto=format&fit=crop&w=800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1765946025540-838e07fdd83a?auto=format&fit=crop&w=800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1692106898229-4fd64261f052?auto=format&fit=crop&w=800&q=85",
    category: "Doces",
    soldOut: true,
  },
  {
    id: 6,
    name: "Combo Doce Pausa",
    description: "2 brownies e 2 doces selecionados pela nossa cozinha.",
    price: 39.9,
    image:
      "https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&w=800&q=85",
    category: "Combos",
  },
];

const categories = ["Todos", "Mais pedidos", "Bolos", "Doces", "Brownies", "Kits", "Combos"];

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function Icon({
  name,
  size = 20,
}: {
  name: "bag" | "whatsapp" | "minus" | "plus" | "trash" | "close" | "chevron";
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

function Header({ onCart }: { onCart: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E9DDD1]/80 bg-[#FFF9F2]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img
            src={logoUrl}
            alt="Maré de Doçuras"
            className="h-14 w-14 rounded-2xl object-cover shadow-sm"
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
          <a
            href="#produtos"
            className="hidden text-sm font-semibold text-[#675952] sm:block"
          >
            Cardápio
          </a>

          <button
            onClick={onCart}
            className="rounded-full bg-[#079FA6] p-3 text-white shadow-sm transition hover:bg-[#078c92]"
            aria-label="Abrir meu pedido"
          >
            <Icon name="bag" size={19} />
          </button>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#1EAD72] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#189762]"
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
    <div className="flex h-11 items-center rounded-full border border-[#E5D8CB] bg-white">
      <button
        className="grid h-11 w-11 place-items-center text-[#E85E69] disabled:opacity-35"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
      >
        <Icon name="minus" size={17} />
      </button>

      <span className="w-8 text-center text-sm font-bold">{value}</span>

      <button
        className="grid h-11 w-11 place-items-center text-[#E85E69]"
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
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-[22px] border border-[#EFE5DC] bg-white shadow-[0_7px_24px_rgba(112,78,59,0.07)]">
      <div className="relative aspect-[1.12] overflow-hidden bg-[#f3ece6]">
        <img
          src={product.image}
          alt={product.name}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
            product.soldOut ? "grayscale-[.35] opacity-70" : ""
          }`}
        />

        {product.tag && !product.soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#E85E69] shadow-sm">
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
            <strong className="text-lg text-[#079FA6] sm:text-xl">
              {money(product.price)}
            </strong>

            <button
              disabled={product.soldOut}
              onClick={() => onAdd(product)}
              className="rounded-full bg-[#E85E69] px-3 py-2.5 text-[11px] font-extrabold text-white transition hover:bg-[#d94f5b] disabled:cursor-not-allowed disabled:bg-[#D8CEC7] sm:px-5 sm:text-sm"
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
  const availableFlavor = product.flavors?.find((flavor) => !flavor.soldOut);
  const [flavor, setFlavor] = useState<Option | undefined>(availableFlavor);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  const unitPrice =
    product.price +
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#332824]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#FFF9F2] shadow-2xl sm:max-w-lg sm:rounded-[28px]">
        <div className="relative h-44 sm:h-52">
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover"
          />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#4B403A] shadow-md"
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

          {product.flavors && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-extrabold text-[#4B403A]">
                Escolha o sabor
              </h3>

              <div className="space-y-2">
                {product.flavors.map((item) => (
                  <label
                    key={item.name}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 ${
                      item.soldOut
                        ? "cursor-not-allowed bg-[#F3ECE6] opacity-55"
                        : flavor?.name === item.name
                        ? "border-[#E85E69] bg-[#FFF1F1]"
                        : "border-[#E7DBD1] bg-white"
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
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 ${
                      addOns.some((chosen) => chosen.name === item.name)
                        ? "border-[#079FA6] bg-[#EDFAF9]"
                        : "border-[#E7DBD1] bg-white"
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

              <strong className="text-2xl text-[#079FA6]">
                {money(unitPrice * quantity)}
              </strong>
            </div>
          </div>

          <button
            onClick={() => onConfirm({ product, quantity, flavor, addOns })}
            className="mt-6 w-full rounded-full bg-[#E85E69] py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(232,94,105,.25)] transition hover:bg-[#d94f5b]"
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
}: {
  items: CartItem[];
  onClose: () => void;
  onQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
}) {
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");

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
      (item.product.price +
        (item.flavor?.price || 0) +
        item.addOns.reduce((s, addOn) => s + addOn.price, 0)) *
        item.quantity,
    0
  );

  const updateField = (name: string, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

  const finishOrder = () => {
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

    const lines = items.map((item) => {
      const details = [
        item.flavor?.name && `Sabor ${item.flavor.name}`,
        item.addOns.length &&
          `Adicionais: ${item.addOns.map((a) => a.name).join(", ")}`,
      ]
        .filter(Boolean)
        .join(" — ");

      const unit =
        item.product.price +
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

    const message = `Olá! Gostaria de fazer um pedido na Maré de Doçuras.\n\nMEU PEDIDO:\n${lines.join(
      "\n"
    )}\n\nSubtotal: ${money(
      subtotal
    )}\nForma de recebimento: ${
      method === "delivery" ? "Entrega" : "Retirada"
    }\nNome: ${fields.name}${address}\n\nAguardo a confirmação da disponibilidade${
      method === "delivery" ? " e do valor da entrega" : ""
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
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E5D8CB] bg-white"
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
                    item.product.price +
                    (item.flavor?.price || 0) +
                    item.addOns.reduce(
                      (sum, addOn) => sum + addOn.price,
                      0
                    );

                  return (
                    <div
                      key={item.key}
                      className="flex gap-3 rounded-[20px] border border-[#EAE0D7] bg-white p-3"
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
                            className="text-[#AB9990] hover:text-[#E85E69]"
                            aria-label="Remover item"
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>

                        {item.flavor && (
                          <p className="mt-0.5 text-xs text-[#817168]">
                            Sabor: {item.flavor.name}
                          </p>
                        )}

                        {!!item.addOns.length && (
                          <p className="truncate text-xs text-[#817168]">
                            + {item.addOns.map((item) => item.name).join(", ")}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-[#E6DAD0]">
                            <button
                              onClick={() =>
                                item.quantity === 1
                                  ? onRemove(item.key)
                                  : onQuantity(item.key, item.quantity - 1)
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
                                onQuantity(item.key, item.quantity + 1)
                              }
                              className="grid h-7 w-7 place-items-center text-[#E85E69]"
                            >
                              <Icon name="plus" size={13} />
                            </button>
                          </div>

                          <strong className="text-sm text-[#079FA6]">
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
                    onClick={() => setMethod("delivery")}
                    className={`rounded-2xl border p-4 text-left ${
                      method === "delivery"
                        ? "border-[#E85E69] bg-[#FFF0F0]"
                        : "border-[#E6DAD0] bg-white"
                    }`}
                  >
                    <span className="block text-sm font-extrabold">
                      Entrega
                    </span>

                    <span className="mt-1 block text-xs text-[#817168]">
                      Taxa a confirmar
                    </span>
                  </button>

                  <button
                    onClick={() => setMethod("pickup")}
                    className={`rounded-2xl border p-4 text-left ${
                      method === "pickup"
                        ? "border-[#E85E69] bg-[#FFF0F0]"
                        : "border-[#E6DAD0] bg-white"
                    }`}
                  >
                    <span className="block text-sm font-extrabold">
                      Retirada
                    </span>

                    <span className="mt-1 block text-xs text-[#817168]">
                      Sem taxa
                    </span>
                  </button>
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

                      <input
                        className="input col-span-2"
                        placeholder="Bairro *"
                        value={fields.district}
                        onChange={(e) =>
                          updateField("district", e.target.value)
                        }
                      />

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
              </section>

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
                    {method === "delivery" ? "A confirmar" : money(0)}
                  </strong>
                </div>

                <p className="mt-4 border-t border-[#BFE3E1] pt-4 text-xs leading-relaxed text-[#56706E]">
                  Seu pedido será confirmado pelo WhatsApp após verificarmos a
                  disponibilidade
                  {method === "delivery"
                    ? " e o valor da entrega"
                    : ""}
                  .
                </p>
              </section>
            </>
          )}
        </div>

        {!!items.length && (
          <div className="border-t border-[#E9DDD1] bg-white p-5 sm:px-7">
            <button
              onClick={finishOrder}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1EAD72] py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(30,173,114,.2)] hover:bg-[#189762]"
            >
              <Icon name="whatsapp" />
              Finalizar pelo WhatsApp
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

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      const { data: productRows, error: productsError } =
        await supabase
          .from("products")
          .select(
            "id,name,description,price,image_url,category,tag,sold_out,featured,sort_order"
          )
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });

      if (productsError || !productRows?.length) {
        if (productsError)
          console.warn(
            "Não foi possível carregar produtos do Supabase. Usando os produtos locais.",
            productsError
          );
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
          image:
            row.image_url ||
            localFallback?.image ||
            "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=85",
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

      if (!cancelled) setProducts(mappedProducts);
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

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
      (item.product.price +
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
        : [...current, { ...item, key }];
    });

    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#493E38]">
      <Header onCart={() => setCartOpen(true)} />

      <main>
        <section className="relative overflow-hidden border-b border-[#EFE3D7]">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#CBEFEC]/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-[#FFD9D8]/60 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-8 sm:px-6 sm:pb-9 sm:pt-12">
            <div className="flex items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FBE5E4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#DF5662]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E85E69]" />
                  Feito artesanalmente
                </span>

                <h1 className="mt-4 font-display text-4xl font-semibold leading-none text-[#3F3530] sm:text-6xl">
                  Nosso Cardápio
                </h1>

                <p className="mt-3 text-sm text-[#7D6D64] sm:text-base">
                  Escolha seus doces favoritos{" "}
                  <span className="text-[#E85E69]">♥</span>
                </p>
              </div>

              <p className="hidden max-w-xs text-right text-sm leading-relaxed text-[#8A7870] md:block">
                Doçuras preparadas em pequenos lotes, com ingredientes
                selecionados e carinho em cada detalhe.
              </p>
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
                      : "border border-[#E6D9CD] bg-white text-[#75655D] hover:border-[#E9A5AA]"
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
              />
            ))}
          </div>
        </section>
      </main>

      {itemCount > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-24px)] max-w-xl -translate-x-1/2">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-[20px] bg-[#079FA6] p-3 text-left text-white shadow-[0_12px_35px_rgba(3,90,94,.35)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
              <Icon name="bag" />
            </span>

            <span className="min-w-0 flex-1">
              <strong className="block text-sm">Meu pedido</strong>

              <span className="text-xs text-white/75">
                {itemCount} {itemCount === 1 ? "item" : "itens"} ·{" "}
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
          onClose={() => setCartOpen(false)}
          onQuantity={(key, quantity) =>
            setCart((current) =>
              current.map((item) =>
                item.key === key
                  ? { ...item, quantity }
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
```

**A alteração principal está aqui:**

```tsx
href={`https://wa.me/${WHATSAPP_NUMBER}`}
```

e:

```tsx
bg-[#1EAD72]
hover:bg-[#189762]
```

Agora é só substituir o conteúdo do `src/App.tsx` no GitHub e fazer **Commit changes**.
