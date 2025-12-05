console.log("Password wallet je spuštěn (Finální verze)");
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "getCredentialsForHost") {
    const requestedHost = msg.host;
    return fetch('http://localhost:3000/api/passwords') 
      .then(response => {
        if (!response.ok) throw new Error('Chyba serveru při autofill');
        return response.json();
      })
      .then(entries => {
        const cred = entries.find(entry => entry.site === requestedHost);
        if (cred) {
          console.log(`Nalezeny údaje pro hosta: ${requestedHost}`);
          return { found: true, cred: { username: cred.username, password: cred.password } };
        } else {
          console.log(`Nenalezeny žádné údaje pro hosta: ${requestedHost}`);
          return { found: false };
        }
      })
      .catch(error => {
        console.error("Chyba při komunikaci se serverem pro autofill:", error);
        return { found: false };
      });
  }
  if (msg?.type === "log") {
    console.log("Zpráva ze stránky:", msg.payload);
  }
});
