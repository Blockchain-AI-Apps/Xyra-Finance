const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Validate key
if (!process.env.ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY is not set in .env file');
}

const getKey = () => {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) throw new Error('ENCRYPTION_KEY not found');
    return Buffer.from(keyHex, 'hex');
};

const encrypt = (text) => {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        // Return as IV:TAG:ENCRYPTED
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
};

const decrypt = (text) => {
    if (!text) return null;
    try {
        const parts = text.split(':');
        if (parts.length !== 3) {
            // Assume it might be legacy unencrypted data or fail
            // For now, if it doesn't match format, return original (useful for migration/debugging)
            // But strict security would say throw error.
            // Let's assume strict format for now.
            return text;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return text; // Fallback to raw text if decryption fails (e.g. invalid key or data)
    }
};

module.exports = { encrypt, decrypt };
