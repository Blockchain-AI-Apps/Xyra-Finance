import { Account, encryptRegistrationRequest, RecordCiphertext } from '@provablehq/sdk';
import type { PrivateBalances, ScannerSession } from './types';

// ─────────────────────────────────────────────
// Scanner session: auth, pubkey, registration
// ─────────────────────────────────────────────
export async function getScannerSession(decryptedBurnerKey: string): Promise<ScannerSession> {
    const scannerBase = import.meta.env.VITE_API_URL.replace('/api', '/api/scanner/testnet');
    const provableBaseProxy = import.meta.env.VITE_API_URL.replace('/api', '/api/proxy/provable');
    let scannerApiKey = import.meta.env.VITE_PROVABLE_SCANNER_API_KEY?.replace(/['"]/g, '').trim();
    const provableApiKey = import.meta.env.VITE_PROVABLE_API_KEY?.replace(/['"]/g, '').trim();
    const consumerId = import.meta.env.VITE_PROVABLE_CONSUMER_ID?.replace(/['"]/g, '').trim();

    // Check if the cached JWT is expired
    if (scannerApiKey && scannerApiKey.length > 50) {
        try {
            const base64Url = scannerApiKey.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            );
            if (Date.now() > JSON.parse(jsonPayload).exp * 1000 - 60000) scannerApiKey = '';
        } catch { scannerApiKey = ''; }
    }

    // Fetch fresh JWT if needed
    if (!scannerApiKey && consumerId && provableApiKey) {
        const jwtRes = await fetch(`${provableBaseProxy}/jwts/${consumerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Provable-API-Key': provableApiKey },
        });
        if (jwtRes.ok) {
            const auth = jwtRes.headers.get('authorization') || jwtRes.headers.get('Authorization');
            if (auth) scannerApiKey = auth.replace(/^Bearer\s+/i, '').trim();
        }
    }

    const scannerHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (scannerApiKey && scannerApiKey.length > 50) {
        scannerHeaders['Authorization'] = `Bearer ${scannerApiKey}`;
    } else if (provableApiKey) {
        scannerHeaders['X-Provable-API-Key'] = provableApiKey;
    }

    // Register the burner wallet's view key with the scanner
    const account = new Account({ privateKey: decryptedBurnerKey });
    const pubkeyRes = await fetch(`${scannerBase}/pubkey`, { method: 'GET', headers: scannerHeaders });
    if (!pubkeyRes.ok) throw new Error(`Scanner auth failed: ${pubkeyRes.status}`);
    const pubkey = await pubkeyRes.json();

    const ciphertext = encryptRegistrationRequest(pubkey.public_key, account.viewKey(), 0);
    const regRes = await fetch(`${scannerBase}/register/encrypted`, {
        method: 'POST', headers: scannerHeaders,
        body: JSON.stringify({ key_id: pubkey.key_id, ciphertext }),
    });
    if (!regRes.ok) throw new Error(`Scanner registration failed: ${regRes.status}`);
    const { uuid: scannerUuid } = await regRes.json();

    return { scannerBase, scannerHeaders, scannerUuid, account };
}

// ─────────────────────────────────────────────
// Scan one program and sum the token balance
// ─────────────────────────────────────────────
export async function scanProgramBalance(
    session: ScannerSession,
    programFilter: string,
    recordName: string,
): Promise<number> {
    const { scannerBase, scannerHeaders, scannerUuid, account } = session;
    try {
        console.group(`[BalanceScan] Scanning ${programFilter} / ${recordName}`);
        const res = await fetch(`${scannerBase}/records/owned`, {
            method: 'POST', headers: scannerHeaders,
            body: JSON.stringify({ uuid: scannerUuid, unspent: true, decrypt: true, filter: { program: programFilter, record: recordName } }),
        });
        console.log(`[BalanceScan] HTTP ${res.status} for ${programFilter}`);
        if (!res.ok) { console.groupEnd(); return 0; }

        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data?.data || [];
        console.log(`[BalanceScan] Got ${list.length} raw record(s) for ${programFilter}`);

        let total = 0;
        for (let i = 0; i < list.length; i++) {
            const rec = list[i];
            try {
                // The scanner ignores the program filter server-side — use program_name field
                const recProgram: string = rec.program_name || rec.program || rec.program_id || rec.transition?.program || '';
                console.log(`[BalanceScan] Record[${i}] program_name="${recProgram}" expected="${programFilter}"`, {
                    record_name: rec.record_name, commitment: rec.commitment?.substring(0, 20),
                });
                if (recProgram && recProgram !== programFilter) {
                    console.warn(`[BalanceScan] Record[${i}] SKIP — belongs to "${recProgram}"`);
                    continue;
                }

                if (!rec.record_plaintext && rec.record_ciphertext) {
                    const ct = RecordCiphertext.fromString(rec.record_ciphertext);
                    rec.record_plaintext = ct.decrypt(account.viewKey()).toString();
                }
                const pt: string = rec.record_plaintext || '';
                if (!pt) continue;

                if (programFilter === 'credits.aleo') {
                    const m = pt.match(/microcredits\s*:\s*(\d+)u64/);
                    if (m) { total += Number(m[1]); console.log(`[BalanceScan] Record[${i}] credits += ${m[1]}`); }
                } else {
                    const hasAmount = /amount\s*:\s*\d+u128/.test(pt);
                    const hasInvoice = /invoice_hash/.test(pt);
                    if (hasAmount && !hasInvoice) {
                        const m = pt.match(/amount\s*:\s*(\d+)u128/);
                        if (m) { total += Number(m[1]); console.log(`[BalanceScan] Record[${i}] amount += ${m[1]}`); }
                    } else {
                        console.log(`[BalanceScan] Record[${i}] SKIP — not a valid Token (hasAmount=${hasAmount}, hasInvoice=${hasInvoice})`);
                    }
                }
            } catch (recErr) {
                console.warn(`[BalanceScan] Record[${i}] error:`, recErr);
            }
        }
        console.log(`[BalanceScan] TOTAL for ${programFilter}: ${total} micros (= ${total / 1_000_000})`);
        console.groupEnd();
        return total;
    } catch (e) {
        console.warn(`[BalanceScan] Error scanning ${programFilter}:`, e);
        console.groupEnd();
        return 0;
    }
}

// ─────────────────────────────────────────────
// Fetch all three private token balances
// ─────────────────────────────────────────────
export async function fetchAllPrivateBalances(decryptedBurnerKey: string): Promise<PrivateBalances> {
    const session = await getScannerSession(decryptedBurnerKey);
    // Run sequentially — scanner UUID session is not safe for concurrent requests
    const aleoMicro  = await scanProgramBalance(session, 'credits.aleo', 'credits');
    const usdcxMicro = await scanProgramBalance(session, 'test_usdcx_stablecoin.aleo', 'Token');
    const usadMicro  = await scanProgramBalance(session, 'test_usad_stablecoin.aleo', 'Token');
    return {
        ALEO:  aleoMicro  / 1_000_000,
        USDCx: usdcxMicro / 1_000_000,
        USAD:  usadMicro  / 1_000_000,
    };
}

// ─────────────────────────────────────────────
// Find a single record to spend during sweep
// ─────────────────────────────────────────────
export async function findSpendableRecord(
    session: ScannerSession,
    programFilter: string,
    recordName: string,
    microcreditsRequired: number,
    isCredits: boolean,
): Promise<string | null> {
    const { scannerBase, scannerHeaders, scannerUuid, account } = session;
    const res = await fetch(`${scannerBase}/records/owned`, {
        method: 'POST', headers: scannerHeaders,
        body: JSON.stringify({ uuid: scannerUuid, unspent: true, decrypt: true, filter: { program: programFilter, record: recordName } }),
    });
    if (res.status === 422) throw new Error('Scanner UUID expired. Please try again.');
    if (!res.ok) throw new Error(`Records fetch failed: ${await res.text()}`);
    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data?.data || [];

    for (const rec of list) {
        try {
            const recProgram: string = rec.program_name || rec.program || '';
            if (recProgram && recProgram !== programFilter) continue;

            if (!rec.record_plaintext && rec.record_ciphertext) {
                const ct = RecordCiphertext.fromString(rec.record_ciphertext);
                rec.record_plaintext = ct.decrypt(account.viewKey()).toString();
            }
            const pt: string = rec.record_plaintext || '';
            if (!pt) continue;

            if (isCredits) {
                const m = pt.match(/microcredits\s*:\s*(\d+)u64/);
                if (m && Number(m[1]) >= microcreditsRequired) return pt.trim();
            } else {
                if (/amount\s*:\s*\d+u128/.test(pt) && !/invoice_hash/.test(pt)) {
                    const m = pt.match(/amount\s*:\s*(\d+)u128/);
                    if (m && Number(m[1]) >= microcreditsRequired) return pt.trim();
                }
            }
        } catch { /* skip unreadable records */ }
    }
    return null;
}
