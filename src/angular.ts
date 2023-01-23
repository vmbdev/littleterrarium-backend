import path from 'node:path';
import { Dirent } from 'node:fs';
import { stat, readdir } from 'node:fs/promises';
import express, { Express } from 'express';

export const enableAngularRouting = async (app: Express, defaultLanguage?: string) => {
  const distPath = path.join(__dirname, '../dist/littleterrarium');
  let distStat;

  try {
    distStat = await stat(distPath);
  } catch {
    console.log('[Angular] Frontend routing is not enabled due to missing files.');
    return;
  }

  if (distStat.isDirectory()) {
    console.log(`[Angular] Directory ${distPath} exists`);

    const languageList = (await readdir(distPath, { withFileTypes: true }))
      .filter((entry: Dirent) => entry.isDirectory())
      .map((dir: Dirent) => dir.name);

    // if only an 'assets' folder exists, then i18n is not enabled
    if ((languageList.length === 1) && (languageList[0] === 'assets')) {
      setAngularRoutes(app, '/', '*', distPath);
    }
    else {
      for (const language of languageList) {
        if (language !== defaultLanguage) {
          await setAngularRoutes(app, `/${language}`, `/${language}/*`, distPath, language);
        }
      }
  
      if (defaultLanguage) await setAngularRoutes(app, '/', '*', distPath, defaultLanguage);
    }
  }
}

const setAngularRoutes = async (app: Express, dir: string, url: string, distPath: string, language?: string) => {
  const indexPath = path.join(distPath, language ? language : '', 'index.html');

  try {
    await stat(indexPath);
    app.use(dir, express.static(`dist/littleterrarium/${language ? language : ''}`));
    app.get(url, (req, res) => {
      res.sendFile(indexPath);
    });

    console.log(`[Angular] Enabled routing ${language ? `for ${language}` : '' }`);
  } catch {
    console.log(`[Angular] Can't enable ${ language ? `${language} language routing: missing index.html` : 'routing'}`);
  }
}