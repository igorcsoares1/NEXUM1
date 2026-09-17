-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase para corrigir os erros de coluna faltando.

-- 1. Adiciona a coluna 'history' na tabela 'checklists' para o Histórico de Tramitação
ALTER TABLE checklists 
ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- 2. Garante que a coluna 'invoiceValue' (Valor da Nota) exista para o cálculo de consumo
ALTER TABLE checklists 
ADD COLUMN IF NOT EXISTS "invoiceValue" text;

-- 3. Adiciona a coluna 'currentSector' (Setor Atual) para o Histórico de Tramitação
ALTER TABLE checklists 
ADD COLUMN IF NOT EXISTS "currentSector" text;

-- 4. Adiciona colunas para Diárias na tabela 'dailyRecords'
ALTER TABLE "dailyRecords" 
ADD COLUMN IF NOT EXISTS "purpose" text,
ADD COLUMN IF NOT EXISTS "departureDate" text,
ADD COLUMN IF NOT EXISTS "returnDate" text;

-- 5. Criação da tabela de Logs de Atividade para Auditoria
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    "prefeituraId" TEXT DEFAULT '1'
);

-- 6. Adiciona colunas necessárias na tabela 'users' para controle avançado de acesso e auditoria
ALTER TABLE users 
ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "lastLogin" text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'visualizador',
ADD COLUMN IF NOT EXISTS password text DEFAULT '123',
ADD COLUMN IF NOT EXISTS "prefeituraId" text DEFAULT '1';

-- 7. Cria o usuário inicial (Super Admin) caso a tabela esteja vazia
-- Username: igor | Senha: 123
INSERT INTO users (id, name, username, password, email, role, status, department, "prefeituraId")
SELECT '1', 'Igor Tráfego Pago', 'igor', '123', 'trafegopagoigor@gmail.com', 'superadmin', 'ativo', 'Administração', '1'
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- 8. FORÇAR RECARGA DO SCHEMA (Importante para corrigir o erro de 'schema cache')
-- Execute este comando caso o erro persista mesmo após criar as colunas.
NOTIFY pgrst, 'reload schema';
