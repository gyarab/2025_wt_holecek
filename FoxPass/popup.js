import { SALT_LEN } from './config.js';
import * as Crypto from './crypto.js';
import * as API from './api.js';
import * as UI from './ui.js';
import * as Utils from './utils.js';

let masterKey = null;       
let currentSalt = null;     
let rsaKeyPair = null;      
let decryptedVault = [];    
let currentUserEmail = "";
let isRegisterMode = false;
let editingIndex = -1;

init();

function init() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        UI.Elements.btnThemeToggle.textContent = "☀️";
    }
    browser.storage.local.get("lastEmail").then(r => { 
        if (r.lastEmail) UI.Elements.emailInput.value = r.lastEmail; 
    });
    const warn = document.createElement("div"); 
    warn.className = "caps-warning"; 
    warn.innerHTML = "⚠️ CAPS LOCK IS ON"; 
    UI.Elements.pwdInput.parentNode.appendChild(warn);
    UI.Elements.pwdInput.addEventListener("keyup", (e) => {
        warn.classList.toggle("show", e.getModifierState && e.getModifierState("CapsLock"));
    });
    setupEventListeners();
}

async function handleLogin() {
    const email = UI.Elements.emailInput.value.trim();
    const pwd = UI.Elements.pwdInput.value;
    if (!email || !pwd) return UI.showError("Please fill credentials.");
    UI.Elements.btnSubmit.textContent = "Verifying...";
    try {
        const record = await API.fetchUserRecord(email);
        if (!record) { UI.showError("User not found."); UI.Elements.btnSubmit.textContent = "Unlock Vault"; return; }
        currentSalt = new Uint8Array(record.encrypted_data.salt);
        masterKey = await Crypto.deriveMasterKey(pwd, currentSalt);
        decryptedVault = await Crypto.aesDecrypt(record.encrypted_data, masterKey);

        const privKeyJWK = await Crypto.aesDecrypt(record.encrypted_private_key, masterKey);
        const pubKey = await crypto.subtle.importKey("jwk", record.public_key, Crypto.RSA_IMPORT_ALGO, true, ["encrypt"]);
        const privKey = await crypto.subtle.importKey("jwk", privKeyJWK, Crypto.RSA_IMPORT_ALGO, true, ["decrypt"]);
        rsaKeyPair = { publicKey: pubKey, privateKey: privKey };
        
        currentUserEmail = email;
        await browser.storage.local.set({ lastEmail: email });
        enterVault();
    } catch (e) { console.error(e); UI.showError("Incorrect password."); UI.Elements.btnSubmit.textContent = "Unlock Vault"; }
}

async function handleRegister() {
    const email = UI.Elements.emailInput.value.trim();
    const pwd = UI.Elements.pwdInput.value;
    const confirm = UI.Elements.confirmInput.value;
    if (!Utils.isValidEmail(email)) return UI.showError("Invalid email format.");
    if (pwd.length < 8) return UI.showError("Password too short (min 8).");
    if (pwd !== confirm) return UI.showError("Passwords do not match.");
    UI.Elements.btnSubmit.textContent = "Encrypting...";
    try {
        const existing = await API.fetchUserRecord(email);
        if (existing) { UI.showError("User exists."); UI.Elements.btnSubmit.textContent = "Sign Up"; return; }
        currentSalt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        masterKey = await Crypto.deriveMasterKey(pwd, currentSalt);
        rsaKeyPair = await Crypto.generateRSA();
        decryptedVault = [];
        const encryptedVault = await Crypto.aesEncrypt(decryptedVault, masterKey, currentSalt);
        const pubKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.publicKey);
        const privKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.privateKey);
        const encPrivKey = await Crypto.aesEncrypt(privKeyJWK, masterKey, currentSalt);
        currentUserEmail = email;
        await API.saveFullProfile({
            user_email: email, encrypted_data: encryptedVault, public_key: pubKeyJWK, encrypted_private_key: encPrivKey, updated_at: new Date().toISOString()
        });
        await browser.storage.local.set({ lastEmail: email });
        enterVault();
    } catch (e) { UI.showError(e.message); UI.Elements.btnSubmit.textContent = "Sign Up"; }
}

function enterVault() {
    UI.showScreen("vault");
    UI.Elements.settingsEmail.textContent = currentUserEmail;
    refreshVaultList();
}

async function handleChangePassword() {
    const oldPass = UI.Elements.changeOldPass.value;
    const newPass = UI.Elements.changeNewPass.value;
    if (!oldPass || !newPass) return alert("Fill both passwords.");
    if (newPass.length < 8) return alert("New password too short.");
    UI.Elements.btnChangePass.textContent = "Updating...";
    try {
        const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        const newMasterKey = await Crypto.deriveMasterKey(newPass, newSalt);
        const newEncryptedVault = await Crypto.aesEncrypt(decryptedVault, newMasterKey, newSalt);
        const privKeyJWK = await crypto.subtle.exportKey("jwk", rsaKeyPair.privateKey);
        const newEncryptedPrivateKey = await Crypto.aesEncrypt(privKeyJWK, newMasterKey, newSalt);
        await API.updateUserVault(currentUserEmail, newEncryptedVault, newEncryptedPrivateKey);
        masterKey = newMasterKey;
        currentSalt = newSalt;
        alert("Password changed successfully! ✅");
        UI.Elements.changeOldPass.value = "";
        UI.Elements.changeNewPass.value = "";
        UI.Elements.btnChangePass.textContent = "Update Password";
    } catch (e) { console.error(e); alert("Error changing password."); UI.Elements.btnChangePass.textContent = "Update Password"; }
}

