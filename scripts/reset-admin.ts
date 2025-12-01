import "dotenv/config";
import { getDb } from "../src/libs/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/libs/password";
import { nanoid } from "nanoid";

async function resetAdmin() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database connection failed");
      process.exit(1);
    }

    const email = "admin@sistema.com";
    const password = "admin";
    const passwordHash = hashPassword(password);

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      await db.update(users).set({
        password: passwordHash,
        role: "admin",
        name: "Administrador Sistema"
      }).where(eq(users.email, email));
      console.log(`User ${email} updated. Password: ${password}`);
    } else {
      await db.insert(users).values({
        openId: `user_${nanoid()}`,
        email,
        name: "Administrador Sistema",
        password: passwordHash,
        role: "admin",
        loginMethod: "local"
      });
      console.log(`User ${email} created. Password: ${password}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error resetting admin:", error);
    process.exit(1);
  }
}

resetAdmin();
