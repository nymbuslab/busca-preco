export interface PriceHistory {
  price: number | null;
  purchaseDate: string | null;
}

export interface Product {
  codigo: string;
  descricao: string;
  codigoBarras: string;
  precoVenda: number;
  estoque: number;
  precoCustoAtual: PriceHistory;
  precoCusto15Dias: PriceHistory;
  precoCusto30Dias: PriceHistory;
}
