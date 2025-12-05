// popup.js - FINÁLNÍ VERZE PRO KOMUNIKACI S BACKENDEM

// --- KONSTANTY ---
const API_URL = 'http://localhost:3000/api/passwords'; 

// --- Získání elementů ---
const webInput = document.getElementById("webInput");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passInput");
const noteInput = document.getElementById("noteInput");
const addBtn = document.getElementById("addBtn");

// Elementy pro seznam
const list = document.getElementById("list");
const noItemsMsg = document.getElementById("noItems");

// Elementy pro editaci
const editBox = document.getElementById("editBox"); 
const editWeb = document.getElementById("editWeb");
const editUser = document.getElementById("editUser");
const editPass = document.getElementById("editPass");
const editNote = document.getElementById("editNote");
const saveEditBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const closeBtn = document.getElementById("closeBtn");

// Index/ID položky, která se právě edituje (nyní ukládáme ID ze serveru)
let currentEditIndex = -1; 


// --- Funkce pro Vykreslení Seznamu (ČTENÍ - GET) ---
async function renderEntries() {
  list.innerHTML = "";
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Chyba při stahování dat ze serveru.');
    
    const entries = await response.json(); // Data přijdou ze serveru
    
    if (entries.length === 0) {
      noItemsMsg.style.display = 'block';
      return;
    }
    
    noItemsMsg.style.display = 'none';

    entries.forEach((e) => {
      const listItem = document.createElement("li");
      listItem.className = "entry";
      
      // DŮLEŽITÉ: Používáme e.id, které nám dal server, pro Editaci
      listItem.innerHTML = `
        <div class="left">
          <span class="host">${e.site}</span>
          <span class="small">${e.username} (${e.note || 'bez poznámky'})</span>
        </div>
        <div class="actionBtns">
          <button class="fill" data-host="${e.site}">Vyplnit</button>
          <button class="copy" data-copy-content="${e.password}">Kopírovat</button>
          <button class="edit" data-id="${e.id}">Upravit</button> 
        </div>
      `;
      list.appendChild(listItem);
    });
    
  } catch (error) {
    console.error("Chyba při načítání dat ze serveru:", error);
    noItemsMsg.textContent = "Chyba při načítání dat ze serveru.";
    noItemsMsg.style.display = 'block';
  }
}

// --- Ukládání nové položky (PŘIDÁNÍ - POST) ---
addBtn.addEventListener("click", async () => {
  let site = webInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const username = userInput.value.trim();
  const password = passInput.value.trim();
  const note = noteInput.value.trim();
  
  // Logika pro localhost
  if (!site || site === 'file:') {
    site = 'localhost';
  }

  if (!username || !password) {
    alert("Uživatelské jméno a heslo jsou povinné!");
    return;
  }
  
  const entry = { site, username, password, note }; // Data k odeslání

  try {
    const response = await fetch(API_URL, {
      method: 'POST', // Použití POST pro přidání
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });

    if (!response.ok) throw new Error('Ukládání na server selhalo');
    
    // Data úspěšně uložena na server
    webInput.value = userInput.value = passInput.value = noteInput.value = "";
    renderEntries(); // Znovu načíst data ze serveru
  } catch (e) {
    console.error("Chyba při ukládání na server:", e);
    alert("Chyba při ukládání hesla.");
  }
});


// --- Listenery pro tlačítka v Seznamu (Vyplnit/Kopírovat/Upravit) ---
list.addEventListener('click', async (event) => {
  const target = event.target;
  let host = target.getAttribute('data-host'); 
  // Zde získáme ID záznamu ze serveru
  let id = parseInt(target.getAttribute('data-id')); 

  // Vyplnit
  if (target.classList.contains('fill')) {
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
      browser.tabs.sendMessage(tabs[0].id, {
        type: "autofillManual",
        host: host
      }).then(() => {
        window.close();
      }).catch(error => {
        console.error("Chyba při ručním vyplnění:", error);
      });
    });
  }
  
  // Kopírovat
  if (target.classList.contains('copy')) {
    const content = target.getAttribute('data-copy-content');
    navigator.clipboard.writeText(content).then(() => {
      target.textContent = 'OK!';
      setTimeout(() => target.textContent = 'Kopírovat', 1500);
    });
  }

  // Upravit
  if (target.classList.contains('edit')) {
    openEditModal(id); // Předáváme ID
  }
});

// --- Funkce pro Modální okno Editace ---

async function openEditModal(id) {
  // Stáhnout všechna data ze serveru a najít položku podle ID
  const response = await fetch(API_URL);
  const entries = await response.json();
  const entry = entries.find(e => e.id === id); // Hledání podle ID
  
  if (!entry) return; 
  
  currentEditIndex = id; // Používáme ID jako referenci (místo indexu)

  editWeb.value = entry.site;
  editUser.value = entry.username;
  editPass.value = entry.password;
  editNote.value = entry.note;

  editBox.classList.remove('hidden');
}

function closeEditModal() {
  editBox.classList.add('hidden');
  currentEditIndex = -1; 
}

// Listener pro zavření modalu
closeBtn.addEventListener('click', closeEditModal);

// Uložení změn (ÚPRAVA - PUT)
saveEditBtn.addEventListener('click', async () => {
  if (currentEditIndex === -1) return; // currentEditIndex je ID
  
  const updatedEntry = {
    username: editUser.value.trim(),
    password: editPass.value.trim(),
    note: editNote.value.trim()
  };
  
  try {
    // Volání PUT na specifické ID
    const response = await fetch(`${API_URL}/${currentEditIndex}`, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEntry)
    });
    
    if (!response.ok) throw new Error('Chyba při ukládání změn na server.');
    
    closeEditModal();
    renderEntries();
  } catch (e) {
    console.error("Chyba při ukládání úprav:", e);
    alert("Chyba při ukládání úprav.");
  }
});

// Smazání záznamu (SMAZÁNÍ - DELETE)
deleteBtn.addEventListener('click', async () => {
  if (currentEditIndex === -1) return; // currentEditIndex je ID

  if (confirm('Opravdu chcete smazat tento záznam?')) {
    try {
      // Volání DELETE na specifické ID
      const response = await fetch(`${API_URL}/${currentEditIndex}`, {
        method: 'DELETE'
      });

      if (response.status !== 204) throw new Error('Chyba při mazání na serveru.'); // 204 No Content
      
      closeEditModal();
      renderEntries();
    } catch (e) {
      console.error("Chyba při mazání:", e);
      alert("Chyba při mazání záznamu.");
    }
  }
});

// --- Spuštění při načtení popupu ---
renderEntries();
