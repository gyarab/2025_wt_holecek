//Supabase configuration
const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";

//Proměnné
let currentEmail = "";
let isRegistered = false;
let vaultData = [];
let masterKey = null;

//Zkratky pro prvky v HTML
const inpPass = document.getElementById("password");
const btnSubmit = document.getElementById("btnSubmit");
const msgError = document.getElementById("errorMessage");
const loading = document.getElementById("loading");
const elAuth = document.getElementById("screenAuth");
const elVault = document.getElementById("screenVault");
const inpEmail = document.getElementById("email");

//Kryprografie a šifrování
async function deriveKey(password, salt) {
    const enc = new TextEncoder();//Přepis znaku na bajty
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}