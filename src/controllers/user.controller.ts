import { Request, Response, NextFunction, RequestHandler } from 'express';
import { User, Role } from '@prisma/client';
import prisma from '../prismainstance';
import Password from '../helpers/password';

const isEmail = (email: string): boolean => {
  return (email.match(/^\S+@\S+\.\S+$/i) !== null);
}

const register: RequestHandler = async (req, res, next) => {
  const requiredFields = ['username', 'password', 'email'];
  const optionalFields = ['firstname', 'lastname', 'public'];
  const data: any = {};

  for (const field of requiredFields) {
    // if a mandatory field isn't received, return with error
    if (!req.body[field]) return next({ error: 'MISSING_FIELD', data: { field } });

    else if (field === 'password') {
      const passwdCheck = Password.check(req.body.password);

      if (passwdCheck.valid) data.password = await Password.hash(req.body.password);
      else return next({ error: passwdCheck.error, data: { comp: passwdCheck.comp ? passwdCheck.comp : null } });
    }
    else data[field] = req.body[field];
  }

  // check through the optinal fields and add them if they're present
  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }
      else data[field] = req.body[field];
    }
  }

  try {
    const user: User = await prisma.user.create({ data });

    req.session.signedIn = true;
    req.session.role = user.role;
    req.session.userId = user.id;

    res.send({ msg: 'USER_CREATED' });
  } catch (err: any) {
    if (err.code === 'P2002') next({ error: 'USER_FIELD', data: { field: err.meta.target[0] } })
    else next({ code: 500 });
  }
}

const find: RequestHandler = async (req, res, next) => {
  const conditions: any = {};

  if (req.params.username) conditions.username = req.params.username;
  else {
    if (req.session.signedIn) conditions.id = req.auth.userId;
    else return next({ code: 401 });
  }

  const user = await prisma.user.findUnique({
    where: conditions,
    select: {
      id: true,
      username: true,
      firstname: true,
      lastname: true,
      role: true,
      public: true,
      createdAt: true,
    }
  });

  if (user) {
    if ((!req.params.username) || user.public || (req.session.role === Role.ADMIN)) {
      res.send(user);
    }
    else next({ error: 'USER_PRIVATE', code: 403 });
  }
  else next({ error: 'USER_NOT_FOUND' });
}

const findById: RequestHandler = async (req, res, next) => {
  const conditions: any = {};

  if (req.parser.id) conditions.id = req.parser.id;
  else return next({ error: 'USER_INVALID' });

  const user = await prisma.user.findUnique({
    where: conditions,
    select: {
      id: true,
      username: true,
      firstname: true,
      lastname: true,
      role: true,
      public: true,
      createdAt: true,
    }
  });

  if (user) {
    if (user.public || (req.auth.userId === req.parser.id) || (req.session.role === Role.ADMIN)) {
      res.send(user);
    }
    else next({ error: 'USER_PRIVATE', code: 403 });
  }
  else next({ error: 'USER_NOT_FOUND' });
}

const modify: RequestHandler = async (req, res, next) => {
  const fields = ['username', 'password', 'email', 'firstname', 'lastname', 'role', 'public'];
  const data: any = {};

  for (const requestedField of Object.keys(req.body)) {
    if (fields.includes(requestedField)) {
      if ((requestedField === 'email') && !isEmail(req.body.email)) {
        return next({ error: 'USER_FIELD', data: { field: 'email' } });
      }

      else if (requestedField === 'password') {
        const passwdCheck = Password.check(req.body.password);

        if (passwdCheck.valid) data.password = await Password.hash(req.body.password);
        else return next({ error: passwdCheck.error, data: { comp: passwdCheck.comp ? passwdCheck.comp : null } });
      }

      else if (requestedField === 'role') {
        if ((req.session.role === Role.ADMIN) && Role.hasOwnProperty(req.body.role)) data.role = req.body.role;
        else return next({ code: 403 });
      }

      else if (requestedField === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }

      else data[requestedField] = req.body[requestedField];
    }
  }

  try {
    await prisma.user.update({ where: { id: req.auth.userId }, data })
    res.send({ msg: 'USER_UPDATED' })
  } catch (err: any) {
    if (err.code === 'P2002') next({ error: 'USER_FIELD', data: { field: err.meta.target } })
    else next({ code: 500 });
  }
}

const remove: RequestHandler = (req, res, next) => {
}

const signin: RequestHandler = async (req, res, next) => {
  const { username, password } = req.body;

  if (username && password) {
    // did the user logged in with the username or with the password?
    const signinToken = isEmail(username) ? 'email' : 'username';
    const user = await prisma.user.findFirst({
      where: { [signinToken]: username }
    });

    if (user) {
      const passwdCorrect = await Password.compare(password, user.password);

      if (passwdCorrect) {
        req.session.signedIn = true;
        req.session.role = user.role;
        req.session.userId = user.id;

        // FIXME: this shouldn't be like this
        user.password = '';
        res.send(user);
      }
      else next({ error: 'USER_DATA_INCORRECT', code: 401 });
    }
    // we never give information on whether the user exists or not here
    else next({ error: 'USER_DATA_INCORRECT', code: 401 })
  }
}

const logout: RequestHandler = (req, res, next) => {
  req.session.destroy(() => {
    res.send({ msg: 'USER_LOGGED_OUT' })
  });
}


const restore: RequestHandler = async (req, res, next) => {
}

const verify: RequestHandler = async (req, res, next) => {
}

const checkPassword: RequestHandler = (req, res, next) => {
  const pcheck = Password.check(req.body.password);

  if (pcheck.valid) res.send({ msg: 'PASSWD_VALID' });
  else {
    const data: any = {};
    if (pcheck.error === 'PASSWD_INVALID') data.comp = pcheck.comp;
    next({ error: pcheck.error, data });
  }
}

const passwordRequirements: RequestHandler = (req, res, next) => {
  res.send(Password.requirements());
}

export default {
  register,
  find,
  findById,
  modify,
  remove,
  signin,
  logout,
  restore,
  verify,
  checkPassword,
  passwordRequirements,
};