import "dotenv/config";
import { getDb } from "../src/libs/db";
import { sql } from "drizzle-orm";

async function updateSchema() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database connection failed");
      process.exit(1);
    }

    console.log("Adding supervisorPassword column...");
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN supervisorPassword TEXT`);
      console.log("Column added.");
    } catch (e: any) {
      if (e.message.includes("Duplicate column")) {
        console.log("Column already exists.");
      } else {
        console.error("Error adding column:", e.message);
      }
    }

    console.log("Updating role enum...");
    try {
      // MySQL syntax for modifying enum
      await db.execute(sql`ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'pdv_operator') NOT NULL DEFAULT 'user'`);
      console.log("Enum updated.");
    } catch (e: any) {
      console.error("Error updating enum:", e.message);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error updating schema:", error);
    process.exit(1);
  }
}

updateSchema();
