# AleoZKPay Smart Contract (Wave 1)

## Overview
Privacy-preserving invoice and payment system built on Aleo blockchain using zero-knowledge proofs.

## Contract: `zk_pay.aleo`

### Functions

#### 1. `create_invoice(invoice_hash: field)`
**Who calls it**: Merchant  
**What it does**: Registers an invoice hash on-chain with PENDING status  
**Privacy**: Hash is public, but amount/merchant/salt remain private (off-chain in the link)

**Example**:
```bash
leo run create_invoice 123456789field
```

#### 2. `pay_invoice(merchant, amount, salt, invoice_hash)`
**Who calls it**: User  
**What it does**: Pays an invoice by providing merchant address, amount, and salt  
**Privacy**: ZK proof verifies hash matches without revealing private data  

**Example**:
```bash
leo run pay_invoice \
  aleo1merchant...abc \
  100u64 \
  random_salt_123field \
  123456789field
```

#### 3. `get_invoice_status(invoice_hash)` (Optional)
**Who calls it**: Anyone  
**What it does**: Queries invoice payment status  
**Note**: Typically done via direct mapping queries to Aleo RPC

---

## Build & Deploy

### 1. Build Locally
```bash
cd contracts/zk_pay
leo build
```

### 2. Test Locally
```bash
# Create invoice
leo run create_invoice 999field

# Pay invoice (replace with actual values)
leo run pay_invoice aleo1... 100u64 salt123field 999field
```

### 3. Deploy to Testnet
```bash
# Make sure you have testnet credits first!
leo deploy --network testnet
```

### 4. Execute on Testnet
```bash
# Create invoice
leo execute create_invoice 999field --network testnet

# Pay invoice
leo execute pay_invoice aleo1... 100u64 salt123field 999field --network testnet
```

---

## How It Works

### Invoice Creation Flow
1. Merchant generates: `hash = Poseidon4::hash_to_field(merchant, amount, salt, 0field)`
2. Frontend creates link: `aleozkpay.com/pay?merchant=...&amount=...&salt=...&hash=...`
3. Smart contract stores: `invoices[hash] = 0` (PENDING)

### Payment Flow
1. User opens payment link (sees merchant, amount, salt)
2. User wallet generates ZK proof: "I know values that hash to `hash`"
3. Smart contract verifies proof and transfers credits
4. Smart contract updates: `invoices[hash] = 1` (SETTLED)

---

## Privacy Guarantees

| Data | Public (On-Chain) | Private |
|---|---|---|
| Invoice Hash | ✅ | |
| Invoice Status | ✅ | |
| Amount | | ✅ |
| Merchant Address | | ✅ |
| Payer Address | | ✅ |

---

## Dependencies
- `credits.aleo` (mainnet) - Aleo's native credit transfer program
