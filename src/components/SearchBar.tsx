import { useState, useEffect } from "react";
import { Camera, Loader2, X } from "lucide-react";
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
      <form onSubmit={handleSubmit} className="w-full" role="search">
        <label htmlFor="product-search" className="sr-only">
          Buscar produto por código de barras
        </label>

        <div className="flex items-baseline justify-between rule-strong pb-1">
          <span className="smallcaps text-[10px] font-mono">
            Código de barras
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {query.length > 0 ? `${query.length} dig` : "0 dig"}
          </span>
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-foreground/15">
          <input
            id="product-search"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="0000000000000"
            value={query}
            onChange={handleInputChange}
            aria-label="Digite o código de barras do produto"
            aria-controls="search-results"
            className="flex-1 bg-transparent font-mono text-2xl md:text-3xl tracking-[0.08em] placeholder:text-muted-foreground/40 focus:outline-none"
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpar busca"
              aria-label="Limpar campo de busca"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Escanear código de barras"
            aria-label="Abrir scanner de código de barras"
            className="p-2 text-foreground/70 hover:text-primary transition-colors"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-muted-foreground">
            <span className="smallcaps">Enter</span> para consultar
          </p>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            aria-busy={isLoading}
            className="
              inline-flex items-center gap-2
              bg-foreground text-background
              px-5 py-2.5
              smallcaps text-xs font-medium
              transition-all
              hover:bg-primary hover:text-primary-foreground
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-foreground disabled:hover:text-background
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Consultando</span>
              </>
            ) : (
              <>
                <span>Consultar</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
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
