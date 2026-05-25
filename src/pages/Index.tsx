import { useCallback, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/types/product";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type APIProduct = {
  cod_produto: number;
  produto: string;
  cod_barras: string | null;
  valor_venda1: number;
  estoque: number | null;
  pesavel: string | null;
  unidade: string | null;
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
    estoque: item.estoque ?? 0,
    unidade: (item.unidade || "").trim() || "UN",
    pesavel: (item.pesavel || "").trim() || "N",
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
    <div className="space-y-6 max-w-2xl mx-auto">
      {[1, 2].map((i) => (
        <div key={i} className="border-y border-foreground/20 py-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
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

  const handleClear = useCallback(() => {
    setResults({ exatos: [], similares: [] });
    setHasSearched(false);
    setCurrentQuery("");
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setCurrentQuery(query);
    setIsLoading(true);
    setHasSearched(true);
    setResults({ exatos: [], similares: [] });

    try {
      const endpoint = `${API_BASE_URL}/produtos/barras/${encodeURIComponent(query)}`;

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
        toast.info("Código de barras não encontrado");
      } else if (exatos.length > 0 && similares.length > 0) {
        toast.success(`Encontrado: ${exatos.length} exato(s) e ${similares.length} similar(es)`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao buscar produto. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const totalResults = results.exatos.length + results.similares.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="w-full border-b border-foreground/15">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-6 flex items-baseline justify-between gap-3">
          <h1 className="text-lg md:text-2xl font-semibold leading-none tracking-tight">
            Busca<span className="text-primary">.</span>Preço
          </h1>
          <span className="smallcaps text-[9px] md:text-[10px] text-muted-foreground font-mono truncate">
            <span className="hidden sm:inline">Sistema interno · </span>v1.0
          </span>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-10">
          <section className="mb-5 md:mb-12">
            <SearchBar onSearch={handleSearch} onClear={handleClear} isLoading={isLoading} debounceMs={300} />
          </section>

          <section
            id="search-results"
            className="space-y-6 md:space-y-10"
            role="region"
            aria-label="Resultados da busca"
            aria-live="polite"
          >
            {isLoading && <LoadingSkeleton />}

            {!isLoading && totalResults > 0 && (
              <>
                {results.exatos.length > 0 && (
                  <div className="space-y-3 md:space-y-4 ledger-in">
                    <div className="flex items-baseline justify-between rule pb-1 md:pb-2">
                      <h2 className="smallcaps text-[11px] md:text-xs font-medium">
                        Resultado exato
                      </h2>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {String(results.exatos.length).padStart(2, "0")} {results.exatos.length === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <div role="list" aria-label={`${results.exatos.length} resultados exatos`} className="space-y-5 md:space-y-8">
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
                  <div className="space-y-3 md:space-y-4 ledger-in">
                    <div className="flex items-baseline justify-between rule pb-1 md:pb-2">
                      <h2 className="smallcaps text-[11px] md:text-xs font-medium">
                        Similares <span className="text-muted-foreground/70 font-normal normal-case tracking-normal">— mesmo prefixo</span>
                      </h2>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {String(results.similares.length).padStart(2, "0")} {results.similares.length === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <div role="list" aria-label={`${results.similares.length} resultados similares`} className="space-y-5 md:space-y-8">
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
              <div className="py-12 md:py-20 text-center space-y-2 border-y border-foreground/15">
                <p className="smallcaps text-xs text-muted-foreground font-mono">
                  ∅ Sem resultado
                </p>
                <p className="text-lg md:text-xl font-medium">Código não cadastrado.</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Confira os números ou escaneie novamente.
                </p>
              </div>
            )}

            {!hasSearched && (
              <div className="py-10 md:py-20 text-center space-y-2 md:space-y-3">
                <p className="smallcaps text-[11px] md:text-xs text-muted-foreground font-mono">
                  Aguardando leitura
                </p>
                <p className="text-xl md:text-2xl font-medium leading-tight tracking-tight">
                  Digite ou escaneie<br />
                  o <span className="text-primary">código de barras</span>.
                </p>
                <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto px-2">
                  Use o leitor da câmera, um scanner USB ou digite manualmente os números.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-foreground/15">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-2.5 md:py-4 flex items-center justify-between text-[10px] md:text-[11px] font-mono text-muted-foreground">
          <span className="smallcaps">Nymbus Lab</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
