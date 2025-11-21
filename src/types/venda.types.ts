export interface ItemVenda {
  id: number;
  vendaId: number;
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  valorDesconto: number;
  createdAt: Date;
}

export interface Venda {
  id: number;
  numeroVenda: string;
  dataVenda: Date;
  valorTotal: number;
  valorDesconto: number;
  valorLiquido: number;
  formaPagamento: string | null;
  status: "CONCLUIDA" | "CANCELADA";
  nfceNumero: string | null;
  nfceChave: string | null;
  operadorId: number | null;
  observacao: string | null;
  createdAt: Date;
  itens?: ItemVenda[];
}
