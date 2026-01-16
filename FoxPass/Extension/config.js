export const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co"; 
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";

export const AES_ALGO = "AES-GCM";
export const SALT_LEN = 16;
export const IV_LEN = 12;


export const RSA_GEN_ALGO = { 
    name: "RSA-OAEP", 
    modulusLength: 2048, 
    publicExponent: new Uint8Array([1, 0, 1]), 
    hash: { name: "SHA-256" } 
};


export const RSA_IMPORT_ALGO = { 
    name: "RSA-OAEP", 
    hash: { name: "SHA-256" } 
};
