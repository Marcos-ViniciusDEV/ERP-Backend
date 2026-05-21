import "dotenv/config";
import { getDb } from "./src/libs/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not connected");

  console.log("Updating empresas table...");
  try {
    await db.execute(
      "ALTER TABLE `empresas` MODIFY COLUMN `plano` enum('BASICO','PRO','ENTERPRISE','TRIAL','STARTER','PROFESSIONAL') NOT NULL DEFAULT 'TRIAL';"
    );
  } catch (e: any) { console.log(e.message) }
  
  try { await db.execute("ALTER TABLE `empresas` ADD COLUMN `tipoVarejo` varchar(100);"); } catch(e: any) { console.log(e.message) }
  try { await db.execute("ALTER TABLE `empresas` ADD COLUMN `faturamentoMensal` varchar(50);"); } catch(e: any) { console.log(e.message) }
  try { await db.execute("ALTER TABLE `empresas` ADD COLUMN `vendedores` int DEFAULT 0;"); } catch(e: any) { console.log(e.message) }
  
  console.log("Updating users table...");
  try { await db.execute("ALTER TABLE `users` ADD COLUMN `fotoCaminho` varchar(255);"); } catch(e: any) { console.log(e.message) }

  console.log("Creating funcionarios table...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`funcionarios\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`empresaId\` int NOT NULL,
        \`nome\` varchar(255) NOT NULL,
        \`cargo\` varchar(100) NOT NULL,
        \`salario\` int NOT NULL DEFAULT 0,
        \`dataAdmissao\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`dataDesligamento\` timestamp NULL,
        \`telefone\` varchar(20),
        \`email\` varchar(320),
        \`ativo\` boolean NOT NULL DEFAULT true,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`empresaId\`) REFERENCES \`empresas\` (\`id\`)
      );
    `);
  } catch (e: any) {
    console.log("Error creating funcionarios:", e.message);
  }

  console.log("Creating expense_goals table...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`expense_goals\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`empresaId\` int NOT NULL,
        \`month\` int NOT NULL,
        \`year\` int NOT NULL,
        \`targetAmount\` int NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`empresaId\`) REFERENCES \`empresas\` (\`id\`)
      );
    `);
  } catch (e: any) {
    console.log("Error creating expense_goals:", e.message);
  }

  console.log("Creating whatsapp_configs table...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`whatsapp_configs\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`empresaId\` int NOT NULL,
        \`phoneNumber\` varchar(20) NOT NULL,
        \`defaultMessage\` text,
        \`businessHoursStart\` varchar(5),
        \`businessHoursEnd\` varchar(5),
        \`enabled\` boolean NOT NULL DEFAULT true,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`empresaId\`) REFERENCES \`empresas\` (\`id\`)
      );
    `);
  } catch (e: any) {
    console.log("Error creating whatsapp_configs:", e.message);
  }

  console.log("Schema updated successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
