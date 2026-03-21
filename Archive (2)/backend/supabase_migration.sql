-- CRITICAL FIX: Allow block_height to be nullable
-- This is required because new invoices are saved before they are mined into a block.
ALTER TABLE invoices ALTER COLUMN block_height DROP NOT NULL;

-- 1. Add new columns if they don't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS merchant_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_transaction_id TEXT;
-- We will now use payment_tx_ids (ARRAY) instead of payment_tx_id (TEXT).
-- This migration step handles the conversion.

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_merchant_address ON invoices(merchant_address);
CREATE INDEX IF NOT EXISTS idx_payer_address ON invoices(payer_address);
CREATE INDEX IF NOT EXISTS idx_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_transaction_id ON invoices(invoice_transaction_id);


-- ==========================================
-- MIGRATION: FUNDRAISING & MULTI-PAYMENTS
-- ==========================================

-- 1. Add invoice_type (0 = Standard, 1 = Fundraising)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type SMALLINT DEFAULT 0;

-- 2. Add salt column (Critical for verification)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS salt TEXT;

-- 3. Modify payment_tx_id to be an array and rename it
-- We checks if the column is NOT already an array (type 1009 is usually _text array in pg_type)
-- Or simpler: Check if it exists as TEXT first.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_tx_id' AND data_type = 'text') THEN
        ALTER TABLE invoices 
        ALTER COLUMN payment_tx_id TYPE text[] 
        USING CASE 
            WHEN payment_tx_id IS NULL THEN NULL 
            ELSE ARRAY[payment_tx_id] 
        END;
        
        ALTER TABLE invoices RENAME COLUMN payment_tx_id TO payment_tx_ids;
    END IF;
END $$;

-- If the column was possibly already named payment_tx_ids but not explicitly handled above:
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_tx_ids TEXT[];

-- 4. Index for the new array column (GIN is best for array containment queries)
CREATE INDEX IF NOT EXISTS idx_payment_tx_ids ON invoices USING GIN (payment_tx_ids);

-- ==========================================
-- MIGRATION: PROFILE QR (USERS TABLE)
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_main_invoice_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_burner_invoice_hash TEXT;
