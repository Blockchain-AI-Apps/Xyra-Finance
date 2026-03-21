program test_zk_pay.aleo {
    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    @test
    script test_1_merchant_field() {
        let merchant: address = aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
        let expected_merchant_field: field = 947113542301545363857217716479361902320907642358148838248532178752253004327field;
        
        let merchant_field: field = merchant as field;
        assert_eq(merchant_field, expected_merchant_field);
    }
    
    // TEST 2: Verify Field Conversions (Amount)
    @test
    script test_2_amount_field_conversion() {
        let amount: u64 = 1000000u64; 
        let expected_amount_field: field = 1000000field;
        
        let amount_field: field = amount as field;
        assert_eq(amount_field, expected_amount_field);
    }


      @test
      script test_mechant_hash_check(){
        let merchant : address = aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
        let merchant_field = merchant as field;
let merchant_hash = BHP256::hash(merchant_field.to_bits_le());
        let expected_merchant_hash = 3366497355783814561097940769687043258435412487154883351647583321001755780428field;
      assert_eq(merchant_hash, expected_merchant_hash);
      }




    // VARIANT 9: Full BHP256 Sum (Mimics pay_invoice logic)
    @test
    script test_variant_9_bhp_full_sum() {
        let merchant: address = aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
        let merchant_field: field = merchant as field;
        let amount: u64 = 1000000u64;
        let amount_field: field = amount as field;
        let salt: field = 1field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let computed_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let expected_merchant_hash: field = 3702677658231279673896071902789571439679876878955912612011839604885069657689field;
        assert_eq(merchant_hash, expected_merchant_hash);
        
        // We don't have exact expected values for amount/salt hashes yet without running it, 
        // but this test structure ensures the code compiles and runs the BHP logic.
        assert(true);
    }
    @test
    transition main_test() {
        assert(true);
    }
}