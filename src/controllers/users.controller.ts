import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { users, empresas } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../libs/password";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

// Helper to save base64 image
const saveImage = (base64Data: string): string => {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }
    const type = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    let extension = "png";
    if (type === "image/jpeg") extension = "jpg";
    else if (type === "image/gif") extension = "gif";
    else if (type === "image/webp") extension = "webp";

    const filename = `${nanoid()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "uploads", "users");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/users/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    throw new Error("Failed to save image");
  }
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

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin", "pdv_operator"]),
  supervisorPassword: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["user", "admin", "pdv_operator"]).optional(),
  supervisorPassword: z.string().optional(),
  foto: z.string().optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const authUser = (req as any).user;
    const empresaId = authUser?.empresaId;
    
    if (empresaId) {
      // Validate plan limits
      const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
      if (empresa && empresa.plano === "STARTER") {
        const currentUsers = await db.select().from(users).where(eq(users.empresaId, empresaId));
        if (currentUsers.length >= 1) {
          return res.status(403).json({ error: "O plano Starter permite apenas 1 usuário. Faça upgrade para adicionar mais." });
        }
      }
    }

    const { nanoid } = await import("nanoid");
    const openId = `user_${nanoid()}`;
    const passwordHash = hashPassword(data.password);
    const supervisorPasswordHash = data.supervisorPassword ? hashPassword(data.supervisorPassword) : null;

    await db.insert(users).values({
      empresaId: empresaId || null,
      openId,
      email: data.email,
      name: data.name,
      password: passwordHash,
      supervisorPassword: supervisorPasswordHash,
      role: data.role,
      loginMethod: "local",
    });

    res.status(201).json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.password = hashPassword(data.password);
    if (data.supervisorPassword) updateData.supervisorPassword = hashPassword(data.supervisorPassword);
    
    if (data.foto) {
      const [existingUser] = await db.select().from(users).where(eq(users.id, Number(id)));
      if (existingUser?.fotoCaminho) {
        deleteImage(existingUser.fotoCaminho);
      }
      updateData.fotoCaminho = saveImage(data.foto);
    }

    await db.update(users).set(updateData).where(eq(users.id, Number(id)));

    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updatePasswordSchema.parse(req.body);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.password || !verifyPassword(data.currentPassword, user.password)) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }

    const newPasswordHash = hashPassword(data.newPassword);
    await db.update(users).set({ password: newPasswordHash }).where(eq(users.id, Number(id)));

    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(users).where(eq(users.id, Number(id)));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
