const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const AES_ALGO = "AES-GCM";
const RSA_ALGO = { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
const SALT_LEN = 16;
const IV_LEN = 12;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let masterKey = null;       
let currentSalt = null;     
let rsaKeyPair = null;      
let decryptedVault = [];    
let currentUserEmail = "";
let isRegisterMode = false;
let idleTimer = null; 
let editingIndex = -1;
const authScreen = document.getElementById("auth-screen");
const vaultScreen = document.getElementById("vault-screen");
const settingsScreen = document.getElementById("settings-screen"); 
const emailInput = document.getElementById("user-email");
const pwdInput = document.getElementById("master-password");
const confirmInput = document.getElementById("confirm-password");
const changeOldPass = document.getElementById("change-old-pass");
const changeNewPass = document.getElementById("change-new-pass");
const btnSubmit = document.getElementById("btn-submit");
const btnAdd = document.getElementById("btn-add");
const errorMsg = document.getElementById("error-msg");
const toast = document.getElementById("toast");
const passwordList = document.getElementById("password-list");
const btnSettings = document.getElementById("btn-settings");
const btnLock = document.getElementById("btn-lock-header");
const searchInput = document.getElementById("search-input");
const btnGenerate = document.getElementById("btn-generate");
const sName = document.getElementById("site-name");
const sUser = document.getElementById("site-username");
const sPass = document.getElementById("site-password");
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
async function saveFullProfile(email, vaultObject, publicKeyJWK, encryptedPrivateKeyObject) {
    const payload = {
        user_email: email, encrypted_data: vaultObject, public_key: publicKeyJWK,
        encrypted_private_key: encryptedPrivateKeyObject, updated_at: new Date().toISOString()
    };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vaults`, {
        method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message || "Chyba uložení"); }
}
async function deleteUserRecord(email) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${email}`, {
        method: "DELETE", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    if (!response.ok) throw new Error("Nelze smazat účet.");
}
async function sendToInbox(sender, recipient, encryptedItem) {
    await fetch(`${SUPABASE_URL}/rest/v1/inbox`, {
        method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sender_email: sender, recipient_email: recipient, encrypted_item: encryptedItem })
    });
}
async function fetchInbox(email) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/inbox?recipient_email=eq.${email}&select=*`, {
        method: "GET", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    return await res.json();
}
async function deleteFromInbox(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/inbox?id=eq.${id}`, {
        method: "DELETE", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
}
async function deriveMasterKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: AES_ALGO, length: 256 }, false, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]);
}
async function generateRSA() { return await crypto.subtle.generateKey(RSA_ALGO, true, ["encrypt", "decrypt"]); }
async function aesEncrypt(dataObj, key, salt) {
    const enc = new TextEncoder(); const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encryptedBuffer = await crypto.subtle.encrypt({ name: AES_ALGO, iv: iv }, key, enc.encode(JSON.stringify(dataObj)));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(encryptedBuffer)), salt: Array.from(salt) };
}
async function aesDecrypt(encryptedObj, key) {
    const decryptedBuffer = await crypto.subtle.decrypt({ name: AES_ALGO, iv: new Uint8Array(encryptedObj.iv) }, key, new Uint8Array(encryptedObj.data));
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}
async function rsaEncrypt(data, publicKey) {
    const enc = new TextEncoder(); const buf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, enc.encode(JSON.stringify(data)));
    return Array.from(new Uint8Array(buf));
}
async function rsaDecrypt(dataArray, privateKey) {
    const buf = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, new Uint8Array(dataArray));
    return JSON.parse(new TextDecoder().decode(buf));
}
function generateStrongPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
        password += chars[array[i] % chars.length];
    }
    return password;
}
function getFaviconUrl(domain) {
    let cleanDomain = domain.toLowerCase().replace("https://", "").replace("http://", "").split("/")[0];
    if (!cleanDomain.includes(".")) return null;
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;
}
function startIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        alert("Z důvodu bezpečnosti jste byli odhlášeni.");
        location.reload();
    }, IDLE_TIMEOUT_MS);
}
document.addEventListener("click", startIdleTimer);
document.addEventListener("keydown", startIdleTimer);
async function handleRegister() {
    const email = emailInput.value.trim(); const pwd = pwdInput.value; const confirm = confirmInput.value;
    if (!email || !pwd) return showError("Vyplňte vše.");
    if (pwd !== confirm) return showError("Hesla nesedí.");
    btnSubmit.textContent = "Pracuji...";
    try {
        const existing = await fetchUserRecord(email);
        if (existing) { showError("Email obsazen."); btnSubmit.textContent = "Zaregistrovat se"; return; }
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
    } catch (e) { showError(e.message); btnSubmit.textContent = "Zaregistrovat se"; }
}
async function handleLogin() {
    const email = emailInput.value.trim(); const pwd = pwdInput.value;
    if (!email || !pwd) return showError("Vyplňte údaje.");
    btnSubmit.textContent = "Ověřování...";
    try {
        const record = await fetchUserRecord(email);
        if (!record) { showError("Uživatel nenalezen."); btnSubmit.textContent = "Přihlásit se"; return; }
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
    } catch (e) { console.error(e); showError("Chybné heslo."); btnSubmit.textContent = "Přihlásit se"; }
}
async function handleAddPassword() {
    if (sName.value && sPass.value) {
        const originalText = btnAdd.innerHTML;
        btnAdd.textContent = "Ukládám...";
        const newItem = { site: sName.value, user: sUser.value, pass: sPass.value };
        if (editingIndex >= 0) {
            decryptedVault[editingIndex] = newItem;
            editingIndex = -1;
            showToast("Změny uloženy ✅");
        } else {
            decryptedVault.push(newItem);
            showToast("Uloženo ✅");
        }
        btnAdd.innerHTML = "<span>+</span> Uložit heslo";
        btnAdd.classList.remove("btn-secondary");
        try {
            const encryptedVault = await aesEncrypt(decryptedVault, masterKey, currentSalt);
            await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${currentUserEmail}`, {
                method: "PATCH", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ encrypted_data: encryptedVault, updated_at: new Date().toISOString() })
            });
            renderList();
            sName.value = ""; sUser.value = ""; sPass.value = "";
        } catch (e) { 
            showError(e.message); 
            btnAdd.innerHTML = originalText;
        }
    } else {
        showError("Vyplňte alespoň Web a Heslo.");
    }
}
function startEditing(index) {
    const item = decryptedVault[index];
    sName.value = item.site;
    sUser.value = item.user;
    sPass.value = item.pass;
    editingIndex = index;
    btnAdd.innerHTML = "<span>💾</span> Uložit změny";
    btnAdd.classList.add("btn-secondary");
    document.querySelector(".add-new-section").scrollIntoView({ behavior: "smooth" });
    sName.focus();
}
async function changeMasterPassword() {
    const oldP = changeOldPass.value; const newP = changeNewPass.value;
    if (!oldP || !newP) return alert("Vyplňte hesla.");
    if (newP.length < 6) return alert("Min 6 znaků.");
    const btn = document.getElementById("btn-change-pass"); btn.textContent = "Přešifrovávám...";
    try {
        await deriveMasterKey(oldP, currentSalt);
        const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        const newMasterKey = await deriveMasterKey(newP, newSalt);
        const newEncVault = await aesEncrypt(decryptedVault, newMasterKey, newSalt);
        const privKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.privateKey);
        const newEncPrivKey = await aesEncrypt(privKeyJWK, newMasterKey, newSalt);
        const pubKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.publicKey);
        await saveFullProfile(currentUserEmail, newEncVault, pubKeyJWK, newEncPrivKey);
        masterKey = newMasterKey; currentSalt = newSalt;
        alert("Změněno!"); changeOldPass.value = ""; changeNewPass.value = ""; btn.textContent = "Změnit heslo";
    } catch (e) { alert("Chyba: " + e.message); btn.textContent = "Změnit heslo"; }
}
async function deleteAccount() {
    if (!confirm("OPRAVDU SMAZAT?")) return;
    try { await deleteUserRecord(currentUserEmail); await browser.storage.local.clear(); alert("Smazáno."); location.reload(); } catch (e) { alert(e.message); }
}
async function sharePassword(item) {
    const recipient = prompt(`Email příjemce:`);
    if (!recipient || recipient === currentUserEmail) return;
    try {
        const recRecord = await fetchUserRecord(recipient);
        if (!recRecord) return alert("Uživatel nenalezen.");
        const recPubKey = await crypto.subtle.importKey("jwk", recRecord.public_key, RSA_ALGO, true, ["encrypt"]);
        const encData = await rsaEncrypt(item, recPubKey);
        await sendToInbox(currentUserEmail, recipient, encData);
        showToast("Odesláno 📨");
    } catch (e) { alert(e.message); }
}
async function checkInbox() {
    const btn = document.getElementById("btn-check-inbox"); btn.textContent = "Stahuji...";
    try {
        const msgs = await fetchInbox(currentUserEmail);
        let count = 0;
        for (const m of msgs) {
            try {
                const item = await rsaDecrypt(m.encrypted_item, rsaKeyPair.privateKey);
                item.site = `${item.site} (od ${m.sender_email})`;
                decryptedVault.push(item);
                await deleteFromInbox(m.id);
                count++;
            } catch (e) { console.error(e); }
        }
        if (count > 0) {
            const encVault = await aesEncrypt(decryptedVault, masterKey, currentSalt);
            await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${currentUserEmail}`, {
                method: "PATCH", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ encrypted_data: encVault, updated_at: new Date().toISOString() })
            });
            renderList(); alert(`Přijato ${count} hesel!`);
        } else { showToast("Žádné zprávy."); }
    } catch (e) { console.error(e); }
    btn.textContent = "📨 Zkontrolovat doručenou poštu";
}
function showError(msg) { errorMsg.textContent = msg; setTimeout(() => errorMsg.textContent = "", 4000); }
function showToast(msg) { toast.textContent = msg; toast.classList.remove("hidden"); setTimeout(() => toast.classList.add("hidden"), 2000); }
function enterVault() {
    authScreen.classList.add("hidden"); vaultScreen.classList.remove("hidden"); settingsScreen.classList.add("hidden");
    btnSettings.classList.remove("hidden"); btnLock.classList.remove("hidden");
    document.getElementById("settings-email").textContent = currentUserEmail;
    startIdleTimer();
    renderList();
}
function renderList(filterText = "") {
    passwordList.innerHTML = "";
    const itemsToShow = decryptedVault.filter(item => 
        item.site.toLowerCase().includes(filterText.toLowerCase()) || 
        item.user.toLowerCase().includes(filterText.toLowerCase())
    );
    document.getElementById("empty-state").classList.toggle("hidden", itemsToShow.length > 0);
    itemsToShow.forEach((item, index) => {
        const realIndex = decryptedVault.indexOf(item);
        const div = document.createElement("div");
        div.className = "password-item";
        const faviconUrl = getFaviconUrl(item.site);
        const iconHtml = faviconUrl ? `<img src="${faviconUrl}" class="favicon">` : `<span class="logo-icon" style="font-size:20px;">🌐</span>`;
        div.innerHTML = `
            <div class="item-header">
                ${iconHtml}
                <span class="site-title">${item.site}</span>
            </div>
            <div class="item-row" style="margin-top:4px;">
                <span class="item-label">USER</span>
                <span class="item-value site-user">${item.user}</span>
            </div>
            <div class="item-row" style="margin-top:8px;">
                <span class="item-label">HESLO</span>
                <div class="pass-wrapper">
                    <input type="password" class="pass-input-display" id="pass-input-${realIndex}" value="${item.pass}" readonly>
                    <button class="eye-toggle" id="toggle-${realIndex}" title="Zobrazit/Skrýt">👁️</button>
                </div>
            </div>
            <div class="item-footer">
                <button class="icon-btn" id="edit-${realIndex}" data-title="Upravit">✏️</button>
                <button class="icon-btn" id="share-${realIndex}" data-title="Sdílet">📤</button>
                <button class="icon-btn" id="copy-${realIndex}" data-title="Kopírovat">📋</button>
                <button class="icon-btn delete" id="del-${realIndex}" data-title="Smazat">🗑️</button>
            </div>
        `;
        passwordList.appendChild(div);
        document.getElementById(`edit-${realIndex}`).addEventListener("click", () => startEditing(realIndex)); // <--- Nový listener
        document.getElementById(`toggle-${realIndex}`).addEventListener("click", () => {
            const input = document.getElementById(`pass-input-${realIndex}`);
            input.type = input.type === "password" ? "text" : "password";
        });
        document.getElementById(`share-${realIndex}`).addEventListener("click", () => sharePassword(item));
        document.getElementById(`copy-${realIndex}`).addEventListener("click", () => { navigator.clipboard.writeText(item.pass); showToast("Zkopírováno"); });
        document.getElementById(`del-${realIndex}`).addEventListener("click", async () => {
            if(confirm("Smazat?")) {
                decryptedVault.splice(realIndex, 1);
                if (editingIndex === realIndex) {
                     editingIndex = -1;
                     btnAdd.innerHTML = "<span>+</span> Uložit heslo";
                     btnAdd.classList.remove("btn-secondary");
                     sName.value = ""; sUser.value = ""; sPass.value = "";
                }
                const encVault = await aesEncrypt(decryptedVault, masterKey, currentSalt);
                await fetch(`${SUPABASE_URL}/rest/v1/vaults?user_email=eq.${currentUserEmail}`, {
                    method: "PATCH", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ encrypted_data: encVault, updated_at: new Date().toISOString() })
                });
                renderList(searchInput.value);
            }
        });
    });
}
function addEnterTrigger(inputId, buttonId) {
    document.getElementById(inputId).addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById(buttonId).click(); });
}
addEnterTrigger("master-password", "btn-submit"); addEnterTrigger("user-email", "btn-submit");
addEnterTrigger("site-password", "btn-add"); addEnterTrigger("site-name", "btn-add");

