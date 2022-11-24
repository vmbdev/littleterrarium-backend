import bcrypt from 'bcrypt';
import { password as passwordConfig } from '../../littleterrarium.config';

export type PasswordCheckResult = {
  valid: boolean;
  comp: {
    minLength?: boolean,
    hasUppercase?: boolean,
    hasNumber?: boolean,
    hasNonAlphanumeric?: boolean
  }
}

const hash = (password: string) => {
  return bcrypt.hash(password, 10);
}

const compare = (password: string , hash: string) => {
  return bcrypt.compare(password, hash);
}

const check = (password: string): PasswordCheckResult => {
  const result: PasswordCheckResult = { valid: true, comp: {} };

  result.comp.minLength = (password.length >= passwordConfig.minLength);

  if (passwordConfig.requireUppercase) {
    result.comp.hasUppercase = (/.*([A-Z]).*/).test(password);
    result.valid = result.comp.hasUppercase;
  }

  if (passwordConfig.requireNumber) {
    result.comp.hasNumber = (/.*(\d).*/).test(password);
    result.valid = result.comp.hasNumber;
  }

  if (passwordConfig.requireNonAlphanumeric) {
    result.comp.hasNonAlphanumeric = (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/).test(password);
    result.valid = result.comp.hasNonAlphanumeric;
  }

  return result;
}

const requirements = () => {
  return passwordConfig;
}

export default {
  hash,
  compare,
  check,
  requirements
};