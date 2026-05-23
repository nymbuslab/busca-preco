import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/types/product";
import { Package, Search, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type APIProduct = {
  cod_produto: number;
  produto: string;
  cod_barras: string | null;
  valor_venda1: number;
  estoque: number | null;
  valor_custo_atual: number | null;
  valor_custo_15dias: number | null;
  valor_custo_30dias: number | null;
  data_custo_atual: string | null;
  data_custo_15dias: string | null;
  data_custo_30dias: string | null;
};

type APIResponse = {
  exatos: APIProduct[];
  similares: APIProduct[];
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SearchResults {
  exatos: Product[];
  similares: Product[];
}

function mapApiToProduct(item: APIProduct): Product {
  return {
    codigo: String(item.cod_produto),
    descricao: item.produto,
    codigoBarras: item.cod_barras || "Sem informações",
    precoVenda: item.valor_venda1,
    estoque: item.estoque || 0,
    precoCustoAtual: {
      price: item.valor_custo_atual,
      purchaseDate: item.data_custo_atual,
    },
    precoCusto15Dias: {
      price: item.valor_custo_15dias,
      purchaseDate: item.data_custo_15dias,
    },
    precoCusto30Dias: {
      price: item.valor_custo_30dias,
      purchaseDate: item.data_custo_30dias,
    },
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="w-full max-w-2xl mx-auto">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-24 ml-auto" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20 ml-auto" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Index() {
  const [results, setResults] = useState<SearchResults>({ exatos: [], similares: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const handleClear = () => {
    setResults({ exatos: [], similares: [] });
    setHasSearched(false);
    setCurrentQuery("");
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setCurrentQuery(query);
    setIsLoading(true);
    setHasSearched(true);
    setResults({ exatos: [], similares: [] });

    try {
      const isBarcode = /^\d+$/.test(query);
      const endpoint = isBarcode 
        ? `${API_BASE_URL}/produtos/barras/${encodeURIComponent(query)}`
        : `${API_BASE_URL}/produtos/descricao/${encodeURIComponent(query)}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        if (response.status === 404) {
          return;
        }
        throw new Error(`Erro ao buscar: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      
      const exatos = data.exatos.map(mapApiToProduct);
      const similares = data.similares.map(mapApiToProduct);
      
      setResults({ exatos, similares });

      if (exatos.length === 0 && similares.length === 0) {
        toast.info("Nenhum produto encontrado");
      } else if (exatos.length > 0 && similares.length > 0) {
        toast.success(`Encontrado: ${exatos.length} exato(s) e ${similares.length} similar(es)`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao buscar produto. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalResults = results.exatos.length + results.similares.length;

  return (
    <div className="min-h-screen gradient-hero relative">
      <header className="w-full py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shadow-glow">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Busca Preço</h1>
            <p className="text-sm text-muted-foreground">Consulte preços e estoque rapidamente</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-10">
          <SearchBar onSearch={handleSearch} onClear={handleClear} isLoading={isLoading} debounceMs={300} />
        </section>

        <section 
          id="search-results" 
          className="space-y-8"
          role="region"
          aria-label="Resultados da busca"
          aria-live="polite"
        >
          {isLoading && <LoadingSkeleton />}

          {!isLoading && totalResults > 0 && (
            <>
              {results.exatos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Resultados Exatos
                    </h2>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {results.exatos.length} produto{results.exatos.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div 
                    className="grid grid-cols-1 gap-4"
                    role="list"
                    aria-label={`${results.exatos.length} resultados exatos`}
                  >
                    {results.exatos.map((product) => (
                      <ProductCard
                        key={`exact-${product.codigo}`}
                        product={product}
                        variant="exact"
                      />
                    ))}
                  </div>
                </div>
              )}

              {results.similares.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="h-5 w-5 text-warning" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Resultados Similares
                    </h2>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {results.similares.length} produto{results.similares.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div 
                    className="grid grid-cols-1 gap-4 opacity-90"
                    role="list"
                    aria-label={`${results.similares.length} resultados similares`}
                  >
                    {results.similares.map((product) => (
                      <ProductCard
                        key={`similar-${product.codigo}`}
                        product={product}
                        variant="similar"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!isLoading && totalResults === 0 && hasSearched && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Produto não encontrado</p>
              <p className="text-sm">Tente buscar por outro código ou descrição</p>
            </div>
          )}

          {!hasSearched && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Digite para pesquisar</p>
              <p className="text-sm">Use o código de barras ou nome do produto</p>
            </div>
          )}
        </section>
      </main>

      <footer className="w-full py-4 text-center text-sm text-muted-foreground">
        <p>Nymbus Lab © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
