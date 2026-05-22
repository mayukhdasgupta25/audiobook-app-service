/**
 * Payment stub for subscription renewals until a real gateway is integrated.
 * Set SUBSCRIPTION_PAYMENT_ALWAYS_SUCCEED=false to simulate failures in dev/tests.
 */
export function attemptRenewalPaymentSync(): boolean {
  const raw = process.env['SUBSCRIPTION_PAYMENT_ALWAYS_SUCCEED'];
  if (raw === undefined || raw === '') {
    return true;
  }
  return raw.toLowerCase() !== 'false' && raw !== '0';
}

export async function attemptRenewalPayment(): Promise<boolean> {
  return attemptRenewalPaymentSync();
}
