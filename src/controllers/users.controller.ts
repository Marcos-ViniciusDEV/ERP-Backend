import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { hashPassword } from "../libs/password";
import { z } from "zod";

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
});

export const listUsers = async (req: Request, res: Response) => {
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

    const { nanoid } = await import("nanoid");
    const openId = `user_${nanoid()}`;
    const passwordHash = hashPassword(data.password);
    const supervisorPasswordHash = data.supervisorPassword ? hashPassword(data.supervisorPassword) : null;

    await db.insert(users).values({
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

    await db.update(users).set(updateData).where(eq(users.id, Number(id)));

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
