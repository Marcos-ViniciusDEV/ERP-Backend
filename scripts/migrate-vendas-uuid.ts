import dotenv from "dotenv";
import { getDb } from "../src/libs/db";
import { sql } from "drizzle-orm";

dotenv.config();

async function runMigration() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log("\n=== Running Migration 0011 ===\n");
  
  try {
    // Check if uuid column exists
    const [cols]: any = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vendas' 
        AND COLUMN_NAME = 'uuid'
    `);
    
    if (cols.length > 0) {
      console.log("✅ Column 'uuid' already exists in vendas table");
    } else {
      console.log("Adding 'uuid' column to vendas table...");
      await db.execute(sql`ALTER TABLE vendas ADD uuid varchar(36) NULL`);
      await db.execute(sql`ALTER TABLE vendas ADD CONSTRAINT vendas_uuid_unique UNIQUE(uuid)`);
      console.log("✅ Added 'uuid' column");
    }
    
    // Check other columns
    const columnsToAdd = [
      { name: 'ccf', type: 'varchar(6)' },
      { name: 'coo', type: 'varchar(6)' },
      { name: 'pdvId', type: 'varchar(50)' },
      { name: 'operadorNome', type: 'varchar(255)' }
    ];
    
    for (const col of columnsToAdd) {
      const [exists]: any = await db.execute(sql.raw(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'vendas' 
          AND COLUMN_NAME = '${col.name}'
      `));
      
      if (exists.length > 0) {
        console.log(`✅ Column '${col.name}' already exists`);
      } else {
        console.log(`Adding '${col.name}' column...`);
        await db.execute(sql.raw(`ALTER TABLE vendas ADD ${col.name} ${col.type} NULL`));
        console.log(`✅ Added '${col.name}' column`);
      }
    }
    
    console.log("\n✅ Migration completed successfully\n");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
  }
  
  process.exit(0);
}

runMigration();
