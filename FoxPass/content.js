const ICON_URL = browser.runtime.getURL("icon.png");
let lastClickedInput = null; 

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "fill_data") {
        fillInputsSmart(message.username, message.password);
    }
});

function scanInputs() {
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => {
        if (input.type === "hidden" || input.type === "submit" || input.type === "button" || input.style.display === "none") return;
        if (input.offsetParent === null) return;
        if (isPasswordInput(input) || isUsernameInput(input)) {
            if (!input.dataset.foxAttached) {
                attachIcon(input);
                input.dataset.foxAttached = "true";
            }
        }
    });
}

function isPasswordInput(input) { return input.type === "password"; }
function isUsernameInput(input) {
    if (input.type === "email") return true;
    if (input.type !== "text") return false;
    const str = (input.name + " " + input.id + " " + input.placeholder + " " + input.autocomplete).toLowerCase();
    const keywords = ["user", "login", "email", "mail", "name", "id", "account", "phone", "identifier", "přihláš", "jméno"];
    return keywords.some(k => str.includes(k));
}


function attachIcon(targetInput) {
    const wrapper = document.createElement("div"); 
    const icon = document.createElement("img");
    
    icon.src = ICON_URL;
    icon.title = "FoxPass: Klikni pro vyplnění";
    
    icon.style.width = "20px"; 
    icon.style.height = "20px";
    icon.style.display = "block";
    icon.style.cursor = "pointer";
    

    icon.style.filter = "hue-rotate(90deg) brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))";
    icon.style.transition = "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    icon.style.opacity = "0.7"; 

    wrapper.style.position = "absolute";
    wrapper.style.zIndex = "999999";
    wrapper.style.cursor = "pointer";
    wrapper.style.padding = "4px";
    wrapper.appendChild(icon);

    wrapper.onmouseenter = () => {
        icon.style.transform = "scale(1.2) translateY(-1px)";
        icon.style.opacity = "1";
        icon.style.filter = "hue-rotate(90deg) brightness(1.3) drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))";
    };
    wrapper.onmouseleave = () => {
        icon.style.transform = "scale(1)";
        icon.style.opacity = "0.7";
        icon.style.filter = "hue-rotate(90deg) brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))";
    };

    wrapper.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        lastClickedInput = targetInput;
        icon.style.transform = "scale(0.9)";
        setTimeout(() => icon.style.transform = "scale(1.2)", 100);
        browser.runtime.sendMessage({ action: "open_autofill_dialog" });
    };

    function updatePosition() {
        const rect = targetInput.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || targetInput.offsetParent === null) { 
            wrapper.style.display = "none"; return; 
        }
        wrapper.style.display = "block";
        
        const top = rect.top + window.scrollY + (rect.height / 2) - 14; 
        const left = rect.right + window.scrollX - 34; 
        
        wrapper.style.top = `${top}px`;
        wrapper.style.left = `${left}px`;
    }

    document.body.appendChild(wrapper);
    updatePosition();
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    new ResizeObserver(updatePosition).observe(targetInput);
}

function fillInputsSmart(user, pass) {
    if (lastClickedInput && document.body.contains(lastClickedInput)) {
        if (isPasswordInput(lastClickedInput)) {
            simulateTyping(lastClickedInput, pass);
            fillOtherField(user, false); 
        } else {
            simulateTyping(lastClickedInput, user);
            fillOtherField(pass, true);
        }
    } else {
        fillLegacy(user, pass);
    }
}

function fillOtherField(valueToFill, lookingForPassword) {
    const inputs = Array.from(document.querySelectorAll("input"));
    const target = inputs.find(input => {
        if (input === lastClickedInput) return false;
        if (input.offsetParent === null) return false;
        if (lookingForPassword) return isPasswordInput(input);
        else return isUsernameInput(input) && !isPasswordInput(input);
    });
    if (target) simulateTyping(target, valueToFill);
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
    
    const oldTrans = input.style.transition;
    const oldBg = input.style.backgroundColor;
    const oldShadow = input.style.boxShadow;
    
    input.style.transition = "all 0.5s ease";
    input.style.backgroundColor = "rgba(16, 185, 129, 0.1)"; 
    input.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.2)";

    setTimeout(() => {
        input.style.backgroundColor = oldBg;
        input.style.boxShadow = oldShadow;
        setTimeout(() => { input.style.transition = oldTrans; }, 500);
    }, 600);
}

setInterval(scanInputs, 1000);