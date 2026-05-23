import { Product } from "@/types/product";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Barcode, DollarSign, TrendingDown, Calendar, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  variant?: "exact" | "similar";
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Sem informações";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  } catch (e) {
    return "Sem informações";
  }
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}

function InfoRow({ icon, label, value, highlight = false }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-semibold ${highlight ? "text-primary text-lg" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

interface PriceHistoryCardProps {
  title: string;
  price: number | null;
  date: string | null;
  variant: "current" | "15days" | "30days";
}

function PriceHistoryCard({ title, price, date, variant }: PriceHistoryCardProps) {
  const bgColors = {
    current: "bg-success/10 border-success/20",
    "15days": "bg-warning/10 border-warning/20",
    "30days": "bg-info/10 border-info/20",
  };

  const iconColors = {
    current: "text-success",
    "15days": "text-warning",
    "30days": "text-info",
  };

  return (
    <div className={`rounded-lg border p-4 ${bgColors[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className={`h-4 w-4 ${iconColors[variant]}`} />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className={`font-bold text-foreground mb-1 ${price !== null ? "text-xl" : "text-sm text-muted-foreground"}`}>
        {price !== null ? formatCurrency(price) : "Sem informações"}
      </p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{formatDate(date)}</span>
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

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-elevated animate-fade-in">
      <CardHeader className="pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Código: {product.codigo}</Badge>
            {variant === "exact" ? (
              <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">Exato</Badge>
            ) : (
              <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">Similar</Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground">{product.descricao}</h2>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-3 py-3 border-b border-border/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <Barcode className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Código de Barras</p>
              <p className="font-semibold text-foreground">{product.codigoBarras}</p>
            </div>
            {product.codigoBarras !== "Sem informações" && (
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                title="Copiar código de barras"
                aria-label="Copiar código de barras"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
            )}
          </div>
          <InfoRow
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            label="Preço de Venda"
            value={formatCurrency(product.precoVenda)}
            highlight
          />
          <InfoRow
            icon={<Package className="h-5 w-5 text-muted-foreground" />}
            label="Estoque Disponível"
            value={`${product.estoque} unidades`}
          />
        </div>

        {/* Price History Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Histórico de Preço de Custo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PriceHistoryCard
              title="Custo Atual"
              price={product.precoCustoAtual.price}
              date={product.precoCustoAtual.purchaseDate}
              variant="current"
            />
            <PriceHistoryCard
              title="Custo 15 Dias"
              price={product.precoCusto15Dias.price}
              date={product.precoCusto15Dias.purchaseDate}
              variant="15days"
            />
            <PriceHistoryCard
              title="Custo 30 Dias"
              price={product.precoCusto30Dias.price}
              date={product.precoCusto30Dias.purchaseDate}
              variant="30days"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
