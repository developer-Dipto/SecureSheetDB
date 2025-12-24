/**
 * SecureSheetDB Library
 * Dependencies: LZ-String (Must be loaded before this)
 */
class SecureSheetDB {
    constructor(scriptUrl) {
        if (!scriptUrl) throw new Error("Google Script URL is required!");
        this.scriptUrl = scriptUrl;
        this.encPassword = null;
        this.apiSecret = null;
    }

    setKeys(encryptionPassword, apiSecret) {
        this.encPassword = encryptionPassword;
        this.apiSecret = apiSecret;
    }

    // --- Public Methods ---

    async save(dataObj, id = null) {
        if (!this.encPassword || !this.apiSecret) throw new Error("Keys not set! Call setKeys() first.");

        // 1. Compress
        const jsonStr = JSON.stringify(dataObj);
        const compressedStr = LZString.compressToUTF16(jsonStr);
        
        // 2. Encrypt
        const key = await this._getKey(this.encPassword);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, 
            key, 
            new TextEncoder().encode(compressedStr)
        );

        const encryptedData = {
            iv: btoa(String.fromCharCode(...iv)),
            ct: btoa(String.fromCharCode(...new Uint8Array(encBuffer)))
        };

        // 3. Send
        const body = { action: id ? 'update' : 'create', data: encryptedData, id: id };
        return this._callApi(body);
    }

    async read(offset = 0, limit = 10) {
        if (!this.encPassword || !this.apiSecret) throw new Error("Keys not set!");
        
        const response = await this._callApi({ action: 'read', offset: offset, limit: limit });
        
        if (response.status !== 'success') return response;

        const decryptedList = [];
        for (const row of response.data) {
            const decData = await this._decryptAndDecompress(row.encryptedData);
            if(decData) {
                decryptedList.push({ id: row.id, ...decData });
            }
        }
        
        return { 
            status: 'success', 
            data: decryptedList, 
            hasMore: response.hasMore 
        };
    }

    async delete(id) {
        return this._callApi({ action: 'delete', id: id });
    }

    // --- Private Helpers ---

    async _getKey(password) {
        const enc = new TextEncoder();
        const keyMat = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
        return window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: enc.encode("static-salt"), iterations: 100000, hash: "SHA-256" },
            keyMat, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
        );
    }

    async _sign(payload, secret) {
        const enc = new TextEncoder();
        const key = await window.crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await window.crypto.subtle.sign("HMAC", key, enc.encode(payload));
        return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async _decryptAndDecompress(encObj) {
        try {
            // Data Validation
            if (!encObj || !encObj.iv || !encObj.ct) return null;

            const key = await this._getKey(this.encPassword);
            
            // Clean Base64 Strings
            const cleanIV = encObj.iv.replace(/\s/g, '');
            const cleanCT = encObj.ct.replace(/\s/g, '');

            const iv = Uint8Array.from(atob(cleanIV), c => c.charCodeAt(0));
            const ct = Uint8Array.from(atob(cleanCT), c => c.charCodeAt(0));

            // Decrypt
            const decBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
            const compressedStr = new TextDecoder().decode(decBuffer);
            
            // Decompress
            const jsonStr = LZString.decompressFromUTF16(compressedStr);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.warn("Decryption failed for a row (Wrong Key or Corrupt Data).");
            return null;
        }
    }

    async _callApi(bodyObj) {
        const payload = JSON.stringify(bodyObj);
        const timestamp = new Date().getTime();
        const signature = await this._sign(payload + timestamp, this.apiSecret);

        try {
            const req = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({ payload, signature, timestamp })
            });
            return await req.json();
        } catch (e) {
            return { status: 'error', message: 'Network Error: ' + e.message };
        }
    }
            }
