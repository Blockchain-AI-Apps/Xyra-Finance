import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID } from '../../utils/aleo-utils';
import type { InvoiceState } from './types';

interface CreditsPaymentDeps {
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

const getMicrocredits = (record: any): number => {
    try {
        if (record.data && record.data.microcredits) {
            return parseInt(record.data.microcredits.replace('u64', ''));
        }
        if (record.plaintext) {
            const match = record.plaintext.match(/microcredits:\s*([\d_]+)u64/);
            if (match && match[1]) {
                return parseInt(match[1].replace(/_/g, ''));
            }
        }
        return 0;
    } catch {
        return 0;
    }
};

export const createCreditsPayment = (deps: CreditsPaymentDeps) => {
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

    const payInvoiceCredits = async () => {
        if (!invoice || !publicKey || !executeTransaction || !requestRecords || !programId) return;

        try {
            setLoading(true);
            setStatus('Searching for suitable private record...');
            const records = await requestRecords('credits.aleo', false);
            console.log("Wallet Records (Initial):", records);
            const isDonation = invoice.invoiceType === 2;
            const parsedDonation = Number(donationAmount);
            const finalAmount = (isDonation && parsedDonation > 0) ? parsedDonation : invoice.amount;
            const amountMicro = Math.round(finalAmount * 1_000_000);

            const recordsAny = records as any[];
            let payRecord = null;

            const processRecord = async (r: any) => {
                let val = getMicrocredits(r);
                if (val === 0 && r.recordCiphertext && !r.plaintext && decrypt) {
                    try {
                        const decrypted = await decrypt(r.recordCiphertext);
                        if (decrypted) {
                            r.plaintext = decrypted;
                            val = getMicrocredits(r);
                        }
                    } catch (e) { console.warn("Decrypt failed:", e); }
                }
                return val;
            };

            for (const r of recordsAny) {
                if (r.spent) continue;
                const val = await processRecord(r);
                const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);
                if (isSpendable && val > amountMicro) {
                    payRecord = r;
                    break;
                }
            }

            let finalRecord = payRecord;

            if (!finalRecord) {
                setStatus('Syncing latest records...');
                await new Promise(r => setTimeout(r, 2000));
                const latestRecords = await requestRecords('credits.aleo', false);
                console.log("Wallet Records (Retry):", latestRecords);
                const latestRecordsAny = latestRecords as any[];

                for (const r of latestRecordsAny) {
                    if (r.spent) continue;
                    const val = await processRecord(r);
                    if (val >= amountMicro) {
                        finalRecord = r;
                        break;
                    }
                }

                if (finalRecord) {
                    setStatus('Records synced! Proceeding with payment...');
                } else {
                    setStep('CONVERT');
                    let totalBalance = 0;
                    for (const r of latestRecordsAny) {
                        if (!r.spent) totalBalance += await processRecord(r);
                    }
                    if (totalBalance >= amountMicro) {
                        setStatus(`Privacy Protocol requires a single record. Please convert to merge records.`);
                    } else {
                        setStatus(`Insufficient private balance. Please convert public credits.`);
                    }
                    setLoading(false);
                    return;
                }
            }

            console.log("Selected Pay Record:", finalRecord);
            let recordInput = finalRecord.plaintext;

            if (!recordInput) {
                console.warn("Record missing plaintext.");
                const nonce = finalRecord.nonce || finalRecord._nonce || finalRecord.data?._nonce;
                if (nonce) {
                    const microcredits = getMicrocredits(finalRecord.data);
                    const owner = finalRecord.owner;
                    recordInput = `{ owner: ${owner}.private, microcredits: ${microcredits}u64.private, _nonce: ${nonce}.public }`;
                } else if (finalRecord.ciphertext) {
                    recordInput = finalRecord.ciphertext;
                } else {
                    recordInput = finalRecord;
                }
            }

            setStatus('Requesting Payment Signature...');

            const funcName = isDonation ? 'pay_donation' : 'pay_invoice';

            const inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u64`,
                invoice.salt,
                paymentSecret || '0field',
                invoice.hash
            ];

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
                setStatus(`Transaction Broadcasted: ${result.transactionId}. Polling confirmation...`);
                await pollTransaction(result.transactionId);
            } else {
                throw new Error("Transaction failed.");
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Payment Failed');
            setLoading(false);
        }
    };

    return { payInvoiceCredits };
};
