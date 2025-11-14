const { assert } = require('chai');
const service = require('@app/services/payment-instructions');

describe('Payment instructions service', () => {
  it('should execute a simple DEBIT transaction', async () => {
    const payload = {
      accounts: [
        { id: 'N90394', balance: 1000, currency: 'USD' },
        { id: 'N9122', balance: 500, currency: 'USD' },
      ],
      instruction: 'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122',
    };
    const res = await service(payload);
    assert.equal(res.status, 'successful');
    assert.equal(res.status_code, 'AP00');
    const a = res.accounts.find((x) => x.id === 'N90394');
    const b = res.accounts.find((x) => x.id === 'N9122');
    assert.equal(a.balance, 500);
    assert.equal(b.balance, 1000);
  });
  it('should return pending for future ON date', async () => {
    const payload = {
      accounts: [
        { id: 'acc-001', balance: 1000, currency: 'NGN' },
        { id: 'acc-002', balance: 500, currency: 'NGN' },
      ],
      instruction: 'CREDIT 300 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001 ON 2099-12-31',
    };
    const res = await service(payload);
    assert.equal(res.status, 'pending');
    assert.equal(res.status_code, 'AP02');
    const a = res.accounts.find((x) => x.id === 'acc-001');
    const b = res.accounts.find((x) => x.id === 'acc-002');
    assert.equal(a.balance, 1000);
    assert.equal(b.balance, 500);
  });
  it('should fail on currency mismatch', async () => {
    const payload = {
      accounts: [
        { id: 'a', balance: 100, currency: 'USD' },
        { id: 'b', balance: 500, currency: 'GBP' },
      ],
      instruction: 'DEBIT 50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
    };
    const res = await service(payload);
    assert.equal(res.status_code, 'CU01');
  });
  it('should fail on insufficient funds', async () => {
    const payload = {
      accounts: [
        { id: 'a', balance: 100, currency: 'USD' },
        { id: 'b', balance: 500, currency: 'USD' },
      ],
      instruction: 'DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
    };
    const res = await service(payload);
    assert.equal(res.status_code, 'AC01');
  });
});
