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

### 1. Test Environment
You can test the extension's capabilities (autofill, icon detection, password generation) without visiting real websites using the provided test environment.
1. Open the file **`testweb.html`** in your Firefox browser.
2. Test **Login** (Fox icon appears), **Sign Up** (Password generator), and **Change Password** detection.

### 2. 🔑 Demo Account (Ready to Use)
For quick testing and review purposes, a pre-configured account with existing data is available. You don't need to register.

* **Email:** `test_account`
* **Password:** `12345678`

> **Note:** This account contains dummy data for demonstration purposes.

## ✨ Features
* **Zero-Knowledge Architecture:** Passwords are encrypted on the client side before reaching the database.
* **Auto-Lock:** Vault locks automatically when the browser is restarted.
* **Password Health:** Visual strength meter and reuse warnings.
* **Import/Export:** Support for JSON backup.
