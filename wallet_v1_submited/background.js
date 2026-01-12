// background.js - Koordinátor
browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "open_autofill_dialog") {
        // Získáme doménu stránky, kde uživatel je
        let domain = "";
        try { domain = new URL(sender.tab.url).hostname; } catch (e) {}

        // Otevřeme malé okno pro zadání hesla
        browser.windows.create({
            url: `autofill.html?tabId=${sender.tab.id}&domain=${domain}`,
            type: "popup",
            width: 360,
            height: 500,
            left: 100,
            top: 100
        });
    }
});