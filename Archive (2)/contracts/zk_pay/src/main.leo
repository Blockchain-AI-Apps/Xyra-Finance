import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_v20.aleo {
    
    @admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8, // 0 = Open, 1 = Settled/Paid
        invoice_type: u8, // 0 = Standard, 1 = Multi Pay, 2 = Donation
        token_type: u8, // 0 = Credits, 1 = USDCx, 2 = USAD
        wallet_type: u8 // 0 = Main Wallet, 1 = Burner Wallet
    }

    record PayerReceipt {
        owner: address,       // The Payer
        merchant: address,    // The Merchant
        receipt_hash: field,  // Unique Payment ID (Hash of secret + salt)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Paid (u64 for Credits/USDCx standard)
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        timestamp: u64,       // Approximate block time or 0 if not available
    }

    record MerchantReceipt {
        owner: address,       // The Merchant
        receipt_hash: field,  // Unique Payment ID (Matches Payer's receipt_hash)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Received
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
    }

    record Invoice {
        owner: address,       // Merchant
        invoice_hash: field,
        amount: u64,          // Amount
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        invoice_type: u8,     // 0 = Standard, 1 = Multi Pay
        salt: field,          // For checking against hash
        memo: field,          // Encoded Memo (max ~31 chars)
        wallet_type: u8,      // 0 = Main Wallet, 1 = Burner Wallet
    }

    record BurnerWalletRecord {
        owner: address,
        burner_address: address,
        password_part: field,
        pk_part_1: field,
        pk_part_2: field,
        pk_part_3: field,
        pk_part_4: field,
        pk_part_5: field,
        pk_part_6: field,
        pk_part_7: field,
        pk_part_8: field,
        pk_part_9: field,
        pk_part_10: field
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;

    // Transition to permanently backup encrypted Burner Wallet credentials on-chain
    transition backup_burner_wallet(
        private burner_address: address,
        private password_part: field,
        private pk_part_1: field,
        private pk_part_2: field,
        private pk_part_3: field,
        private pk_part_4: field,
        private pk_part_5: field,
        private pk_part_6: field,
        private pk_part_7: field,
        private pk_part_8: field,
        private pk_part_9: field,
        private pk_part_10: field
    ) -> BurnerWalletRecord {
        return BurnerWalletRecord {
            owner: self.caller,
            burner_address: burner_address,
            password_part: password_part,
            pk_part_1: pk_part_1,
            pk_part_2: pk_part_2,
            pk_part_3: pk_part_3,
            pk_part_4: pk_part_4,
            pk_part_5: pk_part_5,
            pk_part_6: pk_part_6,
            pk_part_7: pk_part_7,
            pk_part_8: pk_part_8,
            pk_part_9: pk_part_9,
            pk_part_10: pk_part_10
        };
    }

    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo,
            wallet_type: wallet_type
        };

        // Default token_type 0 for Credits
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 0u8, wallet_type));
    }

    async transition create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        // Note: Casting amount to u64 for the record for consistency, 
        // assuming standard UX amounts won't overflow u64 easily even for USDCx (which has 6 decimals usually).
        // If high precision is needed, we might need to adjust record or keep u128. 
        // However, standard `PayerReceipt` uses u64. Let's stick to u64 for uniformity in display if possible,
        // or we need to change Invoice record to u128.
        // Given USDC has 6 decimals, u64 max is ~18 trillion units, which is 18 million USDC. 
        // Wait, u64 max is 1.8e19. USDC with 6 decimals: 1.8e13 USDC. usage is fine.
        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 1u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 1 for USDCx
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 1u8, wallet_type));
    }

    async transition create_invoice_usad(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 2u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 2 for USAD
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 2u8, wallet_type));
    }

    async transition create_invoice_any(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 3u8,
            invoice_type: invoice_type,
            salt: salt,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 3 for ANY
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 3u8, wallet_type));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field,
        invoice_type: u8,
        token_type: u8,
        wallet_type: u8
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8,
            invoice_type: invoice_type,
            token_type: token_type,
            wallet_type: wallet_type
        };

        invoices.set(invoice_hash, invoice_data);
        salt_to_invoice.set(salt, invoice_hash);
    }

    async transition pay_donation(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount_to_donate: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount_to_donate);
        
        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0
        let amount_field: field = 0u64 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(0u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate, // Actual donated amount
            token_type: 0u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate, // Actual donated amount
            token_type: 0u8
        };

        // Pass 0u8 as expected_token_type for Credits
        let f0: Future = finalize_pay_donation(invoice_hash, salt, 0u8);
        return (r1, r2, payer_receipt, merchant_receipt, f0);
    }

    async function finalize_pay_donation(
        invoice_hash: field,
        salt: field,
        expected_token_type: u8
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        if invoice_data.token_type != 3u8 {
            assert_eq(invoice_data.token_type, expected_token_type);
        }
        
        // Ensure it is a Donation Invoice (Type 2)
        assert_eq(invoice_data.invoice_type, 2u8);

        // Enforce Status is Open (0)
        assert_eq(invoice_data.status, 0u8);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }
        
        // Donation invoices remain "Open" (status 0) indefinitely like Multi-Pay, 
        // or we can treat them same as Multi-Pay (no status change to 1).
    }

    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount);
        
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            timestamp: 0u64 // Placeholder as block.timestamp is not available in transition
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8
        };

        // Pass 0u8 as expected_token_type for Credits
        let f0: Future = finalize_pay_invoice(invoice_hash, salt, amount as u128, 0u8);
        return (r1, r2, payer_receipt, merchant_receipt, f0);
    }

    async transition pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8
        };

        // Pass 1u8 as expected_token_type for USDCx
        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, salt, amount, 1u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }

    async transition pay_invoice_usad(
        pay_record: test_usad_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) = 
            test_usad_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 2u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 2u8
        };

        // Pass 2u8 as expected_token_type for USAD
        let f0: Future = finalize_pay_invoice_usad(invoice_hash, salt, amount, 2u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }

    async transition pay_donation_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount_to_donate: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount_to_donate, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0 (u128)
        let amount_field: field = 0u128 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(1u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64, // Cast to u64 for receipt consistency
            token_type: 1u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 1u8
        };

        let f0: Future = finalize_pay_donation_usdcx(invoice_hash, salt, 1u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }

    async transition pay_donation_usad(
        pay_record: test_usad_stablecoin.aleo/Token,
        merchant: address,
        amount_to_donate: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) = 
            test_usad_stablecoin.aleo/transfer_private(merchant, amount_to_donate, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0 (u128)
        let amount_field: field = 0u128 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(2u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64, // Cast to u64 for receipt consistency
            token_type: 2u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 2u8
        };

        let f0: Future = finalize_pay_donation_usad(invoice_hash, salt, 2u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }

    async function finalize_pay_donation_usdcx(
        invoice_hash: field,
        salt: field,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        if invoice_data.token_type != 3u8 {
            assert_eq(invoice_data.token_type, expected_token_type);
        }

        // Ensure it is a Donation Invoice (Type 2)
        assert_eq(invoice_data.invoice_type, 2u8);

        // Enforce Status is Open (0)
        assert_eq(invoice_data.status, 0u8);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }
    }

    async function finalize_pay_donation_usad(
        invoice_hash: field,
        salt: field,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        if invoice_data.token_type != 3u8 {
            assert_eq(invoice_data.token_type, expected_token_type);
        }

        // Ensure it is a Donation Invoice (Type 2)
        assert_eq(invoice_data.invoice_type, 2u8);

        // Enforce Status is Open (0)
        assert_eq(invoice_data.status, 0u8);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }
    }


    async function finalize_pay_invoice_usdcx(
        invoice_hash: field,
        salt: field,
        amount: u128,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Enforce Status is Open (0) for ALL types
        assert_eq(invoice_data.status, 0u8);

        if (invoice_data.invoice_type == 0u8) {
             // For Standard Invoices (0), we auto-settle (set to 1)
             // No need to check status here again as we checked above
             
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
                wallet_type: invoice_data.wallet_type
            };
            invoices.set(stored_hash, updated_data);
        }
    }

    async function finalize_pay_invoice_usad(
        invoice_hash: field,
        salt: field,
        amount: u128,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Enforce Status is Open (0) for ALL types
        assert_eq(invoice_data.status, 0u8);

        if (invoice_data.invoice_type == 0u8) {
             // For Standard Invoices (0), we auto-settle (set to 1)
             // No need to check status here again as we checked above
             
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
                wallet_type: invoice_data.wallet_type
            };
            invoices.set(stored_hash, updated_data);
        }
    }

    async function finalize_pay_invoice(
        invoice_hash: field,
        salt: field,
        amount: u128,
        expected_token_type: u8
    ) {

        
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Enforce Status is Open (0) for ALL types - including Multipay
        assert_eq(invoice_data.status, 0u8);

        if (invoice_data.invoice_type == 0u8) {
             // For Standard Invoices (0), we auto-settle (set to 1)
             
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
                wallet_type: invoice_data.wallet_type
            };
            invoices.set(stored_hash, updated_data);
        }
    }

    async transition settle_invoice(
        public salt: field,
        private amount: u64
    ) -> (Future) {
        let merchant_field: field = self.caller as field;
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let calculated_hash: field = merchant_hash + amount_hash + salt_hash;
        
        return finalize_settle_invoice(calculated_hash, salt);
    }

    async function finalize_settle_invoice(
        calculated_hash: field,
        salt: field
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(calculated_hash, stored_hash);
        
        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type,
            token_type: invoice_data.token_type,
            wallet_type: invoice_data.wallet_type
        };
        
        invoices.set(stored_hash, updated_data);
    }

    async transition get_invoice_status(
        public invoice_hash: field
    ) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }

    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
    }
}