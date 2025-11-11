const siteInput = document.getElementById("site");
const userInput = document.getElementById("username");
const passInput = document.getElementById("password");
const saveBtn = document.getElementById("saveBtn");
const savedEntriesDiv = document.getElementById("savedEntries");
saveBtn.addEventListener("click", async () => {
  const site = siteInput.value.trim();
  const username = userInput.value.trim();
  const password = passInput.value.trim();
  if (!site || !username || !password) return;
  const entry = { site, username, password };
  const { entries = [] } = await browser.storage.local.get("entries");
  entries.push(entry);
  await browser.storage.local.set({ entries });
  siteInput.value = userInput.value = passInput.value = "";
  renderEntries();
});
async function renderEntries() {
  const { entries = [] } = await browser.storage.local.get("entries");
  savedEntriesDiv.innerHTML = "";
  for (const e of entries) {
    const div = document.createElement("div");
    div.textContent = `${e.site}: ${e.username} / ${e.password}`;
    savedEntriesDiv.appendChild(div);
  }
}
renderEntries();
