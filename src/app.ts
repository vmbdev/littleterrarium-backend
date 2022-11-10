import path from 'node:path';
import express, { Express } from 'express';
import cors from 'cors';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store/dist/index';
import { Role } from '@prisma/client';

import apiRoutes from './routes/api.routes';
import prisma from './prismainstance';
import notifications from './helpers/notifications';
import errorHandling from './middlewares/errorhandling';
import { generateAuth } from './middlewares/auth';
import { generateParser } from './middlewares/parser';
import { server as serverConfig } from '../littleterrarium.config';
import { generateDisk } from './middlewares/disk';

const app: Express = express();

declare module 'express-session' {
  export interface SessionData {
    signedIn: boolean,
    role: Role,
    userId: number,
  }
}

if (serverConfig.useCors && serverConfig.corsOrigin) {
  app.use(cors({
      credentials: true,
      origin: serverConfig.corsOrigin
  }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: serverConfig.session.secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);
app.use('/*', generateAuth, generateParser, generateDisk);;
app.use('/api', apiRoutes);
app.use('/public', express.static('public'));
app.use('/', express.static('dist/littleterrarium'));

// for Angular routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/littleterrarium/index.html'));
})

app.use(errorHandling);

setInterval(() => {
  notifications.check();
}, 60*60*1000);

export default app;