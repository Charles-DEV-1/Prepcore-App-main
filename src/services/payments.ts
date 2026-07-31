import { FLUTTERWAVE_SECRET_KEY } from '../lib/env';

export type FlutterwaveSession = {
  link: string;
  tx_ref: string;
};

export async function createFlutterwavePaymentLink(
  userId: string,
  email: string | null | undefined,
  fullName: string | null | undefined
): Promise<FlutterwaveSession> {
  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error('Missing Flutterwave secret key. Set flutterwaveSecretKey in app config.');
  }

  const tx_ref = `prepcore_${userId}_${Date.now()}`;
  const body = {
    tx_ref,
    amount: '2000',
    currency: 'NGN',
    redirect_url: 'https://prepcore.com.ng/payment-return',
    customer: {
      email: email ?? 'student@prepcore.com.ng',
      name: fullName ?? 'Prepcore student'
    },
    customizations: {
      title: 'Prepcore Pro',
      description: 'Upgrade to Prepcore Pro for unlimited mock exams and premium analytics'
    }
  };

  let response: Response;

  try {
    response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(err instanceof Error ? `Flutterwave network request failed: ${err.message}` : 'Flutterwave network request failed.');
  }

  const data = await response.json();
  if (!response.ok || data.status !== 'success') {
    throw new Error(data.message || `Unable to create payment link. ${JSON.stringify(data)}`);
  }

  return {
    link: data.data.link,
    tx_ref: data.data.tx_ref
  };
}

export async function verifyFlutterwaveTransaction(tx_ref: string) {
  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error('Missing Flutterwave secret key.');
  }

  let response: Response;
  try {
    response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_txref?tx_ref=${encodeURIComponent(tx_ref)}`, {
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`
      }
    });
  } catch (err) {
    throw new Error(err instanceof Error ? `Flutterwave verification request failed: ${err.message}` : 'Flutterwave verification request failed.');
  }

  const data = await response.json();
  if (!response.ok || data.status !== 'success') {
    throw new Error(data.message || `Unable to verify Flutterwave transaction. ${JSON.stringify(data)}`);
  }

  return data.data.status === 'successful';
}
