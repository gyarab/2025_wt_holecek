# FoxPass

FoxPass is a simple and secure Firefox browser extension I made to save, encrypt, and auto-fill your passwords. It uses end-to-end encryption, which means your sensitive data is locked, and only you can open it with your master password. 

## Key Features
* **Safe & Secure**: It uses standard AES-GCM encryption and PBKDF2 to keep your data completely safe.
* **Cloud Sync**: All your encrypted passwords are saved online using a Supabase database, so you don't lose them.
* **Auto-fill**: The extension automatically types your username and password into web forms for you.
* **Dark Mode**: You can switch between light and dark themes, and it remembers your choice for next time.
* **Easy to Use**: You can easily add, delete, and scroll through your saved accounts right from the popup window.

## Tech Stack
* **Frontend**: HTML5, CSS3, Vanilla JavaScript.
* **Security**: Web Crypto API.
* **Backend**: Supabase (REST API).
* **Platform**: Web Extensions API (Manifest V3 for Firefox).

## What the files do
* **manifest.json**: The main settings and permissions for the extension (including the specific setup for Firefox).
* **index.html**: The visual popup window you see when you click the extension.
* **style.css**: The design, colors, and dark mode styles.
* **popup.js**: The brain of the app. It handles the encryption, talking to the database, and button clicks.
* **content.js**: A background script that finds the login boxes on the website and fills them in.
* **icon.jpg**: The logo for the extension (I generated this using Gemini).

## How to install and test it in Firefox
1. Download all the project files into a folder on your computer.
2. Open Firefox and type `about:debugging` into the address bar.
3. Click on "This Firefox" in the left menu.
4. Click the "Load Temporary Add-on..." button and select the `manifest.json` file from the folder you downloaded.
5. Pin the FoxPass icon to your toolbar so you can reach it easily.

## Test Account
I already set up a test account so you can try it out right away without registering:
* **Account**: test_account
* **Password**: 12345678
