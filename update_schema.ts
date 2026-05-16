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

  console.log("Schema updated successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
