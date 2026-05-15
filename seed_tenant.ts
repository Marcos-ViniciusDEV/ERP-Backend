import "dotenv/config";
import { getDb } from "./src/libs/db";
import { empresas, users } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./src/libs/password";
import { nanoid } from "nanoid";

async function seedTenant() {
  const db = await getDb();
  if (!db) {
    console.error("Erro ao conectar no banco.");
    process.exit(1);
  }

  console.log("Iniciando criação de dados Multi-Tenant...");

  // 1. Criar uma empresa Padrão (Sua empresa raiz)
  const codigoAcesso = "LOJA-MATRIZ"; // Este será o código digitado no login!
  
  // Verificar se já existe
  const [empresaExistente] = await db.select().from(empresas).where(eq(empresas.codigoAcesso, codigoAcesso));
  
  let empresaId;

  if (!empresaExistente) {
    const [result] = await db.insert(empresas).values({
      razaoSocial: "Minha Empresa Padrão LTDA",
      nomeFantasia: "Loja Matriz",
      cnpj: "00.000.000/0001-00",
      codigoAcesso: codigoAcesso,
      senhaAtivacao: "123456", // Senha para ativar os PDVs
    });
    empresaId = result.insertId;
    console.log(`✅ Empresa criada com sucesso! ID: ${empresaId}, Código: ${codigoAcesso}`);
  } else {
    empresaId = empresaExistente.id;
    console.log(`ℹ️ Empresa já existia. ID: ${empresaId}, Código: ${codigoAcesso}`);
  }

  // 2. Vincular ou criar o usuário Admin@sistema.com
  const emailAdmin = "admin@sistema.com";
  const [adminUser] = await db.select().from(users).where(eq(users.email, emailAdmin));

  if (adminUser) {
    await db.update(users).set({ empresaId: Number(empresaId), role: "admin" }).where(eq(users.id, adminUser.id));
    console.log(`✅ Usuário ${emailAdmin} vinculado à empresa ${codigoAcesso}!`);
  } else {
    // Criar o usuário admin
    const passwordHash = hashPassword("123456");
    await db.insert(users).values({
      empresaId: Number(empresaId),
      openId: `user_${nanoid()}`,
      name: "Administrador Geral",
      email: emailAdmin,
      password: passwordHash,
      loginMethod: "local",
      role: "admin",
      lastSignedIn: new Date()
    });
    console.log(`✅ Usuário ${emailAdmin} criado e vinculado à empresa ${codigoAcesso}!`);
  }

  console.log("\n=============================================");
  console.log("🎉 PRONTO PARA LOGIN!");
  console.log(`🏢 Código da Empresa: ${codigoAcesso}`);
  console.log(`📧 Email: ${emailAdmin}`);
  console.log("🔒 Senha: 123456");
  console.log("=============================================\n");

  process.exit(0);
}

seedTenant().catch(console.error);
