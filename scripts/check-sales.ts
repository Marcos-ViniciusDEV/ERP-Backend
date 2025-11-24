import dotenv from "dotenv";
import { getDb } from "../src/libs/db";
import { vendas, produtos } from "../drizzle/schema";
import { eq } from "drizzle-orm";

dotenv.config();

async function checkBackendSales() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allSales = await db.select().from(vendas);
  
  console.log("\n=== BACKEND SALES STATUS ===\n");
  console.log(`Total sales: ${allSales.length}`);
  
  if (allSales.length > 0) {
    console.log("\n--- Sales Details ---");
    for (const sale of allSales) {
      console.log(`Sale #${sale.numeroVenda}:`);
      console.log(`  UUID: ${sale.uuid}`);
      console.log(`  Total: ${sale.valorTotal} cents`);
      console.log(`  Date: ${sale.dataVenda}`);
      console.log(`  Operator: ${sale.operadorNome}`);
      console.log("");
    }
  }
  
  // Check stock
  const prod1 = await db.select().from(produtos).where(eq(produtos.id, 1)).limit(1);
  if (prod1.length > 0) {
    console.log(`Product #1 stock: ${prod1[0].estoque}`);
  }
  
  process.exit(0);
}

checkBackendSales();
