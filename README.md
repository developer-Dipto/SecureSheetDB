# 🔐 SecureSheetDB

**A Zero-Knowledge, End-to-End Encrypted Database using Google Sheets.**

SecureSheetDB allows you to use a free Google Sheet as a secure backend database. All data is compressed and encrypted in the browser (Client-Side) before it reaches Google servers. Even Google cannot read your data.

---

## 🚀 Features

- **Zero-Knowledge Privacy:** Google only sees encrypted random text. Only you possess the decryption key.
- **High Security:** Uses **AES-GCM-256** encryption and **HMAC SHA-256** signatures to prevent tampering.
- **Smart Storage:** Uses **LZ-String** compression to reduce data size by 60–70% before encryption.
- **Lazy Loading:** Supports pagination (load data in chunks) to keep your app fast.
- **Serverless & Free:** No database hosting costs; it runs entirely on Google Apps Script.
- **Easy to Use:** Simple API (`save`, `read`, `delete`) similar to MongoDB or Firebase.

---

## 💡 Use Cases

- **Personal Vaults:** Store passwords, diaries, or private notes securely.
- **API Key Manager:** Save your API keys for other projects in a secure place.
- **Internal Tools:** Build simple admin panels where data privacy is critical.
- **Prototypes:** Quickly build a backend for your apps without setting up a server.

---

## ⚙️ How It Works

1. **Encryption:** When you save data, the library compresses it and encrypts it using your **User Password**.
2. **Transmission:** The encrypted data is signed with an **API Secret** and sent to Google Sheets.
3. **Storage:** Google Sheets appends the encrypted string. It does not know the actual content.
4. **Decryption:** When you fetch data, the browser downloads the encrypted string and decrypts it locally using your password.

---

## 🛠 Deployment Guide (Backend Setup)

You need to set up the Google Sheet first.

1. Create a new **Google Sheet**.
2. Rename the sheet tab (at the bottom) to `Database`.
3. Go to **Extensions** > **Apps Script**.
4. Copy the code from `Code.gs` (provided in this repo) and paste it into the editor.
5. **Important:** Update the `API_SECRET` variable in the script with a strong password.
6. Click **Deploy** > **New Deployment**.
   - **Select type:** Web App  
   - **Execute as:** Me  
   - **Who has access:** Anyone
7. Copy the **Web App URL**. You will need this for the frontend.

---

## 📦 How to Use (Frontend)

You can use `SecureSheetDB` directly in your HTML file via CDN.

### 1. Import Libraries

Include **LZ-String** (required dependency) and **SecureSheetDB**.

`
<!-- 1. LZ-String (Dependency for compression) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script>

<!-- 2. SecureSheetDB (Your Library) -->
<script src="https://cdn.jsdelivr.net/gh/developer-Dipto/SecureSheetDB@main/SecureSheetDB.js"></script>
`

---

### 2. Initialize the Databas

`
// Replace with your Google Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

const db = new SecureSheetDB(SCRIPT_URL);

// Set your Security Keys
// 1. User Password: Used to Encrypt/Decrypt data (Keep this safe!)
// 2. API Secret: Must match the API_SECRET in your Google Apps Script
db.setKeys('my-strong-password', 'my-api-secret-123');
`

---

### 3. Save Data (Create / Update)

You can save any JSON object. It will be compressed and encrypted automatically.

`
const myData = {
  name: "Dipto",
  role: "Developer",
  bio: "This is a secret bio."
};

// Save data
db.save(myData).then(response => {
  console.log(response.message);
});

// To Update: Pass the ID as the second parameter
// db.save(myData, '1766542243090');
`

---

### 4. Read Data (Lazy Loading)

Fetch data with pagination (offset and limit).

`
// Read first 10 records
db.read(0, 10).then(response => {
  if (response.status === 'success') {
    console.log("Decrypted Data:", response.data);
    // Output: [{ id: "...", name: "Dipto", ... }]
  }
});
`

---

### 5. Delete Data

`
db.delete('UNIQUE_RECORD_ID').then(response => {
  console.log(response.message);
});
`

---

## ⚠️ Security Warning

* **Don't lose your User Password:** Since this is a Zero-Knowledge system, there is no "Forgot Password" option. If you lose your key, the data in the Google Sheet is permanently unreadable (it will just be random gibberish).
* **API Secret:** Keep your `API_SECRET` safe. It prevents unauthorized people from spamming your database.

---

## 📄 License

This project is open-source. Feel free to use it for personal or commercial projects.

---

## 🔗 Resources

* **Apps Script URL:** [https://script.google.com/d/1nAGh6f4UxnrycH7U94kPFIoUHefAnwn0WP18SKkbjGK69h-qle4-NAAO/](https://script.google.com/d/1nAGh6f4UxnrycH7U94kPFIoUHefAnwn0WP18SKkbjGK69h-qle4-NAAO/)
* **Google Sheet URL:** [https://docs.google.com/spreadsheets/d/1-QswTOUP5yXpoFTHhUem0mfSiSM3maz-RFvhS8HPnLw/](https://docs.google.com/spreadsheets/d/1-QswTOUP5yXpoFTHhUem0mfSiSM3maz-RFvhS8HPnLw/)
