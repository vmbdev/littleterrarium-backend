import { mkdirSync } from 'node:fs';
import express, { Express } from 'express';
import 'express-async-errors';
import cors from 'cors';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store/dist/index';
import { Role } from '@prisma/client';

import prisma from './prismainstance';

import apiRoutes from './routes/api.routes';
import { enableAngularRouting } from './angular';
// import notifications from './helpers/notifications';

import errorHandling from './middlewares/errorhandling';
import { generateAuth } from './middlewares/auth';
import { generateParser } from './middlewares/parser';
import { generateDisk } from './middlewares/disk';
import { server as serverConfig } from '../littleterrarium.config';

/**
 * Extend SessionData from express-session to include user info
 */
declare module 'express-session' {
  export interface SessionData {
    signedIn: boolean,
    role: Role,
    userId: number,
  }
}

// If necessary, create /public and /temp directories
mkdirSync('public', { recursive: true });
mkdirSync('temp', { recursive: true });

const isProduction: boolean = process.env.NODE_ENV === 'production';
const app: Express = express();

// enable Android & iOS Capacitor builds if user CORS is disabled
let allowedOrigins;

if (serverConfig.useCors && serverConfig.corsOrigin) {
  allowedOrigins = serverConfig.corsOrigin;
}
else allowedOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:8100'
];

app.use(cors({
  credentials: true,
  origin: allowedOrigins
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    proxy: isProduction,
    secret: serverConfig.session.secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: isProduction,
      httpOnly: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : undefined
    },
    store: new PrismaSessionStore(prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);
app.use('/*', generateAuth, generateParser, generateDisk);
app.use('/api', apiRoutes);
app.use('/public', express.static('public'));
enableAngularRouting(app, serverConfig.angular.defaultLang);
app.use(errorHandling);

// setInterval(() => {
//   notifications.check();
// }, 60*60*1000);

export default app;