async function handleAddOrUpdate() {
    const newItem = { 
        site: UI.Elements.sName.value, 
        user: UI.Elements.sUser.value, 
        pass: UI.Elements.sPass.value, 
        note: UI.Elements.sNote.value 
    };
    if (!newItem.site || !newItem.pass) return UI.showError("Fill Website and Password.");
    UI.Elements.btnAdd.textContent = "Saving...";
    if (editingIndex >= 0) { decryptedVault[editingIndex] = newItem; editingIndex = -1; UI.showToast("Updated ✅"); } 
    else { decryptedVault.push(newItem); UI.showToast("Saved ✅"); }
    await saveAndRefresh();
    UI.clearAddForm();
}

async function saveAndRefresh() {
    try {
        const encryptedVault = await Crypto.aesEncrypt(decryptedVault, masterKey, currentSalt);
        await API.updateUserVault(currentUserEmail, encryptedVault);
        refreshVaultList();
    } catch(e) { console.error(e); UI.showError("Save failed."); }
}

function refreshVaultList() {
    UI.renderVaultList(decryptedVault, UI.Elements.searchInput.value, {
        onCopy: (text) => navigator.clipboard.writeText(text),
        onEdit: (index) => { editingIndex = index; UI.setAddFormForEdit(decryptedVault[index]); },
        onDelete: async (index) => { if(confirm("Delete this password?")) { decryptedVault.splice(index, 1); await saveAndRefresh(); } },

    });
}

function setupEventListeners() {
    UI.Elements.btnSubmit.addEventListener("click", () => isRegisterMode ? handleRegister() : handleLogin());
    UI.Elements.pwdInput.addEventListener("keydown", (e) => { if(e.key==="Enter") isRegisterMode ? handleRegister() : handleLogin(); });
    UI.Elements.btnSwitchMode.onclick = (e) => {
        e.preventDefault(); isRegisterMode = !isRegisterMode;
        UI.Elements.authTitle.textContent = isRegisterMode ? "Register" : "Welcome Back";
        UI.Elements.groupConfirm.classList.toggle("hidden", !isRegisterMode);
        UI.Elements.btnSubmit.textContent = isRegisterMode ? "Sign Up" : "Unlock Vault";
        e.target.textContent = isRegisterMode ? "Login instead" : "Create Account";
    };
    UI.Elements.btnSettings.onclick = () => UI.showScreen("settings");
    document.getElementById("btn-back-settings").onclick = () => UI.showScreen("vault");
    UI.Elements.btnLock.onclick = () => location.reload();
    UI.Elements.btnThemeToggle.onclick = () => {
        document.body.classList.toggle("light-mode");
        const isLight = document.body.classList.contains("light-mode");
        localStorage.setItem("theme", isLight ? "light" : "dark");
        UI.Elements.btnThemeToggle.textContent = isLight ? "☀️" : "🌙";
    };

    UI.Elements.btnAdd.addEventListener("click", handleAddOrUpdate);
    UI.Elements.sPass.addEventListener("keydown", (e) => { if(e.key==="Enter") handleAddOrUpdate(); });
    UI.Elements.sPass.addEventListener("input", (e) => UI.updateStrengthUI(Utils.calculatePasswordStrength(e.target.value)));
    UI.Elements.searchInput.addEventListener("input", refreshVaultList);
    UI.Elements.btnChangePass.addEventListener("click", handleChangePassword);
    UI.Elements.btnDeleteAccount.onclick = async () => { if (!confirm("ARE YOU SURE?")) return; try { await API.deleteUserRecord(currentUserEmail); await browser.storage.local.clear(); location.reload(); } catch (e) { alert(e.message); } };
    UI.Elements.btnExport.onclick = () => { if(!decryptedVault.length) return alert("Empty."); const blob = new Blob([JSON.stringify(decryptedVault,null,2)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "foxpass.json"; a.click(); };
    UI.Elements.btnImport.onclick = () => UI.Elements.importFile.click();
    UI.Elements.importFile.onchange = (e) => { const r = new FileReader(); r.onload = async (ev) => { try { const data = JSON.parse(ev.target.result); if(Array.isArray(data)) { data.forEach(i => { if(i.site && i.pass) decryptedVault.push(i); }); await saveAndRefresh(); alert("Imported!"); } } catch { alert("Error"); } }; if(e.target.files[0]) r.readAsText(e.target.files[0]); };
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!UI.Elements.settingsScreen.classList.contains("hidden")) UI.showScreen("vault"); if (editingIndex >= 0) { UI.clearAddForm(); editingIndex = -1; } } });
}