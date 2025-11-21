import * as db from "../legacy_db";
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
  return db.getAllClientes(search);
};

export const create = async (data: any) => {
  let fotoCaminho = null;
  if (data.foto) {
    fotoCaminho = saveImage(data.foto);
  }

  return db.createCliente({
    nome: data.nome,
    cpfCnpj: data.cpfCnpj,
    email: data.email,
    telefone: data.telefone,
    endereco: data.endereco,
    fotoCaminho: fotoCaminho,
  });
};

export const update = async (id: number, data: any) => {
  const updateData: any = { ...data, id };
  delete updateData.foto;

  if (data.foto) {
    updateData.fotoCaminho = saveImage(data.foto);
  }

  return db.updateCliente(updateData);
};

export const remove = async (id: number) => {
  return db.deleteCliente(id);
};
