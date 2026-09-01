const PENDING_EMAIL_VERIFICATION_KEY = 'phone_store_pending_email_verification';

function isValidPendingVerification(value) {
  return Boolean(value
    && typeof value.email === 'string'
    && typeof value.verificationToken === 'string'
    && value.email.trim()
    && value.verificationToken.trim());
}

export function savePendingEmailVerification(value) {
  if (!isValidPendingVerification(value)) return;
  sessionStorage.setItem(PENDING_EMAIL_VERIFICATION_KEY, JSON.stringify({
    email: value.email.trim(),
    verificationToken: value.verificationToken,
  }));
}

export function getPendingEmailVerification() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_EMAIL_VERIFICATION_KEY) || 'null');
    return isValidPendingVerification(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingEmailVerification() {
  sessionStorage.removeItem(PENDING_EMAIL_VERIFICATION_KEY);
}
