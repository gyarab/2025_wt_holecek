# FoxPass Pro 🦊

School year project. A secure password manager extension designed for simplicity and security.

👉 **[Available on Firefox Add-ons Store](https://addons.mozilla.org/cs/firefox/addon/foxpass-pro/)**

> 🚧 **Status: In Development**
> Please note that this extension is currently a work in progress. Features are being actively developed and tested.

## 🛠 Services & Tech Stack
* **Supabase** (Backend database for encrypted vaults)
* **Web Crypto API** (Client-side AES-GCM encryption)
* **Firefox WebExtension API** (Browser integration)

## 🧪 How to Test
You can test the extension's capabilities (autofill, icon detection, password generation) without visiting real websites using the provided test environment.

1. Ensure the extension is installed and you are logged in.
2. Open the file **`testweb.html`** in your Firefox browser.
3. You can test the following scenarios:
    * **Login:** Check if the Fox icon appears and offers to fill credentials.
    * **Sign Up:** Use the password generator (dice icon) to create a strong password.
    * **Change Password:** Verify that the extension correctly distinguishes between old and new password fields.
