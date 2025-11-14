const parser = require('./parser');
/**
 * Main service that accepts payload { accounts: [...], instruction: '...' }
 * Returns the response object following the assessment specification.
 */
module.exports = async function paymentInstructionsService(payload) {
  const accounts = Array.isArray(payload.accounts) ? payload.accounts.slice() : [];
  const instruction = typeof payload.instruction === 'string' ? payload.instruction : '';
  // parse instruction (no regex used inside parser)
  const parsed = parser.parseInstruction(instruction);
  // If unparseable
  if (parsed.status_code === 'SY03') {
    return {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: parsed.status_reason,
      status_code: parsed.status_code,
      accounts: [],
    };
  }
  // Now run validations against provided accounts and business rules
  const {
    type,
    amount,
    currency,
    debit_account: debitId,
    credit_account: creditId,
    execute_by,
  } = parsed;
  // Helper to find account and preserve request order later
  const findAccount = (id) => accounts.find((a) => a && a.id === id);
  const debitAccount = findAccount(debitId);
  const creditAccount = findAccount(creditId);
  // Build base response shape
  const baseResponse = {
    type,
    amount,
    currency,
    debit_account: debitId || null,
    credit_account: creditId || null,
    execute_by: execute_by || null,
    status: 'failed',
    status_reason: '',
    status_code: '',
    accounts: [],
  };
  // Validate that both account IDs can be located in the input accounts array
  if (!debitAccount || !creditAccount) {
    baseResponse.status_reason = 'Account not found';
    baseResponse.status_code = 'AC03';
    // Return the two accounts if any identified (spec: only the two accounts involved, ordered as in request accounts array). If not found, accounts[] should be [] or those present
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  
  // Currency support
  const SUPPORTED = ['NGN', 'USD', 'GBP', 'GHS'];
  if (!currency || SUPPORTED.indexOf(currency.toUpperCase()) === -1) {
    baseResponse.status_reason = 'Unsupported currency. Only NGN, USD, GBP, and GHS are supported';
    baseResponse.status_code = 'CU02';
    // return accounts in order from request for those two ids
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  // Ensure account currencies match parsed currency
  const daCurrency = (debitAccount.currency || '').toUpperCase();
  const caCurrency = (creditAccount.currency || '').toUpperCase();
  if (daCurrency !== currency.toUpperCase() || caCurrency !== currency.toUpperCase()) {
    baseResponse.status_reason = 'Account currency mismatch';
    baseResponse.status_code = 'CU01';
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  // Debit and credit must differ
  if (debitId === creditId) {
    baseResponse.status_reason = 'Debit and credit accounts cannot be the same';
    baseResponse.status_code = 'AC02';
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  // Amount positive integer check
  if (!Number.isInteger(amount) || amount <= 0) {
    baseResponse.status_reason = 'Amount must be a positive integer';
    baseResponse.status_code = 'AM01';
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  // Sufficient funds
  if (typeof debitAccount.balance !== 'number' || debitAccount.balance < amount) {
    baseResponse.status_reason = `Insufficient funds in debit account $
 {debitId}: has ${debitAccount.balance} ${daCurrency}, needs ${amount} $
 {currency}`;
    baseResponse.status_code = 'AC01';
    const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
    baseResponse.accounts = involved.map((a) => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: (a.currency || '').toUpperCase(),
    }));
    return baseResponse;
  }
  // Now check execution date
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); // midnight UTC today
  if (execute_by) {
    // parsed.execute_by validated format already in parser
    const [y, m, d] = execute_by.split('-').map((t) => parseInt(t, 10));
    const executeDateUTC = new Date(Date.UTC(y, m - 1, d));
    if (executeDateUTC.getTime() > utcNow.getTime()) {
      // Pending - do not modify balances
      baseResponse.status = 'pending';
      baseResponse.status_reason = 'Transaction scheduled for future execution';
      baseResponse.status_code = 'AP02';
      const involved = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
      baseResponse.accounts = involved.map((a) => ({
        id: a.id,
        balance: a.balance,
        balance_before: a.balance,
        currency: (a.currency || '').toUpperCase(),
      }));
      return baseResponse;
    }
  }
  // Execute transaction now: update balances
  const debitBefore = debitAccount.balance;
  const creditBefore = creditAccount.balance;
  debitAccount.balance = debitBefore - amount;
  creditAccount.balance = creditBefore + amount;
  baseResponse.status = 'successful';
  baseResponse.status_reason = 'Transaction executed successfully';
  baseResponse.status_code = 'AP00';
  // Return only the two accounts involved in the order they appear in the original request
  const involvedOrdered = accounts.filter((a) => a && (a.id === debitId || a.id === creditId));
  baseResponse.accounts = involvedOrdered.map((a) => ({
    id: a.id,
    balance: a.balance,
    balance_before: a.id === debitId ? debitBefore : creditBefore,
    currency: (a.currency || '').toUpperCase(),
  }));
  return baseResponse;
};
