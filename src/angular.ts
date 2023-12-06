import path from 'node:path';
import { Dirent } from 'node:fs';
import { stat, readdir } from 'node:fs/promises';
import express, { Express } from 'express';
import { LTRes } from './helpers/ltres';

type LanguageSet = {
  locales: string[];
  default?: string;
};

export const enableAngularRouting = async (
  app: Express,
  defaultLanguage?: string
) => {
  // FIXME: allow a configurable/array of options
  const distPath = path.join(__dirname, '../dist/littleterrarium/browser');
  const languagesToSend: LanguageSet = { locales: [] };
  let distStat;

  app.get('/api/angular/locales', (req, res, next) => {
    if (languagesToSend.locales.length > 0) res.send(languagesToSend);
    else next(LTRes.createCode(400));
  });

  try {
    distStat = await stat(distPath);
  } catch {
    console.log(
      '[Angular] Frontend routing is not enabled due to missing files.'
    );
    return;
  }

  if (distStat.isDirectory()) {
    console.log(`[Angular] Directory ${distPath} exists`);

    const languageList = (await readdir(distPath, { withFileTypes: true }))
      .filter((entry: Dirent) => entry.isDirectory())
      .map((dir: Dirent) => dir.name);

    // if only an 'assets' folder exists, then i18n is not enabled
    if (languageList.length === 1 && languageList[0] === 'assets') {
      await setAngularRoutes(app, '/', '*', distPath);
    } else {
      for (const language of languageList) {
        if (language !== defaultLanguage) {
          const res = await setAngularRoutes(
            app,
            `/${language}`,
            `/${language}/*`,
            distPath,
            language
          );

          if (res) languagesToSend.locales.unshift(language);
        }
      }

      if (defaultLanguage) {
        await setAngularRoutes(app, '/', '*', distPath, defaultLanguage);
        languagesToSend.default = defaultLanguage;
      }
    }
  }
};

const setAngularRoutes = async (
  app: Express,
  dir: string,
  url: string,
  distPath: string,
  language?: string
): Promise<boolean> => {
  const indexPath = path.join(distPath, language ? language : '', 'index.html');

  try {
    await stat(indexPath);
    app.use(dir, express.static(path.join(distPath, language ? language : '')));
    app.get(url, (req, res) => {
      res.sendFile(indexPath);
    });

    console.log(
      `[Angular] Enabled routing ${language ? `for ${language}` : ''} to ${url}`
    );

    return true;
  } catch {
    console.log(
      `[Angular] Can't enable ${
        language ? `${language} language` : ''
      } routing: missing index.html`
    );

    return false;
  }
};
