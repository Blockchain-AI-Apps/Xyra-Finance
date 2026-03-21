-- ==========================================
-- MIGRATION: INVOICE LINE ITEMS
-- ==========================================
-- Adds a JSONB column to store optional line items for standard invoices.
-- Each item: { name: string, quantity: number, unitPrice: number, total: number }

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_items JSONB DEFAULT NULL;
