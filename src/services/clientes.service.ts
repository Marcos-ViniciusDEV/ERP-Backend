import { eq, like, or, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { clientes } from "../../drizzle/schema";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

// Helper to save base64 image
const saveImage = (base64Data: string): string => {
  try {
    // Remove header if present (e.g., "data:image/png;base64,")
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    // Determine extension
    let extension = "png";
    if (type === "image/jpeg") extension = "jpg";
    else if (type === "image/gif") extension = "gif";
    else if (type === "image/webp") extension = "webp";

    const filename = `${nanoid()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "uploads", "clientes");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return `/uploads/clientes/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    throw new Error("Failed to save image");
  }
};

export const list = async (search?: string) => {
  const db = await getDb();
  if (!db) return [];

  if (search) {
    return db
      .select()
      .from(clientes)
      .where(or(like(clientes.nome, `%${search}%`), like(clientes.cpfCnpj, `%${search}%`)))
      .orderBy(desc(clientes.id));
  }

  return db.select().from(clientes).orderBy(desc(clientes.id));
};

export const create = async (data: any) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let fotoCaminho = null;
  if (data.foto) {
    fotoCaminho = saveImage(data.foto);
  }

  return db.insert(clientes).values({
    nome: data.nome,
    cpfCnpj: data.cpfCnpj,
    email: data.email,
    telefone: data.telefone,
    endereco: data.endereco,
    fotoCaminho: fotoCaminho,
  });
};

const deleteImage = (relativePath: string) => {
  try {
    const filepath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};

export const update = async (id: number, data: any) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { ...data };
  delete updateData.foto;
  delete updateData.id;

  if (data.foto) {
    // Fetch existing client to get old photo path
    const [existingClient] = await db.select().from(clientes).where(eq(clientes.id, id));
    
    if (existingClient?.fotoCaminho) {
      deleteImage(existingClient.fotoCaminho);
    }

    updateData.fotoCaminho = saveImage(data.foto);
  }

  await db.update(clientes).set(updateData).where(eq(clientes.id, id));
  return { success: true };
};

export const remove = async (id: number) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch existing client to get photo path
  const [existingClient] = await db.select().from(clientes).where(eq(clientes.id, id));

  if (existingClient?.fotoCaminho) {
    deleteImage(existingClient.fotoCaminho);
  }

  await db.delete(clientes).where(eq(clientes.id, id));
  return { success: true };
};
