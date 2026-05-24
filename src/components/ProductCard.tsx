import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  variant?: "exact" | "similar";
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return "—";
  }
}

function formatEstoque(value: number): string {
  // double(15,3) do banco — preserva ate 3 casas decimais quando houver,
  // sem casas quando o valor e inteiro perfeito.
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
}

const PESAVEL_LABEL: Record<string, string> = {
  S: "Pesável",
  L: "Pesável",
  U: "Pesável p/ unidade",
};

interface CostRowProps {
  label: string;
  hint?: string;
  date: string | null;
  price: number | null;
  accent?: "primary" | "success" | "warning" | "info";
}

function CostRow({ label, hint, date, price, accent }: CostRowProps) {
  const isEmpty = price === null;
  const accentColor = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };
  const priceClass = isEmpty
    ? "text-muted-foreground/60"
    : accent
    ? accentColor[accent]
    : "text-foreground";

  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5">
      <div>
        <p className="smallcaps text-[10px] text-foreground/80 font-medium">
          {label}
        </p>
        {hint && (
          <p className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">
            {hint}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className={`font-mono text-base tabular-nums tracking-tight ${priceClass}`}>
          {formatCurrency(price)}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {formatDate(date)}
        </p>
      </div>
    </div>
  );
}

export function ProductCard({ product, variant = "exact" }: ProductCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyBarcode = async () => {
    if (!product.codigoBarras || product.codigoBarras === "Sem informações") return;
    await navigator.clipboard.writeText(product.codigoBarras);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasBarcode =
    product.codigoBarras && product.codigoBarras !== "Sem informações";

  return (
    <article
      className={
        "ledger-in border-y border-foreground/20 py-6 " +
        (variant === "similar" ? "opacity-90" : "")
      }
    >
      {/* CABECALHO: codigo + tag */}
      <header className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[11px] text-muted-foreground">
          <span className="smallcaps">Cód</span>{" "}
          <span className="text-foreground">{product.codigo}</span>
        </p>
        <span
          className={
            "smallcaps text-[10px] font-mono tag-bracket " +
            (variant === "exact" ? "text-primary" : "text-muted-foreground")
          }
        >
          {variant === "exact" ? "Exato" : "Similar"}
        </span>
      </header>

      {/* NOME DO PRODUTO */}
      <h3 className="text-xl md:text-2xl font-semibold leading-tight tracking-tight text-foreground">
        {product.descricao}
      </h3>

      {/* CODIGO DE BARRAS */}
      <div className="mt-3 flex items-center gap-3">
        <p className="font-mono text-xs tracking-[0.06em] text-muted-foreground">
          <span className="smallcaps">EAN</span>{" "}
          <span className={hasBarcode ? "text-foreground" : "italic"}>
            {product.codigoBarras}
          </span>
        </p>
        {hasBarcode && (
          <button
            type="button"
            onClick={handleCopyBarcode}
            title="Copiar código de barras"
            aria-label="Copiar código de barras"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* PRECO DE VENDA + ESTOQUE */}
      <div className="mt-6 space-y-3 pt-4 border-t border-foreground/15">
        <div className="leader">
          <span className="smallcaps text-xs text-foreground/80">Preço de venda</span>
          <span className="font-mono text-3xl md:text-4xl tabular-nums tracking-tight text-primary">
            {formatCurrency(product.precoVenda)}
          </span>
        </div>

        <div className="leader">
          <span className="smallcaps text-xs text-foreground/80">
            Estoque
            {PESAVEL_LABEL[product.pesavel] && (
              <span className="ml-2 text-[9px] text-muted-foreground font-normal normal-case tracking-normal">
                · {PESAVEL_LABEL[product.pesavel]}
              </span>
            )}
          </span>
          <span className="font-mono text-base tabular-nums">
            {formatEstoque(product.estoque)}{" "}
            <span className="text-muted-foreground text-xs">{product.unidade}</span>
          </span>
        </div>
      </div>

      {/* HISTORICO DE CUSTO */}
      <div className="mt-6 pt-4 border-t border-foreground/15">
        <p className="smallcaps text-[10px] font-mono text-muted-foreground mb-1">
          Histórico de custo
        </p>

        <div className="divide-y divide-foreground/10">
          <CostRow
            label="Atual"
            hint="última compra"
            date={product.precoCustoAtual.purchaseDate}
            price={product.precoCustoAtual.price}
            accent="success"
          />
          <CostRow
            label="Mês anterior"
            hint="≈ 15 dias"
            date={product.precoCusto15Dias.purchaseDate}
            price={product.precoCusto15Dias.price}
            accent="warning"
          />
          <CostRow
            label="Dois meses atrás"
            hint="≈ 30 dias"
            date={product.precoCusto30Dias.purchaseDate}
            price={product.precoCusto30Dias.price}
            accent="info"
          />
        </div>
      </div>
    </article>
  );
}
