browser.runtime.onStartup.addListener(() => { 
    browser.storage.local.remove(["sessionKey", "sessionEmail", "lastActive"]);
});

browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "open_autofill_dialog") { 
        let domain = "";
        try { domain = new URL(sender.tab.url).hostname; } catch (e) {}

        browser.windows.create({
            url: `autofill.html?tabId=${sender.tab.id}&domain=${domain}`,
            type: "popup",
            width: 480, 
            height: 640,
            left: 100,
            top: 100
        });
    }
});