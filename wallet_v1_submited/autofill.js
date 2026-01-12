// autofill.js
const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const AES_ALGO = "AES-GCM";

const urlParams = new URLSearchParams(window.location.search);
const targetTabId = parseInt(urlParams.get('tabId'));
const targetDomain = urlParams.get('domain') || "";

document.getElementById("target-domain").textContent = targetDomain;

// Elementy - Sekce
const unlockSection = document.getElementById("unlock-section");
const selectSection = document.getElementById("select-section");
const fillSection = document.getElementById("fill-section");

// Elementy - Unlock
const emailInput = document.getElementById("user-email");
const pwdInput = document.getElementById("master-password");
const btnUnlock = document.getElementById("btn-unlock");
const errorMsg = document.getElementById("error-msg");

// Elementy - Fill Preview
const finalUser = document.getElementById("final-user");
const finalPass = document.getElementById("final-pass");
const btnFillNow = document.getElementById("btn-fill-now");
const togglePreview = document.getElementById("toggle-preview-pass");

// --- API & Crypto ---
async function fetchUserRecord(email) {
    if (!SUPABASE_URL.includes("http")) return null;
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}&select=*`, {
            method: "GET", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const data = await response.json();
        return (data && data.length > 0) ? data[0] : null;
    } catch (err) { console.error("Fetch error:", err); return null; }
}

async function deriveKey(p, s) {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey("raw", enc.encode(p), {name:"PBKDF2"}, false, ["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2", salt:s, iterations:100000, hash:"SHA-256"}, km, {name:AES_ALGO, length:256}, false, ["decrypt"]);
}

async function aesDecrypt(encObj, key) {
    const buf = await crypto.subtle.decrypt({name:AES_ALGO, iv:new Uint8Array(encObj.iv)}, key, new Uint8Array(encObj.data));
    return JSON.parse(new TextDecoder().decode(buf));
}

// --- Logika Odemčení ---
async function handleUnlock() {
    const email = emailInput.value.trim();
    const pwd = pwdInput.value;
    
    if(!pwd || !email) { errorMsg.textContent = "Vyplňte email i heslo."; return; }
    
    btnUnlock.textContent = "Pracuji...";
    errorMsg.textContent = "";

    try {
        // 1. Získat data (z cache nebo serveru)
        const storage = await browser.storage.local.get(["vault", "lastEmail"]);
        let vaultEncrypted = storage.vault;

        if (email !== storage.lastEmail || !vaultEncrypted) {
            const record = await fetchUserRecord(email);
            if (!record) throw new Error("Uživatel nenalezen.");
            vaultEncrypted = record.encrypted_data;
            await browser.storage.local.set({ lastEmail: email, vault: vaultEncrypted });
        }

        // 2. Dešifrovat
        const salt = new Uint8Array(vaultEncrypted.salt);
        const key = await deriveKey(pwd, salt);
        const vaultDecrypted = await aesDecrypt(vaultEncrypted, key);

        // 3. Najít shodu
        const matches = vaultDecrypted.filter(item => 
            targetDomain.includes(item.site.toLowerCase()) || 
            item.site.toLowerCase().includes(targetDomain)
        );

        // 4. Rozhodnout co dál
        if (matches.length === 0) {
            // Žádná shoda -> Nabídneme prázdný formulář k vyplnění ručně!
            prepareFillSection("", "");
            errorMsg.textContent = "Žádné heslo pro tento web. Můžete vyplnit ručně.";
            // Chvíli počkáme, aby si přečetl chybu, pak přepneme
            setTimeout(() => switchToFill(), 1000);
        } else if (matches.length === 1) {
            // Jedna shoda -> Jdeme na kontrolu
            prepareFillSection(matches[0].user, matches[0].pass);
            switchToFill();
        } else {
            // Více shod -> Výběr
            showSelection(matches);
        }

    } catch (e) {
        console.error(e);
        errorMsg.textContent = "Chybné heslo nebo data.";
        btnUnlock.textContent = "Odemknout";
    }
}

// --- Logika Výběru ---
function showSelection(items) {
    unlockSection.classList.add("hidden");
    selectSection.classList.remove("hidden");
    const list = document.getElementById("accounts-list");
    list.innerHTML = "";
    
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "found-item";
        div.innerHTML = `
            <div>
                <div style="font-weight:bold;">${item.user}</div>
                <div style="font-size:11px; color:#666;">${item.site}</div>
            </div>
            <div style="font-size:18px;">👉</div>
        `;
        div.onclick = () => {
            prepareFillSection(item.user, item.pass);
            switchToFill();
        };
        list.appendChild(div);
    });
}

// --- Logika Kontroly a Vyplnění (Preview) ---
function prepareFillSection(user, pass) {
    // Tady se data vloží do inputů, kde je můžete upravit!
    finalUser.value = user;
    finalPass.value = pass;
}

function switchToFill() {
    unlockSection.classList.add("hidden");
    selectSection.classList.add("hidden");
    fillSection.classList.remove("hidden");
    finalUser.focus(); // Aby mohl hned psát
}

function executeFill() {
    // Vezmeme data PRÁVĚ TEĎ z těch inputů (takže i když je upravíte, pošlou se ty upravené)
    const userToSend = finalUser.value;
    const passToSend = finalPass.value;

    browser.tabs.sendMessage(targetTabId, {
        action: "fill_data",
        username: userToSend,
        password: passToSend
    });
    window.close();
}

// --- Inicializace a Eventy ---
(async function init() {
    const s = await browser.storage.local.get("lastEmail");
    if(s.lastEmail) emailInput.value = s.lastEmail;
})();

btnUnlock.addEventListener("click", handleUnlock);
pwdInput.addEventListener("keydown", (e) => { if(e.key==="Enter") handleUnlock(); });
emailInput.addEventListener("keydown", (e) => { if(e.key==="Enter") pwdInput.focus(); });

// Tlačítko VYPLNIT
btnFillNow.addEventListener("click", executeFill);
finalPass.addEventListener("keydown", (e) => { if(e.key==="Enter") executeFill(); }); // Enter v hesle odešle

// Tlačítka Zpět
document.getElementById("btn-back-select").onclick = () => {
    selectSection.classList.add("hidden"); unlockSection.classList.remove("hidden"); btnUnlock.textContent = "Odemknout";
};
document.getElementById("btn-back-fill").onclick = () => {
    fillSection.classList.add("hidden"); unlockSection.classList.remove("hidden"); btnUnlock.textContent = "Odemknout";
};

// Oko pro zobrazení hesla v náhledu
togglePreview.addEventListener("click", () => {
    finalPass.type = finalPass.type === "password" ? "text" : "password";
});