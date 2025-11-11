console.log("Password wallet");
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "getCredentialHost") {
    const host = msg.host;
    return browser.storage.local.get(host).then(result => {
      const cred = result[host] || null;
      return { found: !!cred, cred };
    });
  }
  if (msg?.type === "log") {
    console.log("from page", msg.payload);
  }
});
