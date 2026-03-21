const SIGN_MESSAGE = 'NullPay-Burner-Wallet-Encryption-Key-v1';
async function deriveKeyFromSignature(signatureBytes: Uint8Array): Promise<CryptoKey> {
    // Hash the signature to get exactly 32 bytes for AES-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(signatureBytes));
    
    return crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptWithWallet(
    rawPrivateKey: string,
    signMessage: (message: string | Uint8Array) => Promise<Uint8Array | undefined>
): Promise<string> {
    // 1. Get deterministic signature from the wallet
    const signatureBytes = await signMessage(SIGN_MESSAGE);
    if (!signatureBytes) throw new Error('Wallet did not return a signature.');
    
    // 2. Derive AES key
    const aesKey = await deriveKeyFromSignature(signatureBytes);
    
    // 3. Generate a random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 4. Encrypt
    const encoded = new TextEncoder().encode(rawPrivateKey);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encoded
    );
    
    // 5. Combine IV + ciphertext → base64
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

export async function decryptWithWallet(
    encryptedBase64: string,
    signMessage: (message: string | Uint8Array) => Promise<Uint8Array | undefined>
): Promise<string> {

    const signatureBytes = await signMessage(SIGN_MESSAGE);
    if (!signatureBytes) throw new Error('Wallet did not return a signature.');
    const aesKey = await deriveKeyFromSignature(signatureBytes);
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
}
