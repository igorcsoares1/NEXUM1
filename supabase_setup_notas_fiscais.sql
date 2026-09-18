-- Tabela para Notas Fiscais
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_nota TEXT NOT NULL,
    fornecedor TEXT NOT NULL,
    valor TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    contrato_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    observacao TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido')),
    enviado_por TEXT NOT NULL,
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recebido_por TEXT,
    recebido_em TIMESTAMP WITH TIME ZONE,
    prefeituraId UUID REFERENCES public.prefeituras(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Permitir leitura para todos autenticados" ON public.notas_fiscais
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para todos autenticados" ON public.notas_fiscais
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para todos autenticados" ON public.notas_fiscais
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir exclusão para administradores" ON public.notas_fiscais
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.uid = auth.uid()
            AND (users.role = 'admin' OR users.role = 'superadmin')
        )
    );
