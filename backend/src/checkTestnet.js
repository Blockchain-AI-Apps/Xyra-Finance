import 'dotenv/config';
import fetch from 'node-fetch';

const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://testnetbeta.aleorpc.com';

/**
 * Verify backend can reach the Aleo testnet (Provable RPC).
 * Tries getMappingValue (same as frontend) then a generic POST if needed.
 * @returns {{ ok: boolean, message: string, url: string, detail?: any }}
 */
export async function checkTestnetConnection() {
  const url = ALEO_RPC_URL;
  // 1) Try getMappingValue (same RPC the app uses for credits.aleo)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getMappingValue',
        params: {
          program_id: 'credits.aleo',
          mapping_name: 'account',
          key: process.env.VAULT_ADDRESS || 'aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr',
        },
      }),
    });
    const text = await res.text();
    let detail;
    try {
      detail = JSON.parse(text);
    } catch {
      detail = text;
    }
    if (res.ok && !detail?.error) {
      return {
        ok: true,
        message: 'Connected to testnet (getMappingValue ok)',
        url,
        detail,
      };
    }
    if (res.ok && detail?.error) {
      // RPC reached but e.g. key not found – still means we're connected
      return {
        ok: true,
        message: 'Connected to testnet (RPC responded)',
        url,
        detail,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `RPC returned HTTP ${res.status}`,
        url,
        detail,
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: err.message || String(err),
      url,
      detail: err,
    };
  }
  return { ok: false, message: 'Unknown error', url };
}

/**
 * Log testnet connection status to console.
 */
export async function logTestnetStatus() {
  const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://testnetbeta.aleorpc.com';
  console.log('🔗 Checking testnet connection...');
  console.log('   RPC URL:', ALEO_RPC_URL);
  const result = await checkTestnetConnection();
  if (result.ok) {
    console.log('   ✅', result.message);
    if (result.detail?.result != null) {
      console.log('   Latest block height:', result.detail.result);
    }
  } else {
    console.log('   ❌ Not connected:', result.message);
    if (result.detail) {
      console.log('   Detail:', typeof result.detail === 'object' ? JSON.stringify(result.detail).slice(0, 200) : result.detail);
    }
  }
  return result;
}

// Run when executed directly: node src/checkTestnet.js
if (process.argv[1]?.includes('checkTestnet.js')) {
  logTestnetStatus()
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
