window.resizeTo(310, 420);

import * as Crypto from './crypto.js';
import * as API from './api.js';

const btnThemeToggle = document.getElementById("btn-theme-toggle");
const btnUnlock = document.getElementById("btn-unlock");
const errorMsg = document.getElementById("error-msg");
const emailInput = document.getElementById("user-email");
const pwdInput = document.getElementById("master-password");
const btnFillNow = document.getElementById("btn-fill-now");
const finalPass = document.getElementById("final-pass");
const finalUser = document.getElementById("final-user");

const urlParams = new URLSearchParams(window.location.search);
const targetTabId = parseInt(urlParams.get('tabId'));
const targetDomain = urlParams.get('domain') || "";
const domainLabel = document.getElementById("target-domain");
if (domainLabel) domainLabel.textContent = targetDomain;

function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const isLight = savedTheme === "light";
    if (isLight) {
        document.body.classList.add("light-mode");
        btnThemeToggle.textContent = "☀️";
    }
}
btnThemeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    btnThemeToggle.textContent = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
});
initTheme();

const input = document.getElementById("master-password");
const warning = document.createElement("div");
warning.className = "caps-warning";
warning.innerHTML = "⚠️ CAPS LOCK IS ON"; 
input.parentNode.appendChild(warning);
input.addEventListener("keyup", (e) => {
    warning.classList.toggle("show", e.getModifierState && e.getModifierState("CapsLock"));
});

async function handleUnlock() {
    const email = emailInput.value.trim();
    const pwd = pwdInput.value;

    errorMsg.textContent = "";
    
    if(!pwd || !email) { 
        errorMsg.textContent = "Please fill credentials."; 
        return; 
    }
    
    btnUnlock.textContent = "Verifying...";

    try {
        let storage = await browser.storage.local.get(["vault", "lastEmail"]);
        let vaultEncrypted = storage.vault;

        if (email !== storage.lastEmail || !vaultEncrypted) {
            const record = await API.fetchUserRecord(email);

            if (!record) throw new Error("User not found.");
            
            vaultEncrypted = record.encrypted_data;
            await browser.storage.local.set({ lastEmail: email, vault: vaultEncrypted });
        }

        const salt = new Uint8Array(vaultEncrypted.salt);
        const key = await Crypto.deriveMasterKey(pwd, salt);

        const vaultDecrypted = await Crypto.aesDecrypt(vaultEncrypted, key);

        const matches = vaultDecrypted.filter(item => 
            targetDomain.includes(item.site.toLowerCase()) || 
            item.site.toLowerCase().includes(targetDomain)
        );

        if (matches.length === 0) {
            prepareFillSection("", "");
            errorMsg.textContent = "No match for this website.";
            setTimeout(() => switchToFill(), 1000); 
        } else if (matches.length === 1) {
            prepareFillSection(matches[0].user, matches[0].pass);
            switchToFill();
        } else {
            showSelection(matches);
        }

    } catch (e) {
        console.error(e);
        if (e.message === "User not found.") {
            errorMsg.textContent = "User not found.";
        } else {
            errorMsg.textContent = "Incorrect password.";
        }
        btnUnlock.textContent = "Unlock";
    }
}

function showSelection(items) {
    document.getElementById("unlock-section").classList.add("hidden");
    const selSec = document.getElementById("select-section");
    selSec.classList.remove("hidden");
    
    const list = document.getElementById("accounts-list");
    list.innerHTML = "";
    
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "found-item";
        div.innerHTML = `<div><b>${item.user}</b><br><small>${item.site}</small></div><div>👉</div>`;
        div.onclick = () => {
            prepareFillSection(item.user, item.pass);
            switchToFill();
        };
        list.appendChild(div);
    });
}

function prepareFillSection(user, pass) {
    finalUser.value = user;
    finalPass.value = pass;
}

function switchToFill() {
    document.getElementById("unlock-section").classList.add("hidden");
    document.getElementById("select-section").classList.add("hidden");
    document.getElementById("fill-section").classList.remove("hidden");
}

function executeFill() {
    browser.tabs.sendMessage(targetTabId, {
        action: "fill_data",
        username: finalUser.value,
        password: finalPass.value
    });
    window.close();
}

(async function init() {
    const s = await browser.storage.local.get("lastEmail");
    if(s.lastEmail) emailInput.value = s.lastEmail;
})();

btnUnlock.addEventListener("click", handleUnlock);
pwdInput.addEventListener("keydown", (e) => { if(e.key==="Enter") handleUnlock(); });
emailInput.addEventListener("keydown", (e) => { if(e.key==="Enter") pwdInput.focus(); });

btnFillNow.addEventListener("click", executeFill);
finalPass.addEventListener("keydown", (e) => { if(e.key==="Enter") executeFill(); });

document.getElementById("btn-back-select").onclick = () => {
    document.getElementById("select-section").classList.add("hidden");
    document.getElementById("unlock-section").classList.remove("hidden");
    btnUnlock.textContent = "Unlock";
};
document.getElementById("btn-back-fill").onclick = () => {
    document.getElementById("fill-section").classList.add("hidden");
    document.getElementById("unlock-section").classList.remove("hidden");
    btnUnlock.textContent = "Unlock";
};

document.getElementById("toggle-preview-pass").addEventListener("click", () => {
    finalPass.type = finalPass.type === "password" ? "text" : "password";
});