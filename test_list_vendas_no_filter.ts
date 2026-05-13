import { list } from "./src/services/venda.service.js";
import { getDb } from "./src/libs/db.js";

async function main() {
  const result = await list({});
  console.log("Total vendas:", result.length);
  if (result.length > 0) {
    console.log("Primeira venda:", result[0]);
  }
}

main().catch(console.error).finally(() => process.exit(0));
