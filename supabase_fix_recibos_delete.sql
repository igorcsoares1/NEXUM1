-- ==============================================================================
-- SCRIPT DE CORREÇÃO: PERMISSÕES DE EXCLUSÃO PARA RECIBOS DIGITAIS E CONFIRMAÇÕES
-- ==============================================================================
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)
-- Este script garante que o usuário anônimo (anon) e autenticado possam excluir e atualizar
-- registros nas tabelas recibos_digitais e checklist_confirmacoes.

-- 1. Conceder permissões de tabela para anon, authenticated e service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.recibos_digitais TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.checklist_confirmacoes TO anon, authenticated, service_role;

-- 2. Configurar Row Level Security (RLS) para 'recibos_digitais'
ALTER TABLE public.recibos_digitais ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de recibos" ON public.recibos_digitais;
DROP POLICY IF EXISTS "Permitir criacao de recibos" ON public.recibos_digitais;
DROP POLICY IF EXISTS "Permitir exclusao de recibos" ON public.recibos_digitais;
DROP POLICY IF EXISTS "Permitir atualizacao de recibos" ON public.recibos_digitais;
DROP POLICY IF EXISTS "Permitir tudo em recibos_digitais" ON public.recibos_digitais;

-- Criar política permissiva para todas as operações
CREATE POLICY "Permitir tudo em recibos_digitais"
ON public.recibos_digitais
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Configurar Row Level Security (RLS) para 'checklist_confirmacoes'
ALTER TABLE public.checklist_confirmacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção pública de confirmações" ON public.checklist_confirmacoes;
DROP POLICY IF EXISTS "Permitir leitura pública de confirmações" ON public.checklist_confirmacoes;
DROP POLICY IF EXISTS "Permitir exclusao de confirmacoes" ON public.checklist_confirmacoes;
DROP POLICY IF EXISTS "Permitir tudo em checklist_confirmacoes" ON public.checklist_confirmacoes;

CREATE POLICY "Permitir tudo em checklist_confirmacoes"
ON public.checklist_confirmacoes
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
