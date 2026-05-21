import { eq, like, or, desc, and } from "drizzle-orm";
import { getDb } from "../libs/db";
import { funcionarios } from "../../drizzle/schema";

export const list = async (empresaId: number, search?: string) => {
  const db = await getDb();
  if (!db) return [];

  if (search) {
    return db
      .select()
      .from(funcionarios)
      .where(
        and(
          eq(funcionarios.empresaId, empresaId),
          or(
            like(funcionarios.nome, `%${search}%`),
            like(funcionarios.cargo, `%${search}%`)
          )
        )
      )
      .orderBy(desc(funcionarios.id));
  }

  return db
    .select()
    .from(funcionarios)
    .where(eq(funcionarios.empresaId, empresaId))
    .orderBy(desc(funcionarios.id));
};

export const create = async (empresaId: number, data: any) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(funcionarios).values({
    empresaId,
    nome: data.nome,
    cargo: data.cargo,
    salario: data.salario,
    dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : new Date(),
    dataDesligamento: data.dataDesligamento ? new Date(data.dataDesligamento) : null,
    telefone: data.telefone || null,
    email: data.email || null,
    ativo: data.ativo !== undefined ? data.ativo : true,
  });
};

export const update = async (empresaId: number, id: number, data: any) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.cargo !== undefined) updateData.cargo = data.cargo;
  if (data.salario !== undefined) updateData.salario = data.salario;
  if (data.dataAdmissao !== undefined) updateData.dataAdmissao = new Date(data.dataAdmissao);
  if (data.dataDesligamento !== undefined) updateData.dataDesligamento = data.dataDesligamento ? new Date(data.dataDesligamento) : null;
  if (data.telefone !== undefined) updateData.telefone = data.telefone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;

  await db
    .update(funcionarios)
    .set(updateData)
    .where(and(eq(funcionarios.id, id), eq(funcionarios.empresaId, empresaId)));

  return { success: true };
};

export const remove = async (empresaId: number, id: number) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(funcionarios)
    .where(and(eq(funcionarios.id, id), eq(funcionarios.empresaId, empresaId)));

  return { success: true };
};
