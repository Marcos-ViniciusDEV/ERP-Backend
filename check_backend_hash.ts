import { getDb } from "./src/libs/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function checkHash() {
  const db = await getDb();
  if (!db) return;

  const userResult = await db.select().from(users).where(eq(users.id, 137));
  const user = userResult[0];

  if (user && user.password) {
      console.log(`Backend Hash: ${user.password}`);
  } else {
      console.log("No password in backend");
  }
  process.exit(0);
}

checkHash();
