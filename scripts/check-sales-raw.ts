import dotenv from "dotenv";
import { getDb } from "../src/libs/db";
import { sql } from "drizzle-orm";

dotenv.config();

async function checkBackendSales() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [sales]: any = await db.execute(sql`SELECT * FROM vendas`);
  
  console.log("\n=== BACKEND SALES ===\n");
  console.log(`Total sales: ${sales.length}\n`);
  
  if (sales.length > 0) {
    sales.forEach((sale: any) => {
      console.log(`Sale #${sale.numeroVenda}:`);
      console.log(`  UUID: ${sale.uuid}`);
      console.log(`  Total: ${sale.valorTotal} cents = R$ ${(sale.valorTotal / 100).toFixed(2)}`);
      console.log(`  Date: ${sale.dataVenda}`);
      console.log(`  Operator: ${sale.operadorNome || 'N/A'}`);
      console.log("");
    });
  }
  
  // Check stock
  const [products]: any = await db.execute(sql`SELECT id, descricao, estoque FROM produtos LIMIT 5`);
  console.log("=== PRODUCT STOCK ===\n");
  products.forEach((p: any) => {
    console.log(`#${p.id} - ${p.descricao}: ${p.estoque} units`);
  });
  
  process.exit(0);
}

checkBackendSales();
