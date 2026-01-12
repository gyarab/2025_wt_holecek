// content.js - Běží na cizí stránce
const ICON_URL = browser.runtime.getURL("icon.jpg");
let lastClickedInput = null; // Zde si pamatujeme, na kterou ikonku uživatel klikl

// 1. Přijímáme data z doplňku (po odemčení)
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "fill_data") {
        fillInputsSmart(message.username, message.password);
    }
});

// 2. Hledáme inputy a lepíme ikonky
function scanInputs() {
    const inputs = document.querySelectorAll("input");
    
    inputs.forEach(input => {
        // Ignorovat nepodstatné
        if (input.type === "hidden" || input.type === "submit" || input.type === "button" || input.style.display === "none") return;
        if (input.offsetParent === null) return; // Neviditelné

        // Je to pole pro heslo nebo login?
        if (isPasswordInput(input) || isUsernameInput(input)) {
            if (!input.dataset.foxAttached) {
                attachIcon(input);
                input.dataset.foxAttached = "true";
            }
        }
    });
}

function isPasswordInput(input) {
    return input.type === "password";
}

function isUsernameInput(input) {
    if (input.type === "email") return true;
    if (input.type !== "text") return false;

    const str = (input.name + " " + input.id + " " + input.placeholder + " " + input.autocomplete).toLowerCase();
    const keywords = ["user", "login", "email", "mail", "name", "id", "account", "phone", "identifier"];
    
    return keywords.some(k => str.includes(k));
}

// 3. Ikonka
function attachIcon(targetInput) {
    const icon = document.createElement("img");
    icon.src = ICON_URL;
    icon.style.position = "absolute";
    icon.style.cursor = "pointer";
    icon.style.zIndex = "99999";
    icon.title = "FoxPass";
    icon.style.width = "24px";
    icon.style.height = "24px";
    
    // KLÍČOVÁ ZMĚNA: Když kliknu na ikonu, zapamatuji si input
    icon.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastClickedInput = targetInput; // <--- ULOŽÍME SI CÍL
        browser.runtime.sendMessage({ action: "open_autofill_dialog" });
    };

    function updatePosition() {
        const rect = targetInput.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) { icon.style.display = "none"; return; }
        icon.style.display = "block";
        const top = rect.top + window.scrollY + (rect.height / 2) - 12;
        const left = rect.right + window.scrollX - 35; 
        icon.style.top = `${top}px`;
        icon.style.left = `${left}px`;
    }

    document.body.appendChild(icon);
    updatePosition();
    
    // Aktualizace pozice
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    new ResizeObserver(updatePosition).observe(targetInput);
}

// 4. CHYTRÉ VYPLNĚNÍ (Opravená logika)
function fillInputsSmart(user, pass) {
    
    // A) Pokud víme, na co uživatel klikl, začneme tím
    if (lastClickedInput && document.body.contains(lastClickedInput)) {
        
        // Co je to za pole, na které se kliklo?
        if (isPasswordInput(lastClickedInput)) {
            // Klikl na HESLO -> Vyplň heslo
            simulateTyping(lastClickedInput, pass);
            // A zkus najít pole pro jméno (obvykle bývá PŘED heslem)
            fillOtherField(user, false); 
        } else {
            // Klikl na TEXT/EMAIL -> Vyplň jméno
            simulateTyping(lastClickedInput, user);
            // A zkus najít pole pro heslo (obvykle bývá PO jménu)
            fillOtherField(pass, true);
        }
    } 
    // B) Pokud nevíme, kam klikl (divné), jedeme postaru
    else {
        fillLegacy(user, pass);
    }
}

// Pomocná funkce pro dohledání "toho druhého" pole
function fillOtherField(valueToFill, lookingForPassword) {
    const inputs = Array.from(document.querySelectorAll("input"));
    
    // Najdeme to druhé pole, které je viditelné a prázdné
    const target = inputs.find(input => {
        if (input === lastClickedInput) return false; // Není to to samé
        if (input.offsetParent === null) return false; // Je vidět
        if (lookingForPassword) return isPasswordInput(input);
        else return isUsernameInput(input) && !isPasswordInput(input);
    });

    if (target) {
        simulateTyping(target, valueToFill);
    }
}

function fillLegacy(user, pass) {
    document.querySelectorAll("input").forEach(input => {
        if (input.offsetParent === null) return;
        if (isPasswordInput(input)) simulateTyping(input, pass);
        else if (isUsernameInput(input)) simulateTyping(input, user);
    });
}

function simulateTyping(input, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Bliknutí pro efekt
    const oldBg = input.style.backgroundColor;
    input.style.backgroundColor = "#dbeafe"; // Světle modrá
    setTimeout(() => input.style.backgroundColor = oldBg, 500);
}

setInterval(scanInputs, 1000);