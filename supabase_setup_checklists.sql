-- SCRIPT PARA CONFIGURAÇÃO DA TABELA DE CONFIRMAÇÕES DE CHECKLIST
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Criar a tabela de confirmações se não existir
CREATE TABLE IF NOT EXISTS public.checklist_confirmacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE,
    nome_confirmante TEXT NOT NULL,
    data_confirmacao TIMESTAMPTZ DEFAULT now(),
    "prefeituraId" TEXT DEFAULT '1',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Se a tabela já existir sem a coluna prefeituraId, adiciona-a
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'checklist_confirmacoes' AND COLUMN_NAME = 'prefeituraId') THEN
        ALTER TABLE public.checklist_confirmacoes ADD COLUMN "prefeituraId" TEXT DEFAULT '1';
    END IF;
    
    -- Remover coluna ip se ainda existir
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'checklist_confirmacoes' AND COLUMN_NAME = 'ip') THEN
        ALTER TABLE public.checklist_confirmacoes DROP COLUMN ip;
    END IF;
END $$;

-- 2. Habilitar RLS (Row Level Security) em ambas as tabelas
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_confirmacoes ENABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões de esquema e tabela para o papel 'anon' (público)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.checklists TO anon;
GRANT SELECT, INSERT ON public.checklist_confirmacoes TO anon;

-- 4. Políticas de Segurança para checklists (Leitura pública)
DROP POLICY IF EXISTS "Permitir leitura pública de checklists" ON public.checklists;
CREATE POLICY "Permitir leitura pública de checklists" 
ON public.checklists 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 5. Políticas de Segurança para confirmações
DROP POLICY IF EXISTS "Permitir inserção pública de confirmações" ON public.checklist_confirmacoes;
CREATE POLICY "Permitir inserção pública de confirmações" 
ON public.checklist_confirmacoes 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura pública de confirmações" ON public.checklist_confirmacoes;
CREATE POLICY "Permitir leitura pública de confirmações" 
ON public.checklist_confirmacoes 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_checklist_confirmacoes_checklist_id ON public.checklist_confirmacoes(checklist_id);

-- NOTA: Execute todo este script para garantir que as permissões de acesso público estejam corretas.