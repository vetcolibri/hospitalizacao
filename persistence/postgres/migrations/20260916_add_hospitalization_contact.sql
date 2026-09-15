-- RF-13 — contacto específico opcional por hospitalização.
--
-- Migração estritamente aditiva: as três colunas começam nullable, pelo que
-- todas as hospitalizações já existentes continuam a usar o tutor principal
-- (contacto nulo = sem excepção). Nenhum registo legado é alterado.
--
-- As colunas são, no máximo, o mesmo que a ficha do tutor (VARCHAR(50)/VARCHAR(9))
-- e o CHECK garante que a excepção é completa ou nula: nunca fica um nome sem
-- telefone, nem um WhatsApp sem contacto, o que tornaria o fallback ambíguo.
--
-- Idempotente: pode ser aplicada mais de uma vez.

BEGIN;

ALTER TABLE hospitalizations ADD COLUMN IF NOT EXISTS contact_name VARCHAR(50);
ALTER TABLE hospitalizations ADD COLUMN IF NOT EXISTS contact_phone_number VARCHAR(9);
ALTER TABLE hospitalizations ADD COLUMN IF NOT EXISTS contact_whatsapp BOOLEAN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_hospitalizations_contact_complete'
    ) THEN
        ALTER TABLE hospitalizations
            ADD CONSTRAINT chk_hospitalizations_contact_complete
            CHECK (
                (contact_name IS NULL AND contact_phone_number IS NULL AND contact_whatsapp IS NULL)
                OR
                (contact_name IS NOT NULL AND contact_phone_number IS NOT NULL AND contact_whatsapp IS NOT NULL)
            );
    END IF;
END
$$;

COMMIT;
