const ICON_URL = browser.runtime.getURL("icon.jpg");
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
function attachIcon(targetInput) {
    const icon = document.createElement("img");
    icon.src = ICON_URL;
    icon.style.position = "absolute";
    icon.style.cursor = "pointer";
    icon.style.zIndex = "99999";
    icon.title = "FoxPass";
    icon.style.width = "24px";
    icon.style.height = "24px";
    icon.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastClickedInput = targetInput; //
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
    } 
    else {
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
    const oldBg = input.style.backgroundColor;
    input.style.backgroundColor = "#dbeafe";
    setTimeout(() => input.style.backgroundColor = oldBg, 500);
}
setInterval(scanInputs, 1000);