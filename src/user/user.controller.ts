import { RequestHandler } from 'express';
import { Role, Prisma } from '@prisma/client';

import prisma from '../prisma.js';
import Password from '../helpers/password.js';
import { LTRes } from '../helpers/ltres.js';
import {
  isEmailValid,
  isUsernameValid,
  removePassword,
} from '../helpers/user.js';
import { username as usernameConfig } from '../config/littleterrarium.config.js';

export interface UserPreferences {
  [index: string]: any;
  theme?: string;
  locale?: string;
  plantListSort?: 'name' | 'date';
  plantListOrder?: 'asc' | 'desc';
}

const register: RequestHandler = async (req, res, next) => {
  const requiredFields = ['username', 'password', 'email'];
  const optionalFields = [
    'firstname',
    'lastname',
    'public',
    'bio',
  ];
  const data: any = {};

  for (const field of requiredFields) {
    // if a mandatory field isn't received, return with error
    if (!req.body[field]) {
      return next(LTRes.msg('MISSING_FIELD').errorField(field));
    }

    if (field === 'password') {
      const passwdCheck = Password.check(req.body.password);

      if (passwdCheck.valid) {
        data.password = await Password.hash(req.body.password);
      } else {
        return next(
          LTRes.msg('USER_PASSWD_INVALID').errorComp(passwdCheck.comp)
        );
      }
    } else {
      const isUsername =
        field === 'username' && !isUsernameValid(req.body.username);
      const isEmail = field === 'email' && !isEmailValid(req.body.email);

      if (isUsername || isEmail) {
        return next(LTRes.msg('USER_FIELD_INVALID').errorField(field));
      } else data[field] = req.body[field];
    }
  }

  // check through the optinal fields and add them if they're present
  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = req.body.public === true || req.body.public === 'true';
      } else data[field] = req.body[field];
    }
  }

  // if avatar
  if (req.disk.file) {
    data.avatar = {
      path: req.disk.file.path,
      webp: req.disk.file.webp ?? undefined,
    };
  }

  try {
    const user = await prisma.user.create({ data });

    req.session.signedIn = true;
    req.session.role = user.role;
    req.session.userId = user.id;

    res.send(removePassword(user));
  } catch (err: any) {
    if (err.code === 'P2002') {
      next(LTRes.msg('USER_FIELD_EXISTS').errorField(err.meta.target[0]));
    } else next(LTRes.createCode(500));
  }
};

/**
 *  Find user by username or user id
 */
const find: RequestHandler = async (req, res, next) => {
  const conditions: any = {};

  if (req.params.username) conditions.username = req.params.username;
  else if (req.parser.id) conditions.id = req.parser.id;
  else return next(LTRes.createCode(401));

  const user = await prisma.user.findUnique({
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
  });

  if (user) {
    if (
      user.public ||
      req.auth.userId === user.id ||
      req.session.role === Role.ADMIN
    ) {
      res.send(user);
    } else next(LTRes.msg('USER_PRIVATE').setCode(403));
  } else next(LTRes.msg('USER_NOT_FOUND'));
};

const modify: RequestHandler = async (req, res, next) => {
  const fields = [
    'username',
    'password',
    'email',
    'firstname',
    'lastname',
    'role',
    'public',
    'bio',
    'removeAvatar',
    'avatarFile',
    'preferences',
  ];
  const data: any = {};

  for (const field of fields) {
    if (!req.body[field]) continue;

    // check for username and email validity
    const invalidUsername =
      field === 'username' && !isUsernameValid(req.body.username);
    const invalidEmail =
      field === 'email' && !isEmailValid(req.body.email);

    if (invalidUsername || invalidEmail) {
      return next(LTRes.msg('USER_FIELD_INVALID').errorField(field));
    }

    switch (field) {
      case 'password': {
        const passwdCheck = Password.check(req.body.password);

        if (passwdCheck.valid) {
          data.password = await Password.hash(req.body.password);
        } else {
          return next(
            LTRes.msg('USER_PASSWD_INVALID').errorComp(passwdCheck.comp)
          );
        }

        break;
      }

      case 'role': {
        if (req.session.role === Role.ADMIN && req.body.role in Role) {
          data.role = req.body.role;
        } else return next(LTRes.createCode(403));

        break;
      }

      case 'public': {
        data.public = req.body.public === true || req.body.public === 'true';
        break;
      }

      case 'preferences': {
        // avoid adding possible malicious extra information
        const tempPrefs = JSON.parse(req.body.preferences);

        data.preferences = {
          theme: tempPrefs.theme,
          locale: tempPrefs.locale,
          plantListSort: tempPrefs.plantListSort,
          plantListOrder: tempPrefs.plantListOrder,
        }

        break;
      }

      case 'removeAvatar': {
        data.avatar = Prisma.JsonNull;

        break;
      }

      default: {
        data[field] = req.body[field];
      }
    }
  }

  // Avatar upload, managed by uploader middleware
  if (!req.body.removeAvatar && req.disk.file) {
    data.avatar = {
      path: req.disk.file.path,
      webp: req.disk.file.webp ?? undefined,
    };
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.auth.userId },
      data,
    });

    res.send(removePassword(user));
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(
        LTRes.msg('USER_FIELD_EXISTS').errorField(err.meta.target[0])
      );
    } else return next(LTRes.createCode(500));
  }
};

const remove: RequestHandler = async (req, res, next) => {
  if (req.params.id) {
    try {
      await prisma.user.delete({ where: { id: +req.params.id }});

      res.send(LTRes.createCode(204));
    } catch (err: any) {
      return next(LTRes.msg('USER_NOT_FOUND'));
    }
  } else return next(LTRes.createCode(400));
};

const checkPassword: RequestHandler = (req, res, next) => {
  const { password } = req.body;

  if (password) {
    const pcheck = Password.check(req.body.password);

    if (pcheck.valid) res.send(LTRes.msg('PASSWD_VALID'));
    else next(LTRes.msg('USER_PASSWD_INVALID').errorComp(pcheck.comp));
  } else return next(LTRes.createCode(400));
};

const passwordRequirements: RequestHandler = (req, res, next) => {
  res.send(Password.requirements());
};

const usernameRequirements: RequestHandler = (req, res, next) => {
  res.send(usernameConfig);
};

export default {
  register,
  find,
  modify,
  remove,
  checkPassword,
  passwordRequirements,
  usernameRequirements,
};
