import { RequestHandler } from 'express';
import crypto from 'node:crypto';
import dayjs from 'dayjs';
import { User } from '@prisma/client';

import prisma from '../prismainstance.js';
import Password from '../helpers/password.js';
import { LTRes } from '../helpers/ltres.js';
import mailer from '../helpers/mailer.js';
import { isEmailValid, removePassword } from '../helpers/user.js';

const find: RequestHandler = async (req, res, next) => {
  if (!req.session.signedIn) return next(LTRes.createCode(401));

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId }
  });

  if (user) res.send(removePassword(user));
  else next(LTRes.msg('USER_NOT_FOUND'));
};

const signin: RequestHandler = async (req, res, next) => {
  const { username, password } = req.body;

  if (username && password) {
    // did the user logged in with the username or with the password?
    const signinToken = isEmailValid(username) ? 'email' : 'username';
    const user = await prisma.user.findFirst({
      where: { [signinToken]: username },
    });

    if (user) {
      const passwdCorrect = await Password.compare(password, user.password);

      if (passwdCorrect) {
        req.session.signedIn = true;
        req.session.role = user.role;
        req.session.userId = user.id;

        res.send(removePassword(user));
      } else next(LTRes.msg('USER_DATA_INCORRECT').setCode(401));
    }
    // we never give information on whether the user exists or not here
    else next(LTRes.msg('USER_DATA_INCORRECT').setCode(401));
  }
};

const logout: RequestHandler = (req, res, next) => {
  req.session.destroy(() => {
    res.send(LTRes.createCode(204));
  });
};

const forgottenPassword: RequestHandler = async (req, res, next) => {
  const userRef = req.body.userRef;

  if (!userRef) return next(LTRes.createCode(400));

  let user: User | null;

  if (isEmailValid(userRef)) {
    user = await prisma.user.findUnique({ where: { email: userRef } });
  } else {
    user = await prisma.user.findUnique({ where: { username: userRef } });
  }

  if (!user) {
    return next(LTRes.msg('USER_DATA_INCORRECT').setCode(401));
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tomorrow = dayjs().add(1, 'day').toDate();

  const tokenRes = await prisma.userRecoveryToken.upsert({
    where: {
      userId: user.id,
    },
    update: {
      token,
      expiry: tomorrow,
    },
    create: {
      userId: user.id,
      token,
      expiry: tomorrow,
    },
  });

  if (tokenRes) {
    mailer.sendUserRecovery(user.email, tokenRes.token, tokenRes.userId);
    res.send(LTRes.createCode(204));
  } else next(LTRes.createCode(500));
};

const restore: RequestHandler = async (req, res, next) => {
  const { token, password }: { token: string; password: string } = req.body;
  const userId: number = +req.body.userId;

  if (!token || !password || !userId) return next(LTRes.createCode(400));

  const savedToken = await prisma.userRecoveryToken.findUnique({
    where: { token, userId },
  });

  if (savedToken) {
    if (dayjs(savedToken.expiry).isBefore(dayjs())) {
      return next(LTRes.msg('USER_TOKEN_EXPIRED').setCode(400));
    }

    const pcheck = Password.check(password);

    if (pcheck.valid) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            password: await Password.hash(password),
          },
        });

        await prisma.userRecoveryToken.delete({ where: { userId } });

        res.send(LTRes.createCode(204));
      } catch (err) {
        return next(LTRes.createCode(500));
      }
    } else return next(LTRes.msg('USER_PASSWD_INVALID').errorComp(pcheck.comp));
  } else return next(LTRes.msg('USER_TOKEN_INVALID').setCode(400));
};

const verifyToken: RequestHandler = async (req, res, next) => {
  const { token } = req.body;
  const userId = +req.body.userId;

  if (!token || !userId) return next(LTRes.createCode(400));

  const savedToken = await prisma.userRecoveryToken.findUnique({
    where: { token, userId },
  });

  if (savedToken) {
    if (dayjs(savedToken.expiry).isBefore(dayjs())) {
      return next(LTRes.msg('USER_TOKEN_EXPIRED').setCode(400));
    } else res.send(LTRes.createCode(204));
  } else return next(LTRes.msg('USER_TOKEN_INVALID').setCode(400));
};

export default {
  find,
  signin,
  logout,
  forgottenPassword,
  restore,
  verifyToken,
}