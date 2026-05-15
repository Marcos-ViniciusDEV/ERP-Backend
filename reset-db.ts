import "dotenv/config";
import mysql from "mysql2/promise";

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
  
  const [rows] = await connection.query("SHOW TABLES");
  for (const row of rows as any[]) {
    const tableName = Object.values(row)[0];
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }
  
  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
  console.log("All tables dropped!");
  process.exit(0);
}
run();
