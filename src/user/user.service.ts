import { Prisma, User, UserRecoveryToken } from '@prisma/client';
import crypto from 'node:crypto';
import dayjs from 'dayjs';

import prisma from '../prisma';
import Password from '../helpers/password.js';
import { username as usernameConfig } from '../config/littleterrarium.config.js';

export type UserWithoutPassword = Omit<User, 'password'>;
export type UserWithoutPrivateProperties = Omit<
  User,
  | 'password'
  | 'email'
  | 'preferences'
  | 'recoveryToken'
  | 'status'
  | 'updatedAt'
>;

export const isEmailValid = (email: string): boolean => {
  return email.match(/^\S+@\S+\.\S+$/i) !== null;
};

export const removePassword = (user: User): UserWithoutPassword => {
  // to remove the password hash from the object
  const partialUser: Partial<User> = user;
  delete partialUser.password;

  return partialUser as UserWithoutPassword;
};

export const isUsernameValid = (username: string): boolean => {
  const min = usernameConfig.minLength;
  const max = usernameConfig.maxLength;
  const rtest = `^(?=.{${min},${max}}$)[a-zA-Z0-9._-]+$`;
  const regexp = new RegExp(rtest);

  return regexp.test(username);
};

export const userService = Prisma.defineExtension({
  name: 'user',
  model: {
    user: {
      async ltCreate(
        data: Prisma.UserCreateInput
      ): Promise<UserWithoutPassword> {
        const user = await prisma.user.create({ data });

        return removePassword(user);
      },

      ltFind(
        conditions: Prisma.UserWhereUniqueInput
      ): Promise<UserWithoutPrivateProperties> {
        return prisma.user.findUnique({
          where: conditions,
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            bio: true,
            avatar: true,
            role: true,
            public: true,
            createdAt: true,
          },
        }) as Promise<UserWithoutPrivateProperties>;
      },

      async ltUpdate(
        data: Prisma.UserUpdateInput,
        userId: number
      ): Promise<UserWithoutPassword> {
        const user = await prisma.user.update({
          where: { id: userId },
          data,
        });

        return removePassword(user);
      },

      findUserByRef(reference: string): Promise<User | null> {
        let user;

        if (isEmailValid(reference)) {
          user = prisma.user.findUnique({ where: { email: reference } });
        } else {
          user = prisma.user.findUnique({ where: { username: reference } });
        }

        return user;
      },
    },
    userRecoveryToken: {
      startRecovery(userId: number): Promise<UserRecoveryToken> {
        const token = crypto.randomBytes(32).toString('hex');
        const tomorrow = dayjs().add(1, 'day').toDate();

        return prisma.userRecoveryToken.upsert({
          where: {
            userId,
          },
          update: {
            token,
            expiry: tomorrow,
          },
          create: {
            userId,
            token,
            expiry: tomorrow,
          },
        });
      },

      async resetPassword(userId: number, password: string) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            password: await Password.hash(password),
          },
        });

        await prisma.userRecoveryToken.delete({ where: { userId } });
      },
    },
  },
});
