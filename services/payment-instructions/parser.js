// Parser implementation using only string operations (no regular expressions)
function isTokenEmpty(t) {
  return t === undefined || t === null || (typeof t === 'string' && t.trim() === '');
}
function normalizeTokens(instruction) {
  // Split on space and remove empty tokens (handles multiple spaces)
  const parts = instruction.split(' ');
  const tokens = parts.filter((p) => p !== '').map((p) => p.trim());
  return tokens;
}
function isValidAccountId(id) {
  if (typeof id !== 'string' || id.length === 0) return false;
  for (let i = 0; i < id.length; i += 1) {
    const ch = id[i];
    const code = ch.charCodeAt(0);
    // allow letters A-Z a-z, digits 0-9, hyphen '-', period '.', at '@'
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isDigit = code >= 48 && code <= 57;
    const isAllowedSymbol = ch === '-' || ch === '.' || ch === '@';
    if (!(isLetter || isDigit || isAllowedSymbol)) return false;
  }
  return true;
}
function parseDateToken(token) {
  // Must be YYYY-MM-DD
  if (typeof token !== 'string') return null;
  const parts = token.split('-');
  if (parts.length !== 3) return null;
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y.length !== 4 || m.length !== 2 || d.length !== 2) return null;
  const yi = parseInt(y, 10);
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  if (Number.isNaN(yi) || Number.isNaN(mi) || Number.isNaN(di)) return null;
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  // Basic sanity OK; detailed day-per-month check not strictly required by spec
  return `${y}-${m}-${d}`;
}
function parseAmountToken(token) {
  if (typeof token !== 'string') return null;
  // Reject decimal amounts or non-integers: no '.' allowed
  if (token.indexOf('.') !== -1) return null;
  const parsed = parseInt(token, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
function buildUnparseable() {
  return {
    status_code: 'SY03',
    status_reason: 'Malformed instruction: unable to parse keywords',
  };
}
function parseInstruction(instruction) {
  if (typeof instruction !== 'string' || instruction.trim() === '') {
    return buildUnparseable();
  }
  // Normalize tokens (split by space - removes extra spaces)
  const raw = instruction.trim();
  const tokens = normalizeTokens(raw);
  if (tokens.length < 7) {
    // too short to be valid
    return buildUnparseable();
  }
  const lc = tokens.map((t) => t.toLowerCase());
  const first = lc[0];
  if (first !== 'debit' && first !== 'credit') {
    return buildUnparseable();
  }
  const type = tokens[0].toUpperCase();
  // amount is token[1], currency token[2]
  const amountToken = tokens[1];
  const currencyToken = tokens[2];
  const amount = parseAmountToken(amountToken);
  if (amount === null) {
    return {
      type,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status_code: 'AM01',
      status_reason: 'Amount must be a positive integer',
    };
  }
  const currency = typeof currencyToken === 'string' ? currencyToken.toUpperCase() : null;
  // Now branch on type to enforce keyword order
  if (first === 'debit') {
    // Expected sequence after currency: FROM ACCOUNT <debitId> FOR CREDIT TO ACCOUNT <creditId> [ON <date>]
    // Find 'from' occurrence after index 2
    const idxFrom = lc.indexOf('from', 3);
    if (idxFrom === -1)
      return {
        status_code: 'SY01',
        status_reason: 'Missing required keyword FROM',
        type: type || null,
        amount,
        currency,
      };
    if (lc[idxFrom + 1] !== 'account')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: FROM must be followed by ACCOUNT',
        type: type || null,
        amount,
        currency,
      };
    const debitId = tokens[idxFrom + 2];
    if (isTokenEmpty(debitId)) return buildUnparseable();
    if (!isValidAccountId(debitId))
      return {
        type,
        amount,
        currency,
        debit_account: null,
        credit_account: null,
        execute_by: null,
        status_code: 'AC04',
        status_reason: 'Invalid account ID format',
      };
    // Find 'for' after debit id
    const idxFor = lc.indexOf('for', idxFrom + 3);
    if (idxFor === -1)
      return {
        status_code: 'SY01',
        status_reason: 'Missing required keyword FOR',
        type,
        amount,
        currency,
      };
    if (lc[idxFor + 1] !== 'credit')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: FOR must be followed by CREDIT',
        type,
        amount,
        currency,
      };
    if (lc[idxFor + 2] !== 'to')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: CREDIT must be followed by TO',
        type,
        amount,
        currency,
      };
    if (lc[idxFor + 3] !== 'account')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: TO must be followed by ACCOUNT',
        type,
        amount,
        currency,
      };
    const creditId = tokens[idxFor + 4];
    if (isTokenEmpty(creditId)) return buildUnparseable();
    if (!isValidAccountId(creditId))
      return {
        type,
        amount,
        currency,
        debit_account: debitId,
        credit_account: null,
        execute_by: null,
        status_code: 'AC04',
        status_reason: 'Invalid account ID format',
      };
    // Optional ON clause should appear after creditId
    const potentialOnIdx = idxFor + 5;
    let execute_by = null;
    if (potentialOnIdx < tokens.length) {
      if (lc[potentialOnIdx] === 'on') {
        const dateToken = tokens[potentialOnIdx + 1];
        const parsedDate = parseDateToken(dateToken);
        if (!parsedDate) {
          return {
            type,
            amount,
            currency,
            debit_account: debitId,
            credit_account: creditId,
            execute_by: null,
            status_code: 'DT01',
            status_reason: 'Invalid date format',
          };
        }
        execute_by = parsedDate;
      } else {
        // If there are extra trailing tokens that aren't ON date, syntax might be malformed
        // But not strictly required - we will ignore extra trailing tokens if they aren't keywords
      }
    }
    return {
      type,
      amount,
      currency,
      debit_account: debitId,
      credit_account: creditId,
      execute_by,
      status_code: 'OK',
      status_reason: 'Parsed',
    };
  }
  // credit format
  // Expected after currency: TO ACCOUNT <creditId> FOR DEBIT FROM ACCOUNT <debitId> [ON <date>]
  if (first === 'credit') {
    const idxTo = lc.indexOf('to', 3);
    if (idxTo === -1)
      return {
        status_code: 'SY01',
        status_reason: 'Missing required keyword TO',
        type,
        amount,
        currency,
      };
    if (lc[idxTo + 1] !== 'account')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: TO must be followed by ACCOUNT',
        type,
        amount,
        currency,
      };
    const creditId = tokens[idxTo + 2];
    if (isTokenEmpty(creditId)) return buildUnparseable();
    if (!isValidAccountId(creditId))
      return {
        type,
        amount,
        currency,
        debit_account: null,
        credit_account: creditId,
        execute_by: null,
        status_code: 'AC04',
        status_reason: 'Invalid account ID format',
      };
    const idxFor = lc.indexOf('for', idxTo + 3);
    if (idxFor === -1)
      return {
        status_code: 'SY01',
        status_reason: 'Missing required keyword FOR',
        type,
        amount,
        currency,
      };
    if (lc[idxFor + 1] !== 'debit')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: FOR must be followed by DEBIT',
        type,
        amount,
        currency,
      };
    const idxFrom = lc.indexOf('from', idxFor + 2);
    if (idxFrom === -1)
      return {
        status_code: 'SY01',
        status_reason: 'Missing required keyword FROM',
        type,
        amount,
        currency,
      };
    if (lc[idxFrom + 1] !== 'account')
      return {
        status_code: 'SY02',
        status_reason: 'Invalid keyword order: FROM must be followed by ACCOUNT',
        type,
        amount,
        currency,
      };
    const debitId = tokens[idxFrom + 2];
    if (isTokenEmpty(debitId)) return buildUnparseable();
    if (!isValidAccountId(debitId))
      return {
        type,
        amount,
        currency,
        debit_account: debitId,
        credit_account: creditId,
        execute_by: null,
        status_code: 'AC04',
        status_reason: 'Invalid account ID format',
      };
    // Optional ON clause after debit id
    const potentialOnIdx = idxFrom + 3;
    let execute_by = null;
    if (potentialOnIdx < tokens.length) {
      if (lc[potentialOnIdx] === 'on') {
        const dateToken = tokens[potentialOnIdx + 1];
        const parsedDate = parseDateToken(dateToken);
        if (!parsedDate) {
          return {
            type,
            amount,
            currency,
            debit_account: debitId,
            credit_account: creditId,
            execute_by: null,
            status_code: 'DT01',
            status_reason: 'Invalid date format',
          };
        }
        execute_by = parsedDate;
      }
    }
    return {
      type,
      amount,
      currency,
      debit_account: debitId,
      credit_account: creditId,
      execute_by,
      status_code: 'OK',
      status_reason: 'Parsed',
    };
  }
  return buildUnparseable();
}
module.exports = { parseInstruction };
