import { capitalizeFirstLetter } from './format.ts';

const NAME_CHARS_PATTERN = /^[\p{L}\s'.-]+$/u;
const HAS_LETTER_PATTERN = /\p{L}/u;
const EMAIL_LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function isValidEvaluatorEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length <= 64 && EMAIL_LOCAL_PATTERN.test(local) && EMAIL_DOMAIN_PATTERN.test(domain);
}

export function normalizeAndValidateEvaluatorProfile(input: {
  firstName: string;
  middleInitial: string;
  lastName: string;
  specialization: string;
}): { ok: true; firstName: string; middleInitial: string; lastName: string; specialization: string } | { ok: false; error: string } {
  const firstName = capitalizeFirstLetter(input.firstName.trim().replace(/\s+/g, ' '));
  const middleInitial = input.middleInitial.trim()
    ? capitalizeFirstLetter(input.middleInitial.trim().replace(/\s+/g, ' '))
    : '';
  const lastName = capitalizeFirstLetter(input.lastName.trim().replace(/\s+/g, ' '));
  const specialization = input.specialization.trim();

  if (!firstName || !NAME_CHARS_PATTERN.test(firstName) || !HAS_LETTER_PATTERN.test(firstName)) {
    return { ok: false, error: 'First name is required and may only contain letters, spaces, periods, hyphens, and apostrophes.' };
  }
  if (middleInitial && (!NAME_CHARS_PATTERN.test(middleInitial) || !HAS_LETTER_PATTERN.test(middleInitial))) {
    return { ok: false, error: 'Middle initial may only contain letters, spaces, periods, hyphens, and apostrophes.' };
  }
  if (!lastName || !NAME_CHARS_PATTERN.test(lastName) || !HAS_LETTER_PATTERN.test(lastName)) {
    return { ok: false, error: 'Last name is required and may only contain letters, spaces, periods, hyphens, and apostrophes.' };
  }
  const tags = specialization.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (tags.length === 0 || tags.length > 20 || tags.some((tag) => tag.length > 80)) {
    return { ok: false, error: 'Enter between 1 and 20 specializations (up to 80 characters each).' };
  }

  return { ok: true, firstName, middleInitial, lastName, specialization };
}

export function validateEvaluatorInvitePassword(password: string, confirmPassword: string): string | null {
  if (!password.trim() || password.length < 8 || password.length > 128) {
    return 'Password must be between 8 and 128 characters.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}
