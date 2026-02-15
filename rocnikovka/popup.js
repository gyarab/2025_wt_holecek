//Supabase configuration
const SUPABASE_URL = "https://fxevhmvpwgejricjjmkm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";

//Proměnné
let currentEmail = "";
let isRegister = false;
let vaultData = [];
let masterKey = null;

//Zkratky pro prvky v HTML
const inpPass = document.getElementById("password");
const btnSubmit = document.getElementById("btn-submit");
const msgError = document.getElementById("error-msg");
const loading = document.getElementById("loading");
const elAuth = document.getElementById("screen-auth");
const elVault = document.getElementById("screen-vault");
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

//Zašifrování dat hlavím heslem
async function encrypt(dataObj, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));//Genereace soli
    const iv = crypto.getRandomValues(new Uint8Array(12));//Generace inicializačního vektoru
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const encryptedContent = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(JSON.stringify(dataObj)));//Převedení dat na bajty a jejich zašifrování pomocí hesla a vektoru
    return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(encryptedContent)) };
}

//Dešifrování dat hlavním heslem
async function decrypt(encryptedObj, password) {
    const salt = new Uint8Array(encryptedObj.salt);//Převedení pole čísel na Uint8Array
    const iv = new Uint8Array(encryptedObj.iv);//Převedení pole čísel na Uint8Array
    const data = new Uint8Array(encryptedObj.data);//Převedení pole čísel na Uint8Array
    const key = await deriveKey(password, salt);
    const decryptedContent = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decryptedContent));
}

//Supabase 
async function apiCall(path, method = "GET", body = null) {
    const options = {
        method: method,
        headers: {
            "apikey": SUPABASE_KEY,//Aurozační klíč pro Supabase
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${SUPABASE_URL}${path}`, options);//Poslání požadavku na Supabase
    if (!res.ok) throw new Error(`Chyba serveru: ${res.status}`);
    return res;
}

//Načtení uživatele podle emailu
async function fetchUser(email) {
    const res = await apiCall(`/rest/v1/vaults?user_email=eq.${email}&select=*`, "GET");
    const data = await res.json();
    return (data && data.length > 0) ? data[0] : null;
}

//Tlačítko pro přihlášení a registraci
btnSubmit.onclick = async () => {
    const email = inpEmail.value.trim();
    const pass = inpPass.value;
    if (!email || !pass) { msgError.textContent = "Vyplň vše"; return; }//Vymaže prázdné hodnoty
    btnSubmit.textContent = "Pracuju";
    msgError.textContent = "";
    try {
        if (isRegister) {
            const existing = await fetchUser(email);
            if (existing) throw new Error("Username je již použit");
            const encryptedData = await encrypt([], pass);//Zašifrování prázdných dat
            await apiCall("/rest/v1/vaults", "POST", { user_email: email, encrypted_data: encryptedData });//Odeslání dat na Supabase
            alert("Účet byl vytvořen");
            toggleMode(); 
        } else {
            const record = await fetchUser(email);
            if (!record) throw new Error("Uživatel nenalezen");
            vaultData = await decrypt(record.encrypted_data, pass);//Dešifrování dat
            masterKey = pass;
            currentEmail = email;
            showVault();
        }
    } catch (e) {
        console.error(e);
        msgError.textContent = isRegister ? "Chyba: " + e.message : "Špatné přihlašovací údaje";
    }
    btnSubmit.textContent = isRegister ? "Zaregistrovat se" : "Přihlásit se";
};

//Tlačítko na uložení
document.getElementById("btn-save").onclick = async () => {
    const site = document.getElementById("site").value;
    const login = document.getElementById("login").value;
    const pass = document.getElementById("pass").value;

    if (!site || !pass) { alert("Vyplňte data"); return; }

    loading.classList.remove("hidden");
    vaultData.push({ site, user: login, pass });//Přidání nových dat do RAM

    try {
        const encryptedData = await encrypt(vaultData, masterKey);//Zašifrování nových dat
        await apiCall(`/rest/v1/vaults?user_email=eq.${currentEmail}`, "PATCH", { encrypted_data: encryptedData, updated_at: new Date().toISOString() });//Odeslání dat na Supabase
        
        renderList();
        document.getElementById("site").value = "";
        document.getElementById("login").value = "";
        document.getElementById("pass").value = "";
    } catch (e) { alert("Chyba" + e.message); }
    loading.classList.add("hidden");
};

//Zobrazení trezoru s upraveným hezkým UI
function renderList() {
    const list = document.getElementById("vault-list");
    list.innerHTML = "";
    vaultData.forEach((item, index) => {
        const div = document.createElement("div");//Vytvoření nového prvku pro každý záznam
        div.className = "vault-item";
        div.innerHTML = `
            <div class="vault-info">
                <strong>${item.site}</strong>
                <span>${item.user}</span>
            </div>
            <div class="vault-actions">
                <button class="icon-btn" id="fill-${index}" title="Vyplnit"></button>
                <button class="icon-btn" id="del-${index}" title="Smazat"></button>
            </div>`;
        list.appendChild(div);
        
        document.getElementById(`del-${index}`).onclick = async () => {
            if(!confirm("Smazat")) return;
            loading.classList.remove("hidden");
            vaultData.splice(index, 1);
            const encryptedData = await encrypt(vaultData, masterKey);
            await apiCall(`/rest/v1/vaults?user_email=eq.${currentEmail}`, "PATCH", { encrypted_data: encryptedData });
            loading.classList.add("hidden");
            renderList();
        };
        
        document.getElementById(`fill-${index}`).onclick = async () => {
            try {
                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                if(tabs[0]) {
                    await browser.tabs.sendMessage(tabs[0].id, { action: "fill_data", username: item.user, password: item.pass });
                    window.close();
                }
            } catch (err) { console.error(err); }
        };
    });
}

//Přepínání mezi režimy a obrazovkami
function showVault() { elAuth.classList.add("hidden"); elVault.classList.remove("hidden"); document.getElementById("btn-logout").classList.remove("hidden"); renderList(); }//Otevření trezoru
function toggleMode() { isRegister = !isRegister; document.getElementById("auth-title").textContent = isRegister ? "Registrace" : "Přihlásit se"; document.getElementById("auth-sub").textContent = isRegister ? "Vytvoření nového trezoru" : "Data se stahují ze Supabase"; btnSubmit.textContent = isRegister ? "Zaregistrovat se" : "Přihlásit se"; document.getElementById("toggle-mode").textContent = isRegister ? "Zpět na přihlášení" : "Nemám účet (Registrace)"; msgError.textContent = ""; }//Přepínání mezi režimy přihlášení a registrace
document.getElementById("toggle-mode").onclick = toggleMode;//Tlačítko pro přepínání režimů
document.getElementById("btn-logout").onclick = () => location.reload();//Tlačítko pro odhlášení

const btnTheme = document.getElementById("btn-theme");

// Načtení uloženého motivu z localStorage po otevření okna
if (localStorage.getItem("foxpass_theme") === "dark") {
    document.body.classList.add("dark-mode");
    btnTheme.textContent = "☀️";
}

// Kliknutí na přepínač
btnTheme.onclick = () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("foxpass_theme", "dark");
        btnTheme.textContent = "☀️";
    } else {
        localStorage.setItem("foxpass_theme", "light");
        btnTheme.textContent = "🌙";
    }
};