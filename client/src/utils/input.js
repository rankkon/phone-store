const personNamePattern = /^[\p{L}]+(?:[\p{L} .'-]*[\p{L}])?$/u;

export function onlyDigits(value, maxLength = 15) {
  return String(value || '').replace(/\D/g, '').slice(0, maxLength);
}

export function onlyPersonName(value, maxLength = 100) {
  return String(value || '')
    .replace(/[^\p{L} .'-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLength);
}

export function isValidPersonName(value) {
  const name = String(value || '').trim();
  return name.length >= 2 && name.length <= 100 && personNamePattern.test(name);
}

export function isValidPhone(value, { required = false } = {}) {
  const phone = String(value || '').trim();
  return !phone ? !required : /^\d{9,15}$/.test(phone);
}
