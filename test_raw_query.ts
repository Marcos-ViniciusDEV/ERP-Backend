import { getDb } from "./src/libs/db.js";
import { vendas, users } from "./drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  
  const query = db
    .select({
      id: vendas.id,
      numeroVenda: vendas.numeroVenda,
      operadorNome: sql<string>`COALESCE(${users.name}, ${vendas.operadorNome})`,
      pdvId: vendas.pdvId,
    })
    .from(vendas)
    .leftJoin(users, eq(vendas.operadorId, users.id));

  const result = await query;
  console.log("Raw query result length:", result.length);
  console.log("Raw query SQL:", query.toSQL());
}

main().catch(console.error).finally(() => process.exit(0));
