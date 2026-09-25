-- Tabela de Frota Municipal
CREATE TABLE IF NOT EXISTS frota (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prefeituraId TEXT NOT NULL,
    nome TEXT NOT NULL,
    placa TEXT NOT NULL,
    ano TEXT NOT NULL,
    secretaria TEXT NOT NULL,
    km_atual TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'em_dia',
    observacao TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Ocorrências da Frota
CREATE TABLE IF NOT EXISTS frota_ocorrencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frota_id UUID REFERENCES frota(id) ON DELETE CASCADE,
    prefeituraId TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    pecas TEXT,
    custo TEXT,
    km TEXT NOT NULL,
    status_resultado TEXT NOT NULL,
    registrado_por TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE frota ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (ajustar conforme necessário para produção)
CREATE POLICY "Acesso total frota" ON frota FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total ocorrencias" ON frota_ocorrencias FOR ALL USING (true) WITH CHECK (true);
