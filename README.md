# Payment Instruction Parser API

A **Node.js + Express API** that parses, validates, and executes structured payment instructions for financial transactions.

The API simulates a core fintech functionality: moving money between accounts according to DEBIT/CREDIT instructions, with robust validation and clear response codes.

---

## 🛠️ Features

- Parse structured payment instructions (DEBIT / CREDIT formats)
- Validate instructions against business rules:
  - Amount positivity
  - Supported currencies (NGN, USD, GBP, GHS)
  - Account existence and uniqueness
  - Sufficient funds for debit
  - Proper instruction syntax and keyword order
  - Optional scheduled execution (`ON YYYY-MM-DD`)
- Execute transactions immediately or schedule for future dates
- Clear response with transaction status, reason, and updated account balances
- Handles both valid and invalid instructions gracefully
- No regex used – parsing is done using string manipulation

---

## 📦 Endpoint

### POST `/payment-instructions`

**Request Body Example:**

```json
{
  "accounts": [
    {"id": "a", "balance": 230, "currency": "USD"},
    {"id": "b", "balance": 300, "currency": "USD"}
  ],
  "instruction": "DEBIT 30 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
}
````

**Successful Response:**

```json
{
  "type": "DEBIT",
  "amount": 30,
  "currency": "USD",
  "debit_account": "a",
  "credit_account": "b",
  "execute_by": null,
  "status": "successful",
  "status_reason": "Transaction executed successfully",
  "status_code": "AP00",
  "accounts": [
    {
      "id": "a",
      "balance": 200,
      "balance_before": 230,
      "currency": "USD"
    },
    {
      "id": "b",
      "balance": 330,
      "balance_before": 300,
      "currency": "USD"
    }
  ]
}
```

**Error Response (e.g., unsupported currency):**

```json
{
  "type": "DEBIT",
  "amount": 30,
  "currency": "EUR",
  "debit_account": "a",
  "credit_account": "b",
  "execute_by": null,
  "status": "failed",
  "status_reason": "Unsupported currency. Only NGN, USD, GBP, and GHS are supported",
  "status_code": "CU02",
  "accounts": [
    {
      "id": "a",
      "balance": 230,
      "balance_before": 230,
      "currency": "USD"
    },
    {
      "id": "b",
      "balance": 300,
      "balance_before": 300,
      "currency": "USD"
    }
  ]
}
```

**Unparseable Instruction Response:**

```json
{
  "type": null,
  "amount": null,
  "currency": null,
  "debit_account": null,
  "credit_account": null,
  "execute_by": null,
  "status": "failed",
  "status_reason": "Malformed instruction: unable to parse keywords",
  "status_code": "SY03",
  "accounts": []
}
```

---

## ⚙️ Installation

1. Clone the repo:

```bash
git clone https://github.com/eoalewi/payment-instruction-parser
cd payment-instruction-parser
```

2. Install dependencies:

```bash
npm install
```

3. Start the server locally:

```bash
npm start
```

The API will run on `http://localhost:8811/payment-instructions`.

---

## 🌐 Deployment

This API is deployed on **Render**:

**Base URL:**
[https://payment-instruction-parser-q94u.onrender.com](https://payment-instruction-parser-q94u.onrender.com)

You can send POST requests directly to this URL.

---

## 📝 Parsing Rules

* **Instruction formats supported:**

  1. `DEBIT [amount] [currency] FROM ACCOUNT [account_id] FOR CREDIT TO ACCOUNT [account_id] [ON [date]]`
  2. `CREDIT [amount] [currency] TO ACCOUNT [account_id] FOR DEBIT FROM ACCOUNT [account_id] [ON [date]]`

* **Keyword rules:** Case-insensitive, must be in correct order

* **Amount:** Positive integers only

* **Currency:** NGN, USD, GBP, GHS

* **Date:** Optional, `YYYY-MM-DD`, future dates mark transaction as pending

* **Accounts:** Must exist in the `accounts` array and be unique

---

## ✅ Status Codes

| Code | Status Reason                                |
| ---- | -------------------------------------------- |
| AM01 | Amount must be a positive integer            |
| CU01 | Account currency mismatch                    |
| CU02 | Unsupported currency                         |
| AC01 | Insufficient funds in debit account          |
| AC02 | Debit and credit accounts cannot be the same |
| AC03 | Account not found                            |
| AC04 | Invalid account ID format                    |
| DT01 | Invalid date format                          |
| SY01 | Missing required keyword                     |
| SY02 | Invalid keyword order                        |
| SY03 | Malformed instruction                        |
| AP00 | Transaction executed successfully            |
| AP02 | Transaction scheduled for future execution   |

---

## 🧪 Testing

You can test the endpoint using **Postman**, **cURL**, or any HTTP client.
Example with cURL:

```bash
curl -X POST https://payment-instruction-parser-q94u.onrender.com/payment-instructions \
-H "Content-Type: application/json" \
-d '{
  "accounts": [
    {"id": "a", "balance": 230, "currency": "USD"},
    {"id": "b", "balance": 300, "currency": "USD"}
  ],
  "instruction": "DEBIT 30 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b"
}'
```

---

## 💻 Tech Stack

* Node.js (Vanilla JS)
* Express.js
* Render (Cloud Deployment)
* No database required (in-memory execution)

---

## 📝 Notes

* No regular expressions used for parsing
* Handles multiple spacing, case-insensitive keywords
* Immediate or scheduled execution based on `ON` date
* Designed for **backend assessment** submission

---

## 👤 Author

Oluwatosin Alewi
📧 [Email](alewitosino208@gmail.com)
 | 🌐 [GitHub](https://github.com/eoalewi)
 | 🔗 [LinkedIn](https://linkedin.com/in/alewioe)
 |🔗 [Deployed API](https://payment-instruction-parser-q94u.onrender.com)

```