document.getElementById("btn-switch-mode").addEventListener("click", (e) => {
    e.preventDefault(); isRegisterMode = !isRegisterMode;
    const title = document.getElementById("auth-title"); const sub = document.getElementById("auth-subtitle");
    const grp = document.getElementById("group-confirm"); const swTxt = document.getElementById("switch-text"); const swBtn = document.getElementById("btn-switch-mode");
    if (isRegisterMode) { title.textContent = "Registrace"; sub.textContent = "Nový účet"; grp.classList.remove("hidden"); btnSubmit.textContent = "Zaregistrovat se"; swTxt.textContent = "Máte účet?"; swBtn.textContent = "Přihlásit se"; } 
    else { title.textContent = "Přihlášení"; sub.textContent = "Vítejte zpět"; grp.classList.add("hidden"); btnSubmit.textContent = "Přihlásit se"; swTxt.textContent = "Nemáte účet?"; swBtn.textContent = "Zaregistrovat se"; }
});
btnSubmit.addEventListener("click", () => isRegisterMode ? handleRegister() : handleLogin());
btnAdd.addEventListener("click", handleAddPassword);
document.getElementById("btn-check-inbox").addEventListener("click", checkInbox);
btnSettings.addEventListener("click", () => { vaultScreen.classList.add("hidden"); settingsScreen.classList.remove("hidden"); });
document.getElementById("btn-back-settings").addEventListener("click", () => { settingsScreen.classList.add("hidden"); vaultScreen.classList.remove("hidden"); });
document.getElementById("btn-change-pass").addEventListener("click", changeMasterPassword);
document.getElementById("btn-delete-account").addEventListener("click", deleteAccount);
btnLock.addEventListener("click", () => location.reload());
searchInput.addEventListener("input", (e) => {
    renderList(e.target.value);
});
btnGenerate.addEventListener("click", () => {
    const pass = generateStrongPassword();
    sPass.value = pass;
    sPass.type = "text"; 
    setTimeout(() => sPass.type = "password", 3000);
});
browser.storage.local.get("lastEmail").then(r => { if (r.lastEmail) emailInput.value = r.lastEmail; });