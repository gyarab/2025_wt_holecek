(function() {
  try {
    var hesloInput = document.querySelector('input[type=password]');
    if (!hesloInput) return;
    var uzivatelInput = document.querySelector(
      'input[type=email], input[name*=user], input[name*=login], input[id*=user], input[type=text]'
    );
    var web = location.hostname.replace(/^www\./, '');
    browser.runtime.sendMessage({ type: "getCredentialsForHost", host: web })
      .then(function(odpoved) {
        if (odpoved && odpoved.found && odpoved.cred) {
          var jmeno = odpoved.cred.username;
          var heslo = odpoved.cred.password;
          if (uzivatelInput && jmeno) {
            uzivatelInput.focus();
            uzivatelInput.value = jmeno;
            uzivatelInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (hesloInput && heslo) {
            hesloInput.focus();
            hesloInput.value = heslo;
            hesloInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          console.log("vyplneny udaje " + web);
        } else {
          console.log("nic sem nenasel " + web);
        }
      })
      .catch(function(chyba) {
        console.error("neco je wrong", chyba);
      });
  } catch (e) {
    console.error("autofill chyba", e);
  }
})();
