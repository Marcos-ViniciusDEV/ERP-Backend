import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');
const db = new Database(dbPath);

async function createUser() {
  try {
    // Hash da senha
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Verificar se usuário já existe
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@pdv.com');
    
    if (existing) {
      console.log('✅ Usuário admin@pdv.com já existe!');
      console.log('Email: admin@pdv.com');
      console.log('Senha: admin123');
      db.close();
      return;
    }
    
    // Inserir novo usuário
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('Admin PDV', 'admin@pdv.com', passwordHash, 'admin');
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('ID:', result.lastInsertRowid);
    console.log('Email: admin@pdv.com');
    console.log('Senha: admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    db.close();
  }
}

createUser();
