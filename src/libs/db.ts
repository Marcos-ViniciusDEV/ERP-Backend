import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../../drizzle/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Obtém a instância do Drizzle ORM conectada ao MySQL
 *
 * Lazy loading: cria a conexão apenas quando necessário, permitindo que
 * ferramentas locais (testes, linters) executem sem DATABASE_URL configurado.
 *
 * @returns Instância do Drizzle ou null se DATABASE_URL não estiver disponível
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
