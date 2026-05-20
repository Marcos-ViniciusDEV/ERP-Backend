/**
 * Script de migração: Motor de Promoções — adiciona campos à tabela offers
 * Usa INFORMATION_SCHEMA para verificar se a coluna já existe antes de adicionar
 */
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./drizzle/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });

  // Verificar quais colunas já existem
  const existingCols = await db.execute(sql`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'offers'
  `);

  const cols = new Set((existingCols[0] as any[]).map((r: any) => r.COLUMN_NAME));
  console.log("Colunas existentes:", [...cols]);

  const steps: { name: string; column: string; query: string }[] = [
    {
      name: "nome",
      column: "nome",
      query: `ALTER TABLE offers ADD COLUMN nome VARCHAR(255) NULL AFTER produtoId`,
    },
    {
      name: "tipoDesconto",
      column: "tipoDesconto",
      query: `ALTER TABLE offers ADD COLUMN tipoDesconto ENUM('PRECO_FIXO','PERCENTUAL','LEVE_X_PAGUE_Y','DESCONTO_SEGUNDO') NOT NULL DEFAULT 'PRECO_FIXO' AFTER nome`,
    },
    {
      name: "percentualDesconto",
      column: "percentualDesconto",
      query: `ALTER TABLE offers ADD COLUMN percentualDesconto INT NOT NULL DEFAULT 0 AFTER precoOferta`,
    },
    {
      name: "qtdLeve",
      column: "qtdLeve",
      query: `ALTER TABLE offers ADD COLUMN qtdLeve INT NOT NULL DEFAULT 3 AFTER percentualDesconto`,
    },
    {
      name: "qtdPague",
      column: "qtdPague",
      query: `ALTER TABLE offers ADD COLUMN qtdPague INT NOT NULL DEFAULT 2 AFTER qtdLeve`,
    },
    {
      name: "horaInicio",
      column: "horaInicio",
      query: `ALTER TABLE offers ADD COLUMN horaInicio VARCHAR(5) NULL AFTER dataFim`,
    },
    {
      name: "horaFim",
      column: "horaFim",
      query: `ALTER TABLE offers ADD COLUMN horaFim VARCHAR(5) NULL AFTER horaInicio`,
    },
    {
      name: "aplicacaoAutomatica",
      column: "aplicacaoAutomatica",
      query: `ALTER TABLE offers ADD COLUMN aplicacaoAutomatica BOOLEAN NOT NULL DEFAULT TRUE AFTER horaFim`,
    },
    {
      name: "updatedAt",
      column: "updatedAt",
      query: `ALTER TABLE offers ADD COLUMN updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt`,
    },
  ];

  for (const step of steps) {
    if (cols.has(step.column)) {
      console.log(`⏭️  ${step.name} (já existe)`);
      continue;
    }
    try {
      await db.execute(sql.raw(step.query));
      console.log(`✅ ${step.name} adicionada`);
    } catch (err: any) {
      console.warn(`⚠️  ${step.name}: ${err.message}`);
    }
  }

  // Garantir que precoOferta tem default 0
  try {
    await db.execute(sql.raw(`ALTER TABLE offers MODIFY COLUMN precoOferta INT NOT NULL DEFAULT 0`));
    console.log(`✅ precoOferta → DEFAULT 0`);
  } catch (err: any) {
    console.warn(`⚠️  precoOferta modify: ${err.message}`);
  }

  console.log("\n🎉 Migração do Motor de Promoções concluída!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
