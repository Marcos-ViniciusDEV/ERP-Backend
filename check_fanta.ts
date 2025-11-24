
import "dotenv/config";
import { produtoService } from "./src/services/produto.service";

async function check() {
  try {
    const produtos = await produtoService.list();
    console.log("Total products:", produtos.length);
    const fanta = produtos.find((p) => p.descricao.toLowerCase().includes("fanta"));
    if (fanta) {
      console.log("Found Fanta:", fanta);
    } else {
      console.log("Fanta NOT found.");
      console.log("First 5 products:", produtos.slice(0, 5).map(p => p.descricao));
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
