/**
 * Outbound SMS utility for Africa's Talking API
 */

export interface SmsSendResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function sendSms(to: string, message: string): Promise<SmsSendResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
  const senderId = process.env.AFRICASTALKING_SENDER_ID?.trim();

  if (!apiKey) {
    console.error('[AfricaTalking SMS] Error: AFRICASTALKING_API_KEY is not defined.');
    return { success: false, error: 'AFRICASTALKING_API_KEY is not defined.' };
  }

  const endpoint = 'https://api.africastalking.com/version1/messaging';

  const formParams = new URLSearchParams();
  formParams.append('username', username);
  formParams.append('to', to);
  formParams.append('message', message);

  if (senderId) {
    formParams.append('from', senderId);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formParams.toString(),
    });

    const responseText = await response.text();
    let responseData: unknown = responseText;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    if (!response.ok) {
      console.error(
        `[AfricaTalking SMS] Request failed with HTTP ${response.status}:`,
        responseData,
      );
      return {
        success: false,
        error: `AT API returned status ${response.status}`,
        data: responseData,
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AfricaTalking SMS] Network or unexpected error:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

