(function() {
  function autofill(username, password, web) {
    try {
      var hesloInput = document.querySelector('input[type=password]');
      if (!hesloInput) return false;
      var uzivatelInput = document.querySelector(
        'input[type=email], input[name*=user], input[name*=login], input[id*=user], input[type=text]:not([type=password])'
      );
      if (uzivatelInput && username) {
        uzivatelInput.focus();
        uzivatelInput.value = username;
        uzivatelInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (hesloInput && password) {
        hesloInput.focus();
        hesloInput.value = password;
        hesloInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      console.log("Údaje vyplněny pro " + web);
      return true;
    } catch (e) {
      console.error("Autofill chyba:", e);
      return false;
    }
  }
  function startAutofill() {
    var web = location.hostname.replace(/^www\./, '');
    if (location.protocol === 'file:') {
        web = 'localhost';
    }
    browser.runtime.sendMessage({ type: "getCredentialsForHost", host: web })
      .then(function(odpoved) {
        if (odpoved && odpoved.found && odpoved.cred) {
          autofill(odpoved.cred.username, odpoved.cred.password, web);
        } else {
          console.log("Nic pro " + web + " nenalezeno k automatickému vyplnění.");
        }
      })
      .catch(function(chyba) {
        console.error("Chyba při komunikaci s background skriptem:", chyba);
      });
  }
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "autofillManual") {
      const { host } = msg;
      browser.runtime.sendMessage({ type: "getCredentialsForHost", host: host })
        .then(function(odpoved) {
          if (odpoved && odpoved.found && odpoved.cred) {
            autofill(odpoved.cred.username, odpoved.cred.password, host);
          } else {
            console.log("Ruční vyplnění selhalo: Nic nenalezeno.");
          }
        });
      return true; 
    }
  });
  startAutofill();
})();
