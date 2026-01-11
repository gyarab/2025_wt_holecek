const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";

const AES_ALGO = "AES-GCM";
const RSA_ALGO = { 
    name: "RSA-OAEP", 
    modulusLength: 2048, 
    publicExponent: new Uint8Array([1, 0, 1]), 
    hash: { name: "SHA-256" } 
};
const SALT_LEN = 16;
const IV_LEN = 12;

let masterKey = null;       
let currentSalt = null;     
let rsaKeyPair = null;      
let decryptedVault = [];    
let currentUserEmail = "";
let isRegisterMode = false;
let editingIndex = -1;

const authScreen = document.getElementById("auth-screen");
const vaultScreen = document.getElementById("vault-screen");
const settingsScreen = document.getElementById("settings-screen"); 

const emailInput = document.getElementById("user-email");
const pwdInput = document.getElementById("master-password");
const confirmInput = document.getElementById("confirm-password");

const btnSubmit = document.getElementById("btn-submit");
const btnAdd = document.getElementById("btn-add");
const errorMsg = document.getElementById("error-msg");
const toast = document.getElementById("toast");
const passwordList = document.getElementById("password-list");

const btnSettings = document.getElementById("btn-settings");
const btnLock = document.getElementById("btn-lock-header");
const btnCheckInbox = document.getElementById("btn-check-inbox");
const btnThemeToggle = document.getElementById("btn-theme-toggle");

const sName = document.getElementById("site-name");
const sUser = document.getElementById("site-username");
const sPass = document.getElementById("site-password");
const sNote = document.getElementById("site-note");
const searchInput = document.getElementById("search-input");
const btnGenerate = document.getElementById("btn-generate");

const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");

const changeOldPass = document.getElementById("change-old-pass");
const changeNewPass = document.getElementById("change-new-pass");
const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const importFile = document.getElementById("import-file");

initTheme();
browser.storage.local.get("lastEmail").then(r => { if (r.lastEmail) emailInput.value = r.lastEmail; });

function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        btnThemeToggle.textContent = "☀️";
    }
}

btnThemeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    btnThemeToggle.textContent = isLight ? "☀️" : "🌙";
});


async function deriveMasterKey(password, salt) {
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

async function aesEncrypt(data, key, salt) {
    const enc = new TextEncoder(); const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const buf = await crypto.subtle.encrypt({ name: AES_ALGO, iv: iv }, key, enc.encode(JSON.stringify(data)));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(buf)), salt: Array.from(salt) };
}

async function aesDecrypt(obj, key) {
    const buf = await crypto.subtle.decrypt({ name: AES_ALGO, iv: new Uint8Array(obj.iv) }, key, new Uint8Array(obj.data));
    return JSON.parse(new TextDecoder().decode(buf));
}

async function generateRSA() { return await crypto.subtle.generateKey(RSA_ALGO, true, ["encrypt", "decrypt"]); }

async function rsaEncrypt(data, pubKey) {
    const enc = new TextEncoder(); 
    const buf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, enc.encode(JSON.stringify(data)));
    return Array.from(new Uint8Array(buf));
}

async function rsaDecrypt(data, privKey) {
    const buf = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, new Uint8Array(data));
    return JSON.parse(new TextDecoder().decode(buf));
}


async function fetchUserRecord(email) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}&select=*`, {
            method: "GET", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();
        return (data && data.length > 0) ? data[0] : null;
    } catch { return null; }
}

async function saveFullProfile(email, vault, pubKey, privKeyEnc) {
    const payload = {
        user_email: email, encrypted_data: vault, public_key: pubKey,
        encrypted_private_key: privKeyEnc, updated_at: new Date().toISOString()
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults`, {
        method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Save failed");
}

