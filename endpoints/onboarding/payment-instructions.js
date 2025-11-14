const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const paymentService = require('@app/services/payment-instructions');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'payment-instruction-request-completed');
  },

  
  async handler(rc, helpers) {
    try {
      const payload = rc.body || {};
      const response = await paymentService(payload);
      const statusCode =
        response.status === 'failed' &&
        response.status_code &&
        response.status_code.startsWith('SY')
          ? 400
          : response.status === 'failed'
            ? 400
            : 200;
      return {
        status:
          statusCode === 200
            ? helpers.http_statuses.HTTP_200_OK
            : helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: response,
      };
    } catch (err) {
      appLogger.error({ err }, 'internal-error-payment-instruction');
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          type: null,
          amount: null,
          currency: null,
          debit_account: null,
          credit_account: null,
          execute_by: null,
          status: 'failed',
          status_reason: 'Internal server error',
          status_code: 'SY03',
          accounts: [],
        },
      };
    }
  },
});
