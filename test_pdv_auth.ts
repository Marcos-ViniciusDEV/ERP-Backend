import { getDb } from "./src/libs/db";
import { empresas } from "./drizzle/schema";
import { hashPassword } from "./src/libs/password";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function fixSenhaAtivacao() {
  const db = await getDb();
  if (!db) { console.error("DB null"); process.exit(1); }

  // Buscar empresa
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, 1));
  if (!empresa) { console.error("Empresa não encontrada"); process.exit(1); }

  const senhaAtual = empresa.senhaAtivacao ?? "";
  
  // Verificar se já está hasheada (formato salt:hash contém ":")
  if (senhaAtual.includes(":")) {
    console.log("✅ Senha já está hasheada. Nada a fazer.");
    process.exit(0);
  }

  // Senha em texto plano — aplicar hash
  const senhaHash = hashPassword(senhaAtual);
  
  await db.update(empresas)
    .set({ senhaAtivacao: senhaHash })
    .where(eq(empresas.id, 1));

  console.log(`✅ Senha da empresa "${empresa.nomeFantasia}" atualizada para o formato seguro.`);
  console.log(`   Senha em texto plano era: "${senhaAtual}"`);
  console.log(`   Use esta senha para ativar o PDV: "${senhaAtual}"`);
  
  process.exit(0);
}

fixSenhaAtivacao().catch((e) => { console.error(e.message); process.exit(1); });
