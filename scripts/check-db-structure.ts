import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

async function checkMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "test",
  });
  
  const [tables] = await connection.query("SHOW TABLES");
  console.log("\nTables:", tables);
  
  const [cols] = await connection.query("SHOW COLUMNS FROM vendas");
  console.log("\nColumns in vendas:");
  console.log(cols);
  
  await connection.end();
  process.exit(0);
}

checkMigrations();
