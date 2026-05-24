import { useState, useEffect } from "react";
import { Search, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  debounceMs?: number;
}

export function SearchBar({ onSearch, onClear, isLoading = false, debounceMs = 300 }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (hasInteracted && debouncedQuery.trim()) {
      onSearch(debouncedQuery.trim());
    }
  }, [debouncedQuery, hasInteracted, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasInteracted(true);
      onSearch(query.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setQuery(value);
    if (value.length > 0) {
      setHasInteracted(true);
    } else {
      setHasInteracted(false);
      onClear?.();
    }
  };

  const handleClear = () => {
    setQuery("");
    setHasInteracted(false);
    onClear?.();
  };

  const handleScan = (barcode: string) => {
    setQuery(barcode);
    setHasInteracted(true);
    onSearch(barcode);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto" role="search">
        <label htmlFor="product-search" className="sr-only">
          Buscar produto por código de barras
        </label>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <Input
              id="product-search"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Código de barras..."
              value={query}
              onChange={handleInputChange}
              aria-label="Digite o código de barras do produto"
              aria-controls="search-results"
              className="pl-10 pr-20 h-12 text-base shadow-card focus:shadow-glow transition-shadow"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Limpar busca"
                  aria-label="Limpar campo de busca"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                title="Escanear código de barras"
                aria-label="Abrir scanner de código de barras"
              >
                <Camera className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" aria-hidden="true" />
              </button>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !query.trim()}
            className="w-full h-12 gradient-primary shadow-card hover:shadow-glow transition-all"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" aria-hidden="true" />
                Pesquisar
              </>
            )}
          </Button>
        </div>
      </form>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </>
  );
}