async function handleSaveData() {
    try {
        const encryptedVault = await aesEncrypt(decryptedVault, masterKey, currentSalt);
        await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${currentUserEmail}`, {
            method: "PATCH", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ encrypted_data: encryptedVault, updated_at: new Date().toISOString() })
        });
        renderList(searchInput.value);
    } catch(e) { console.error(e); showError("Save failed."); }
}


async function handleLogin() {
    const email = emailInput.value.trim();
    const pwd = pwdInput.value;
    if (!email || !pwd) return showError("Please fill credentials.");
    btnSubmit.textContent = "Verifying...";

    try {
        const record = await fetchUserRecord(email);
        if (!record) { showError("User not found."); btnSubmit.textContent = "Unlock Vault"; return; }

        currentSalt = new Uint8Array(record.encrypted_data.salt);
        masterKey = await deriveMasterKey(pwd, currentSalt);

        decryptedVault = await aesDecrypt(record.encrypted_data, masterKey);
        
        const privKeyJWK = await aesDecrypt(record.encrypted_private_key, masterKey);
        const pubKey = await crypto.subtle.importKey("jwk", record.public_key, RSA_ALGO, true, ["encrypt"]);
        const privKey = await crypto.subtle.importKey("jwk", privKeyJWK, RSA_ALGO, true, ["decrypt"]);
        rsaKeyPair = { publicKey: pubKey, privateKey: privKey };

        currentUserEmail = email;
        await browser.storage.local.set({ lastEmail: email });
        enterVault();
    } catch (e) { 
        console.error(e);
        showError("Incorrect password."); 
        btnSubmit.textContent = "Unlock Vault"; 
    }
}

async function handleRegister() {
    const email = emailInput.value.trim();
    const pwd = pwdInput.value;
    const confirm = confirmInput.value;
    
    if (!email || !pwd) return showError("Fill all fields.");
    if (!/^[a-zA-Z0-9@._-]+$/.test(email)) return showError("Invalid chars.");
    if (pwd.length < 8) return showError("Min 8 chars.");
    if (pwd !== confirm) return showError("Passwords do not match.");

    btnSubmit.textContent = "Encrypting...";
    try {
        const existing = await fetchUserRecord(email);
        if (existing) { showError("User exists."); btnSubmit.textContent = "Sign Up"; return; }

        currentSalt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        masterKey = await deriveMasterKey(pwd, currentSalt);
        rsaKeyPair = await generateRSA();

        decryptedVault = [];
        const encryptedVault = await aesEncrypt(decryptedVault, masterKey, currentSalt);
        
        const pubKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.publicKey);
        const privKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.privateKey);
        const encPrivKey = await aesEncrypt(privKeyJWK, masterKey, currentSalt);

        currentUserEmail = email;
        await saveFullProfile(email, encryptedVault, pubKeyJWK, encPrivKey);
        await browser.storage.local.set({ lastEmail: email });

        enterVault();
    } catch (e) { showError(e.message); btnSubmit.textContent = "Sign Up"; }
}

function enterVault() {
    authScreen.classList.add("hidden"); 
    vaultScreen.classList.remove("hidden");
    settingsScreen.classList.add("hidden");
    
    btnSettings.classList.remove("hidden"); 
    btnLock.classList.remove("hidden");
    btnCheckInbox.classList.remove("hidden");
    
    document.getElementById("settings-email").textContent = currentUserEmail;
    renderList();
}

async function handleAddPassword() {
    if (sName.value && sPass.value) {
        const originalText = btnAdd.textContent;
        btnAdd.textContent = "Saving...";
        
        const newItem = { site: sName.value, user: sUser.value, pass: sPass.value, note: sNote.value };
        
        if (editingIndex >= 0) {
            decryptedVault[editingIndex] = newItem;
            editingIndex = -1;
            showToast("Updated ✅");
        } else {
            decryptedVault.push(newItem);
            showToast("Saved ✅");
        }
        
        btnAdd.textContent = "Save to Vault";
        btnAdd.classList.remove("btn-secondary");
        
        await handleSaveData();
        sName.value = ""; sUser.value = ""; sPass.value = ""; sNote.value = "";
        updateStrength("");
    } else { showError("Fill Website and Password."); }
}

function renderList(filter = "") {
    passwordList.innerHTML = "";
    const list = decryptedVault.filter(i => 
        i.site.toLowerCase().includes(filter.toLowerCase()) || 
        i.user.toLowerCase().includes(filter.toLowerCase())
    );
    
    document.getElementById("empty-state").classList.toggle("hidden", list.length > 0);
    
    const counts = {};
    decryptedVault.forEach(i => counts[i.pass] = (counts[i.pass] || 0) + 1);

    list.forEach((item, idx) => {
        const realIdx = decryptedVault.indexOf(item);
        const div = document.createElement("div");
        div.className = "password-item";
        
        const isReused = counts[item.pass] > 1;
        const warn = isReused ? `<span class="reuse-warning" title="Reuse Risk!">⚠️</span>` : '';
        const noteBtn = item.note ? `<button class="icon-btn" id="n-${realIdx}">📝</button>` : '';
        
        let cleanDomain = item.site.toLowerCase().replace("https://", "").split("/")[0];
        let iconUrl = cleanDomain.includes(".") ? `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64` : "";
        let iconHtml = iconUrl ? `<img src="${iconUrl}" class="favicon">` : `<span class="favicon">🌐</span>`;

        div.innerHTML = `
            <div class="item-header">
                <div style="display:flex; align-items:center;">${iconHtml}<span class="site-title">${item.site}</span></div>
                ${warn}
            </div>
            <div class="item-row"><span class="item-label">USER</span><span class="item-value cpy-user">${item.user}</span></div>
            <div class="item-row"><span class="item-label">PASS</span><div class="pass-wrapper"><input type="password" class="pass-input-display cpy-pass" value="${item.pass}" readonly></div></div>
            <div id="note-${realIdx}" class="note-display">${item.note || ''}</div>
            <div class="item-footer">
                ${noteBtn}
                <button class="icon-btn" id="edit-${realIdx}">✏️</button>
                <button class="icon-btn delete" id="del-${realIdx}">🗑️</button>
            </div>
        `;
        passwordList.appendChild(div);
        
        div.querySelector(".cpy-user").onclick = () => { navigator.clipboard.writeText(item.user); showToast("User copied!"); };
        div.querySelector(".cpy-pass").onclick = () => { navigator.clipboard.writeText(item.pass); showToast("Pass copied!"); };
        
        if(item.note) document.getElementById(`n-${realIdx}`).onclick = () => document.getElementById(`note-${realIdx}`).classList.toggle("show");
        document.getElementById(`edit-${realIdx}`).onclick = () => startEditing(realIdx);
        document.getElementById(`del-${realIdx}`).onclick = async () => {
            if(confirm("Delete?")) {
                decryptedVault.splice(realIdx, 1);
                await handleSaveData();
            }
        };
    });
}

function startEditing(index) {
    const item = decryptedVault[index];
    sName.value = item.site; sUser.value = item.user; sPass.value = item.pass; sNote.value = item.note || "";
    editingIndex = index;
    updateStrength(item.pass);
    btnAdd.textContent = "Update";
    btnAdd.classList.add("btn-secondary");
    document.querySelector(".add-new-section").scrollIntoView({behavior:"smooth"});
}


function updateStrength(password) {
    let score = 0;
    if (!password) { strengthBar.style.width = "0%"; strengthText.textContent = ""; return; }
    if (password.length > 5) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let width = "0%"; let color = "var(--strength-weak)"; let text = "Weak";
    if (score < 2) { width = "25%"; color = "var(--strength-weak)"; text = "Weak"; }
    else if (score < 4) { width = "50%"; color = "var(--strength-fair)"; text = "Fair"; }
    else if (score < 5) { width = "75%"; color = "var(--strength-good)"; text = "Good"; }
    else { width = "100%"; color = "var(--strength-strong)"; text = "Strong"; }

    strengthBar.style.width = width;
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function generateStrongPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) { password += chars[array[i] % chars.length]; }
    return password;
}

function getFaviconUrl(domain) {
    let cleanDomain = domain.toLowerCase().replace("https://", "").replace("http://", "").split("/")[0];
    if (!cleanDomain.includes(".")) return null;
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;
}

function showError(msg) { errorMsg.textContent = msg; setTimeout(() => errorMsg.textContent = "", 4000); }
function showToast(msg) { toast.textContent = msg; toast.classList.remove("hidden"); setTimeout(() => toast.classList.add("hidden"), 2000); }


btnSubmit.addEventListener("click", () => isRegisterMode ? handleRegister() : handleLogin());
btnAdd.addEventListener("click", handleAddPassword);
btnLock.addEventListener("click", () => location.reload());
btnCheckInbox.addEventListener("click", checkInbox);

btnSettings.onclick = () => { vaultScreen.classList.add("hidden"); settingsScreen.classList.remove("hidden"); };
document.getElementById("btn-back-settings").onclick = () => { settingsScreen.classList.add("hidden"); vaultScreen.classList.remove("hidden"); };

document.getElementById("btn-switch-mode").onclick = (e) => {
    e.preventDefault(); isRegisterMode = !isRegisterMode;
    document.getElementById("auth-title").textContent = isRegisterMode ? "Register" : "Welcome Back";
    document.getElementById("group-confirm").classList.toggle("hidden", !isRegisterMode);
    btnSubmit.textContent = isRegisterMode ? "Sign Up" : "Unlock Vault";
    e.target.textContent = isRegisterMode ? "Login instead" : "Create Account";
};

btnExport.onclick = () => {
    if(!decryptedVault.length) return alert("Empty.");
    const blob = new Blob([JSON.stringify(decryptedVault,null,2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "foxpass.json"; a.click();
};
btnImport.onclick = () => importFile.click();
importFile.onchange = (e) => {
    const r = new FileReader();
    r.onload = async (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if(Array.isArray(data)) {
                data.forEach(i => { if(i.site && i.pass) decryptedVault.push(i); });
                await handleSaveData();
                alert("Imported!");
            }
        } catch { alert("Error"); }
    };
    if(e.target.files[0]) r.readAsText(e.target.files[0]);
};

async function checkInbox() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/inbox?recipient_email=eq.${currentUserEmail}&select=*`, {
            method: "GET", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const msgs = await res.json();
        let count = 0;
        for (const m of msgs) {
            try {
                const item = await rsaDecrypt(m.encrypted_item, rsaKeyPair.privateKey);
                item.site = `${item.site} (from ${m.sender_email})`;
                decryptedVault.push(item);
                await fetch(`${SUPABASE_URL}/rest/v1/inbox?id=eq.${m.id}`, { method: "DELETE", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
                count++;
            } catch {}
        }
        if (count > 0) { await handleSaveData(); alert(`Received ${count} new passwords!`); } 
        else { showToast("No messages."); }
    } catch { showToast("Inbox check failed."); }
}

const inputs = ["master-password", "confirm-password", "site-password"];
inputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        const warn = document.createElement("div"); warn.className = "caps-warning"; warn.innerHTML = "⚠️ CAPS LOCK IS ON"; el.parentNode.appendChild(warn);
        el.onkeyup = el.onkeydown = el.onclick = el.onfocus = (e) => {
            warn.classList.toggle("show", e.getModifierState && e.getModifierState("CapsLock"));
        };
        el.onblur = () => warn.classList.remove("show");
    }
});

searchInput.addEventListener("input", (e) => renderList(e.target.value));
sPass.addEventListener("input", () => updateStrength(sPass.value));
btnGenerate.addEventListener("click", () => {
    const p = generateStrongPassword();
    sPass.value = p; sPass.type = "text"; updateStrength(p);
    setTimeout(() => sPass.type = "password", 3000);
});
