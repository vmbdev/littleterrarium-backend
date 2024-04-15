import { User } from '@prisma/client';
import { username as usernameConfig } from '../config/littleterrarium.config.js';

export type UserWithoutPassword = Omit<User, 'password'>;

export const isEmailValid = (email: string): boolean => {
  return email.match(/^\S+@\S+\.\S+$/i) !== null;
};

export const removePassword = (user: User): UserWithoutPassword => {
  // to remove the password hash from the object
  const partialUser: Partial<User> = user;
  delete partialUser.password;

  return partialUser as User;
};

export const isUsernameValid = (username: string): boolean => {
  const min = usernameConfig.minLength;
  const max = usernameConfig.maxLength;
  const rtest = `^(?=.{${min},${max}}$)[a-zA-Z0-9._-]+$`;
  const regexp = new RegExp(rtest);

  return regexp.test(username);
};
