import { AES_ALGO, RSA_GEN_ALGO, RSA_IMPORT_ALGO, IV_LEN } from './config.js';

export { AES_ALGO, RSA_GEN_ALGO, RSA_IMPORT_ALGO, IV_LEN };

export async function deriveMasterKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: { name: "SHA-256" } }, 
        keyMaterial, 
        { name: AES_ALGO, length: 256 }, 
        false, 
        ["encrypt", "decrypt"] 
    );
}

export async function aesEncrypt(data, key, salt) {
    const enc = new TextEncoder(); 
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const buf = await crypto.subtle.encrypt({ name: AES_ALGO, iv: iv }, key, enc.encode(JSON.stringify(data)));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(buf)), salt: Array.from(salt) };
}

export async function aesDecrypt(obj, key) {
    const buf = await crypto.subtle.decrypt({ name: AES_ALGO, iv: new Uint8Array(obj.iv) }, key, new Uint8Array(obj.data));
    return JSON.parse(new TextDecoder().decode(buf));
}

export async function generateRSA() { return await crypto.subtle.generateKey(RSA_GEN_ALGO, true, ["encrypt", "decrypt"]); }

export async function rsaEncrypt(data, pubKey) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, enc.encode(JSON.stringify(data)));
    return Array.from(new Uint8Array(buf));
}

export async function rsaDecrypt(data, privKey) {
    const buf = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, new Uint8Array(data));
    return JSON.parse(new TextDecoder().decode(buf));
}

export function generateStrongPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) { password += chars[array[i] % chars.length]; }
    return password;
}