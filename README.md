# Payment Instructions Endpoint

This repository implements the **Payment Instructions** feature for the Onboarding flow.

It includes:

* A new endpoint
* A parser that extracts transfer instructions WITHOUT REGEX
* A service layer that stores parsed data
* Tests using Mock Models

---

## 📌 Endpoint: `/onboarding/payment-instructions`

### **Method:** `POST`

### **Auth:** Public

### **Purpose**

Accept a free‑form banking instruction text and extract structured fields:

* Sender account name
* Sender account number
* Sender bank name
* Recipient account name
* Recipient account number
* Recipient bank name

The extracted values are saved into the database and returned in the response.

---

## 🧩 Data Flow Overview

```
➡️ Request Body
    { "paymentInstructions": "...raw text..." }
        ⬇
➡️ Validator (Zod)
        ⬇
➡️ Parser (no regex, simple string search)
        ⬇
➡️ Service (stores results)
        ⬇
➡️ Response (structured JSON)
```

---

## 📥 Example Request

```json
POST /onboarding/payment-instructions
Content-Type: application/json

{
  "paymentInstructions": "Sender: John Doe \n Account Number: 1234567890 \n Bank: First Bank"
}
```

## 📤 Example Response

```json
{
  "success": true,
  "data": {
    "senderAccountName": "John Doe",
    "senderAccountNumber": "1234567890",
    "senderBankName": "First Bank",
    "recipientAccountName": null,
    "recipientAccountNumber": null,
    "recipientBankName": null
  }
}
```

---

## 🛠️ Project Structure

```
endpoints/
└── onboarding/
    └── payment-instructions.js

services/
└── payment-instructions/
       ├── index.js
       └── parser.js

test/
└── payment-instructions.test.js
```

---

## 🧠 Parser Rules (NO REGEX)

The parser scans for these labels:

```
Sender Name
Sender Account Number
Sender Bank Name
Recipient Name
Recipient Account Number
Recipient Bank Name
```

It supports variations like:

```
Sender:
Sender Name is
Sender Account Number -
```

And stops capturing when it reaches:

* A newline
* Another known label
* End of string

---

## 🧪 Running Tests

Tests use Mock Models.

```
npm test
```

Example output:

```
Payment Instructions Parser
  ✓ should extract sender information
  ✓ should handle missing fields
  ✓ should extract recipient fields
  ✓ should return null for unsupported text
```

---

## 🚀 Running Locally

```
npm install
node app.js
```

Server starts on:

```
http://localhost:8811
```

---

## 📌 Notes

No database: uses in-memory storage for accounts & transactions

No regex: parser uses string manipulation only (split, substring, etc.)

Future Execution: Transactions with ON date in the future are marked pending

---

## 📖 API Documentation

### `POST /onboarding/payment-instructions`

| Field               | Type   | Required |
| ------------------- | ------ | -------- |
| paymentInstructions | string | Yes      |

Response:

```
{
  success: boolean,
  data: {
    senderAccountName,
    senderAccountNumber,
    senderBankName,
    recipientAccountName,
    recipientAccountNumber,
    recipientBankName
  }
}
```

## 👤 Author

Oluwatosin Alewi
📧 [Email](alewitosino208@gmail.com)
 | 🌐 [GitHub](https://github.com/eoalewi)
 | 🔗 [LinkedIn](https://linkedin.com/in/alewioe)

```

