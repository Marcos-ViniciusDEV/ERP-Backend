// import "dotenv/config";
// import { getDb } from "./src/libs/db";
// import { empresas, users } from "./drizzle/schema";
// import { eq } from "drizzle-orm";
// import { hashPassword } from "./src/libs/password";
// import { nanoid } from "nanoid";

// async function createTestTenant() {
//   const db = await getDb();
//   if (!db) {
//     console.error("Erro ao conectar no banco.");
//     process.exit(1);
//   }

//   console.log("Criando nova empresa de teste...");

//   const codigoAcesso = "TESTE-01";
//   const emailAdmin = "admin@teste.com";
  
//   // 1. Criar a empresa
//   const [resultEmpresa] = await db.insert(empresas).values({
//     razaoSocial: "Empresa de Teste SaaS",
//     nomeFantasia: "Teste Loja",
//     cnpj: "11.111.111/0001-11",
//     codigoAcesso: codigoAcesso,
//     senhaAtivacao: "123456",
//   });
  
//   const empresaId = resultEmpresa.insertId;
//   console.log(`✅ Empresa de Teste criada! ID: ${empresaId}, Código: ${codigoAcesso}`);

//   // 2. Criar o usuário admin da empresa de teste
//   const passwordHash = hashPassword("123456");
//   await db.insert(users).values({
//     empresaId: Number(empresaId),
//     openId: `user_${nanoid()}`,
//     name: "Admin Teste",
//     email: emailAdmin,
//     password: passwordHash,
//     loginMethod: "local",
//     role: "admin",
//     lastSignedIn: new Date()
//   });
  
//   console.log(`✅ Usuário ${emailAdmin} criado para a empresa ${codigoAcesso}!`);

//   console.log("\n=============================================");
//   console.log("🚀 NOVA EMPRESA PRONTA!");
//   console.log(`🏢 Código da Empresa: ${codigoAcesso}`);
//   console.log(`📧 Email: ${emailAdmin}`);
//   console.log("🔒 Senha: 123456");
//   console.log("=============================================\n");

//   process.exit(0);
// }

// createTestTenant().catch(console.error);
