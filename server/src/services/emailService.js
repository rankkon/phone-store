import { ApiError } from '../utils/ApiError.js';

const BREVO_TRANSACTIONAL_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 15_000;

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'Phone Store';
  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName };
}

export function ensureEmailDeliveryConfigured() {
  const config = getBrevoConfig();
  if (!config) {
    throw new ApiError(503, 'Chức năng gửi mã chưa được cấu hình dịch vụ email Brevo.');
  }
  return config;
}

export async function sendTransactionalEmail({ to, subject, text, html }) {
  const { apiKey, senderEmail, senderName } = ensureEmailDeliveryConfigured();
  let response;

  try {
    response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'phone-store/1.0',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new ApiError(504, 'Dịch vụ gửi email phản hồi quá lâu. Vui lòng thử lại sau.');
    }
    throw new ApiError(502, 'Không thể kết nối đến dịch vụ gửi email. Vui lòng thử lại sau.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('Brevo email request failed:', response.status, payload?.message || payload?.code || 'No response message');
    throw new ApiError(502, 'Không thể gửi mã qua email. Vui lòng thử lại sau.');
  }

  return payload;
}
