import { RequestHandler } from 'express';
import { User, Role, Prisma } from '@prisma/client';
import prisma from '../prismainstance';
import Password from '../helpers/password';
import { LTRes } from '../helpers/ltres';
import { username as usernameConfig } from '../../littleterrarium.config'

const isEmail = (email: string): boolean => {
  return (email.match(/^\S+@\S+\.\S+$/i) !== null);
}

const removePassword = (user: User): User => {
  // to remove the password hash from the object
  const partialUser: Partial<User> = user;
  delete partialUser.password;

  return partialUser as User;
}

const isUsernameValid = (username: string): boolean => {
  const regexp = new RegExp(`^(?=.{${usernameConfig.minLength},${usernameConfig.maxLength}}$)(?!.*[_.]{2})[a-zA-Z0-9._-]+$`);

  return regexp.test(username);
}

const register: RequestHandler = async (req, res, next) => {
  const requiredFields = ['username', 'password', 'email'];
  const optionalFields = ['firstname', 'lastname', 'public', 'bio', 'preferences'];
  const data: any = {};

  for (const field of requiredFields) {
    // if a mandatory field isn't received, return with error
    if (!req.body[field]) return next(LTRes.msg('MISSING_FIELD').errorField(field));

    if (field === 'password') {
      const passwdCheck = Password.check(req.body.password);

      if (passwdCheck.valid) data.password = await Password.hash(req.body.password);
      else {
        return next(LTRes.msg('USER_PASSWD_INVALID').errorComp(passwdCheck.comp));
      }
    }

    else {
      if (((field === 'username') && !isUsernameValid(req.body.username)) || ((field === 'email') && !isEmail(req.body.email))) {
          return next(LTRes.msg('USER_INVALID_FIELD').errorField(field));
      }

      else data[field] = req.body[field];
    }
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

  // if avatar
  if (req.disk.file) data.avatar = req.disk.file.url;

  try {
    const user = await prisma.user.create({ data });

    req.session.signedIn = true;
    req.session.role = user.role;
    req.session.userId = user.id;

    res.send(LTRes.msg('USER_CREATED').user(removePassword(user)));
  } catch (err: any) {
    if (err.code === 'P2002') {
      next(LTRes.msg('USER_FIELD').errorField(err.meta.target[0]));
    }
    else next(LTRes.createCode(500));
  }
}

const find: RequestHandler = async (req, res, next) => {
  const conditions: any = {};
  let email = false;
  let preferences = true;

  if (req.params.username) conditions.username = req.params.username;
  else {
    if (req.session.signedIn) {
      conditions.id = req.auth.userId;
      email = true;
      preferences = true;
    }
    else return next(LTRes.createCode(401));
  }

  const user = await prisma.user.findUnique({
    where: conditions,
    select: {
      id: true,
      username: true,
      firstname: true,
      lastname: true,
      email,
      preferences,
      bio: true,
      avatar: true,
      role: true,
      public: true,
      createdAt: true,
    }
  });

  if (user) {
    if ((!req.params.username) || user.public || (req.session.role === Role.ADMIN)) {
      res.send(user);
    }
    else next(LTRes.msg('USER_PRIVATE').setCode(403));
  }
  else next(LTRes.msg('USER_NOT_FOUND'));
}

const findById: RequestHandler = async (req, res, next) => {
  const conditions: any = {};

  if (req.parser.id) conditions.id = req.parser.id;
  else return next(LTRes.msg('USER_INVALID'));

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
    }
  });

  if (user) {
    if (user.public || (req.auth.userId === req.parser.id) || (req.session.role === Role.ADMIN)) {
      res.send(user);
    }
    else next(LTRes.msg('USER_PRIVATE').setCode(403));
  }
  else next(LTRes.msg('USER_NOT_FOUND'));
}

const modify: RequestHandler = async (req, res, next) => {
  const fields = [
    'username', 'password', 'email', 'firstname', 'lastname', 'role', 'public',
    'bio', 'avatar', 'preferences'
  ];
  const data: any = {};

  for (const requestedField of Object.keys(req.body)) {
    if (fields.includes(requestedField)) {
      if (((requestedField === 'username') && !isUsernameValid(req.body.username)) || ((requestedField === 'email') && !isEmail(req.body.email))) {
        return next(LTRes.msg('USER_INVALID_FIELD').errorField(requestedField));
      }

      else if (requestedField === 'password') {
        const passwdCheck = Password.check(req.body.password);

        if (passwdCheck.valid) data.password = await Password.hash(req.body.password);
        else return next(LTRes.msg('USER_PASSWD_INVALID').errorComp(passwdCheck.comp));
      }

      else if (requestedField === 'role') {
        if ((req.session.role === Role.ADMIN) && Role.hasOwnProperty(req.body.role)) data.role = req.body.role;
        else return next(LTRes.createCode(403));
      }

      else if (requestedField === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }

      else data[requestedField] = req.body[requestedField];
    }
  }

  // picture
  if (req.body.removeAvatar) data.avatar = Prisma.JsonNull;
  else if (req.disk.file) data.avatar = req.disk.file.url;

  try {
    const user = await prisma.user.update({ where: { id: req.auth.userId }, data })

    res.send(LTRes.msg('USER_UPDATED').user(removePassword(user)));
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(LTRes.msg('USER_FIELD').errorField(err.meta.target));
    }
    else return next(LTRes.createCode(500));
  }
}

// TODO: removal of user
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

        res.send(LTRes.msg('USER_SIGNEDIN').user(removePassword(user)));
      }
      else next(LTRes.msg('USER_DATA_INCORRECT').setCode(401));
    }
    // we never give information on whether the user exists or not here
    else next(LTRes.msg('USER_DATA_INCORRECT').setCode(401));
  }
}

const logout: RequestHandler = (req, res, next) => {
  req.session.destroy(() => {
    res.send(LTRes.msg('USER_LOGGED_OUT'));
  });
}

//TODO: send verification email and verify
const restore: RequestHandler = async (req, res, next) => {
}

const verify: RequestHandler = async (req, res, next) => {
}

const checkPassword: RequestHandler = (req, res, next) => {
  const pcheck = Password.check(req.body.password);

  if (pcheck.valid) res.send(LTRes.msg('PASSWD_VALID'));
  else next(LTRes.msg('USER_PASSWD_INVALID').errorComp(pcheck.comp));
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
  passwordRequirements
};