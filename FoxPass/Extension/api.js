import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const headers = { 
    "apikey": SUPABASE_KEY, 
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
};

export async function fetchUserRecord(email) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}&select=*`, {
            method: "GET", headers: headers
        });
        const data = await res.json();
        return (data && data.length > 0) ? data[0] : null;
    } catch { return null; }
}

export async function saveFullProfile(payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults`, {
        method: "POST", 
        headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Save failed");
}

export async function updateUserVault(email, encryptedVault, encryptedPrivateKey = null) {
    const payload = { 
        encrypted_data: encryptedVault, 
        updated_at: new Date().toISOString() 
    };
    if (encryptedPrivateKey) {
        payload.encrypted_private_key = encryptedPrivateKey;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}`, {
        method: "PATCH", 
        headers: headers,
        body: JSON.stringify(payload)
    });
}

export async function deleteUserRecord(email) {
    await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}`, {
        method: "DELETE", headers: headers
    });
}
