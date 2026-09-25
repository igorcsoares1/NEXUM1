-- Adicionar campos de propriedade e contrato na tabela de frota
ALTER TABLE frota ADD COLUMN IF NOT EXISTS tipo_propriedade TEXT NOT NULL DEFAULT 'oficial';
ALTER TABLE frota ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES checklists(id) ON DELETE SET NULL;
