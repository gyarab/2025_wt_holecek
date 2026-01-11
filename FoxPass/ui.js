import { getFaviconUrl } from './utils.js';

export const Elements = {
    authScreen: document.getElementById("auth-screen"),
    vaultScreen: document.getElementById("vault-screen"),
    settingsScreen: document.getElementById("settings-screen"),
    
    emailInput: document.getElementById("user-email"),
    pwdInput: document.getElementById("master-password"),
    confirmInput: document.getElementById("confirm-password"),
    
    btnSubmit: document.getElementById("btn-submit"),
    btnAdd: document.getElementById("btn-add"),
    

    btnSettings: document.getElementById("btn-settings"),
    btnLock: document.getElementById("btn-lock-header"),
    btnThemeToggle: document.getElementById("btn-theme-toggle"),
    
    sName: document.getElementById("site-name"),
    sUser: document.getElementById("site-username"),
    sPass: document.getElementById("site-password"),
    sNote: document.getElementById("site-note"),
    
    btnExport: document.getElementById("btn-export"),
    btnImport: document.getElementById("btn-import"),
    importFile: document.getElementById("import-file"),
    
    changeOldPass: document.getElementById("change-old-pass"),
    changeNewPass: document.getElementById("change-new-pass"),
    btnChangePass: document.getElementById("btn-change-pass"),
    btnDeleteAccount: document.getElementById("btn-delete-account"),
    
    errorMsg: document.getElementById("error-msg"),
    toast: document.getElementById("toast"),
    passwordList: document.getElementById("password-list"),
    strengthBar: document.getElementById("strength-bar"),
    strengthText: document.getElementById("strength-text"),
    searchInput: document.getElementById("search-input"),
    emptyState: document.getElementById("empty-state"),
    settingsEmail: document.getElementById("settings-email"),
    
    authTitle: document.getElementById("auth-title"),
    groupConfirm: document.getElementById("group-confirm"),
    btnSwitchMode: document.getElementById("btn-switch-mode")
};

export function showScreen(screenName) {
    Elements.authScreen.classList.add("hidden");
    Elements.vaultScreen.classList.add("hidden");
    Elements.settingsScreen.classList.add("hidden");

    if (screenName === "auth") {
        Elements.authScreen.classList.remove("hidden");
        Elements.btnSettings.classList.add("hidden");
        Elements.btnLock.classList.add("hidden");
    } else if (screenName === "vault") {
        Elements.vaultScreen.classList.remove("hidden");
        Elements.btnSettings.classList.remove("hidden");
        Elements.btnLock.classList.remove("hidden");
    } else if (screenName === "settings") {
        Elements.settingsScreen.classList.remove("hidden");
        Elements.btnSettings.classList.add("hidden");
    }
}

export function showToast(msg) {
    Elements.toast.textContent = msg;
    Elements.toast.classList.remove("hidden");
    setTimeout(() => Elements.toast.classList.add("hidden"), 2500);
}

export function showError(msg) {
    Elements.errorMsg.textContent = msg;
    setTimeout(() => Elements.errorMsg.textContent = "", 4000);
}

export function updateStrengthUI(strength) {
    Elements.strengthBar.style.width = strength.width;
    Elements.strengthBar.style.backgroundColor = strength.color;
    Elements.strengthText.textContent = strength.text;
    Elements.strengthText.style.color = strength.color;
}

export function clearAddForm() {
    Elements.sName.value = "";
    Elements.sUser.value = "";
    Elements.sPass.value = "";
    Elements.sNote.value = "";
    Elements.btnAdd.textContent = "Save to Vault";
    Elements.btnAdd.classList.remove("btn-secondary");
    updateStrengthUI({ width: "0%", color: "", text: "" });
}

export function setAddFormForEdit(item) {
    Elements.sName.value = item.site;
    Elements.sUser.value = item.user;
    Elements.sPass.value = item.pass;
    Elements.sNote.value = item.note || "";
    Elements.btnAdd.textContent = "Update";
    Elements.btnAdd.classList.add("btn-secondary");
    document.querySelector(".add-new-section").scrollIntoView({ behavior: "smooth" });
}

export function renderVaultList(vaultData, filterText = "", actions) {
    Elements.passwordList.innerHTML = "";
    
    const list = vaultData.filter(i => 
        i.site.toLowerCase().includes(filterText.toLowerCase()) || 
        i.user.toLowerCase().includes(filterText.toLowerCase())
    );

    if (Elements.emptyState) Elements.emptyState.classList.toggle("hidden", list.length > 0);
    
    const counts = {};
    vaultData.forEach(i => counts[i.pass] = (counts[i.pass] || 0) + 1);

    list.forEach((item) => {
        const realIdx = vaultData.indexOf(item);
        const div = document.createElement("div");
        div.className = "password-item";
        
        const isReused = counts[item.pass] > 1;
        const warn = isReused ? `<span class="reuse-warning" title="Warning: Password reused!">⚠️</span>` : '';
        const noteBtn = item.note ? `<button class="icon-btn note-trigger" title="Show Note">📝</button>` : '';
        const faviconUrl = getFaviconUrl(item.site);
        const iconHtml = faviconUrl ? `<img src="${faviconUrl}" class="favicon">` : `<span class="favicon">🌐</span>`;

        div.innerHTML = `
            <div class="item-header">
                <div style="display:flex; align-items:center;">${iconHtml}<span class="site-title">${item.site}</span></div>
                ${warn}
            </div>
            <div class="item-row">
                <span class="item-label">USER</span>
                <span class="item-value cpy-user" title="Click to Copy">${item.user}</span>
            </div>
            <div class="item-row">
                <span class="item-label">PASS</span>
                <div class="pass-wrapper">
                    <input type="password" class="pass-input-display cpy-pass" value="${item.pass}" readonly title="Click to Copy">
                    <button class="icon-btn toggle-pass-btn" title="Show/Hide">👁️</button>
                </div>
            </div>
            <div class="note-display">${item.note || ''}</div>
            <div class="item-footer">
                ${noteBtn}
                <button class="icon-btn edit-btn" title="Edit Entry">✏️</button>
                <button class="icon-btn delete-btn" title="Delete Entry">🗑️</button>
            </div>
        `;
        
        const passInput = div.querySelector(".pass-input-display");
        const eyeBtn = div.querySelector(".toggle-pass-btn");
        eyeBtn.onclick = (e) => {
            e.stopPropagation();
            if (passInput.type === "password") { passInput.type = "text"; eyeBtn.textContent = "🙈"; }
            else { passInput.type = "password"; eyeBtn.textContent = "👁️"; }
        };
        
        div.querySelector(".cpy-user").onclick = () => { actions.onCopy(item.user); showToast("Username copied!"); };
        div.querySelector(".cpy-pass").onclick = () => {
            actions.onCopy(item.pass);
            showToast("Copied! (Clears in 30s) ⏳");
            setTimeout(() => navigator.clipboard.writeText(""), 30000);
        };
        if(item.note) div.querySelector(".note-trigger").onclick = () => div.querySelector(".note-display").classList.toggle("show");
        div.querySelector(".edit-btn").onclick = () => actions.onEdit(realIdx);
        div.querySelector(".delete-btn").onclick = () => actions.onDelete(realIdx);
        Elements.passwordList.appendChild(div);
    });
}