-- Remove duplicatas de email mantendo apenas o mais recente
DELETE FROM users 
WHERE id NOT IN (
  SELECT MAX(id) FROM users GROUP BY email
);
