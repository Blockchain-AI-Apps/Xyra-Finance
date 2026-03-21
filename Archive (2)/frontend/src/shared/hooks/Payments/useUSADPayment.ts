import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID } from '../../utils/aleo-utils';
import type { InvoiceState } from './types';

interface USADPaymentDeps {
    invoice: InvoiceState | null;
    publicKey: string | null | undefined;
    executeTransaction: any;
    requestRecords: any;
    decrypt: any;
    programId: string | null;
    donationAmount: string;
    paymentSecret: string | null;
    setLoading: (v: boolean) => void;
    setStatus: (v: string) => void;
    setError: (v: string | null) => void;
    setStep: (v: any) => void;
    setTxId: (v: string | null) => void;
    pollTransaction: (txId: string) => Promise<void>;
}

export const createUSADPayment = (deps: USADPaymentDeps) => {
    const {
        invoice,
        publicKey,
        executeTransaction,
        requestRecords,
        decrypt,
        programId,
        donationAmount,
        paymentSecret,
        setLoading,
        setStatus,
        setError,
        setStep,
        setTxId,
        pollTransaction
    } = deps;

    const payInvoiceUSAD = async () => {
        if (!invoice || !publicKey || !executeTransaction || !requestRecords || !programId) return;

        try {
            setLoading(true);
            setStatus('Syncing USAD Records...');

            const usadProgramId = 'test_usad_stablecoin.aleo';

            const processUSADRecord = async (r: any): Promise<bigint> => {
                try {
                    if (r.data && r.data.amount) return BigInt(r.data.amount.replace('u128', ''));
                    if (r.plaintext) {
                        const match = r.plaintext.match(/amount:\s*([\d_]+)u128/);
                        if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
                    }

                    if (r.recordCiphertext && !r.plaintext && decrypt) {
                        try {
                            const decrypted = await decrypt(r.recordCiphertext);
                            if (decrypted) {
                                console.log("Decrypted USAD Record:", decrypted);
                                r.plaintext = decrypted;
                                const match = decrypted.match(/amount:\s*([\d_]+)u128/);
                                if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
                            }
                        } catch (e) { console.warn("USAD Decrypt failed", e); }
                    }
                    return BigInt(0);
                } catch { return BigInt(0); }
            };

            let records = await requestRecords(usadProgramId, false);
            console.log("USAD Records (Initial):", records);

            const isDonation = invoice.invoiceType === 2;
            const parsedDonation = Number(donationAmount);
            const finalAmount = (isDonation && parsedDonation > 0) ? parsedDonation : invoice.amount;
            const amountMicro = BigInt(Math.round(finalAmount * 1_000_000));

            let recordsAny = records as any[];
            let payRecord = null;
            for (const r of recordsAny) {
                if (r.spent) continue;
                const val = await processUSADRecord(r);
                if (val >= amountMicro) {
                    payRecord = r;
                    break;
                }
            }

            if (!payRecord) {
                setStatus('Syncing latest USAD records...');
                await new Promise(r => setTimeout(r, 2000));
                records = await requestRecords(usadProgramId, false);
                console.log("USAD Records (Retry):", records);
                recordsAny = records as any[];
                let totalAvailable = BigInt(0);

                for (const r of recordsAny) {
                    if (r.spent) continue;
                    const val = await processUSADRecord(r);
                    totalAvailable += val;

                    if (!payRecord && val >= amountMicro) {
                        payRecord = r;
                    }
                }

                if (!payRecord) {
                    setStep('CONVERT');
                    if (totalAvailable >= amountMicro) {
                        setStatus(`Privacy Protocol requires a single record. Please convert to merge records.`);
                    } else {
                        setStatus(`Insufficient private balance. Please convert public USAD.`);
                    }
                    setLoading(false);
                    return;
                }
            }

            setStatus('Fetching Freeze List State...');
            const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex } = await import('../../utils/aleo-utils');

            const root = await getFreezeListRoot();
            const count = await getFreezeListCount();
            const firstIndex = await getFreezeListIndex(0);
            console.log(`Freeze List State -> Root: ${root}, Count: ${count}, Index[0]: ${firstIndex}`);
            const { generateFreezeListProof } = await import('../../utils/aleo-utils');
            const { Address } = await import('@provablehq/wasm');

            let index0FieldStr = undefined;
            if (firstIndex) {
                try {
                    const addr = Address.from_string(firstIndex);
                    const grp = addr.toGroup();
                    const x = grp.toXCoordinate();
                    index0FieldStr = x.toString();
                } catch (e) { console.warn("Failed to convert address to field", e); }
            } else {
                console.warn("firstIndex was null or undefined, proceeding with undef for occupied value");
            }
            const proof = await generateFreezeListProof(1, index0FieldStr);

            console.log("Generated Merkle Proof (Right Edge / Index 1):", proof);
            const proofsInput = `[${proof}, ${proof}]`;

            let recordInput = payRecord.plaintext;
            if (!recordInput) {
                if (payRecord.ciphertext) {
                    recordInput = payRecord.ciphertext;
                } else {
                    setError("Could not read record plaintext.");
                    setLoading(false);
                    return;
                }
            }

            setStatus('Requesting USAD Payment Signature...');

            const inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u128`,
                invoice.salt,
                paymentSecret || '0field',
                invoice.hash,
                proofsInput
            ];

            const funcName = isDonation ? 'pay_donation_usad' : 'pay_invoice_usad';

            console.log("Transaction Inputs:", JSON.stringify(inputs, null, 2));

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: funcName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`USAD Payment Broadcasted: ${result.transactionId}. Polling...`);
                await pollTransaction(result.transactionId);
            } else {
                throw new Error("Transaction failed.");
            }

        } catch (e: any) {
            console.error("USAD Payment Error:", e);
            setError(e.message || 'USAD Payment Failed');
            setLoading(false);
        }
    };

    return { payInvoiceUSAD };
};
