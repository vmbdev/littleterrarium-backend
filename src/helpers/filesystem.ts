import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { files } from '../../littleterrarium.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Image = {
  [key: string]: string;
  full: string;
  mid: string;
  thumb: string;
};

export type LocalFile = {
  destination: string;
  hash: string;
  fieldname?: string;
  mimetype?: string;
  size?: number;
  path: Image;
  webp?: Image;
};

export const hashFile = async (filePath: string): Promise<string> => {
  const hashes = ['md5', 'sha1', 'sha256'];

  if (hashes.includes(files.hash)) {
    const buffer = await readFile(filePath);
    const sum = createHash(files.hash);
    sum.update(buffer);

    return sum.digest('hex');
  } else
    throw new Error(
      `files.hash is not a valid algorithm. Valid algorithms: ${hashes}`
    );
};

// TODO: check if file exists before moving
export const saveFile = async (
  filePath: string,
  destiny?: string
): Promise<LocalFile> => {
  const hash = await hashFile(filePath);
  const { newDir, newFilename, relativeDir } = await createDirectories(
    hash,
    destiny
  );
  const storedImages = await storeImage(filePath, newDir, {
    newFilename,
    relativeDir,
    webpOnly: files.webpOnly,
    webp: files.webp,
  });
  const newLocalFile: LocalFile = {
    destination: newDir,
    hash,
    path: storedImages[0],
  };

  if (files.webp && !files.webpOnly) newLocalFile.webp = storedImages[1];

  await removeFile(filePath);

  return newLocalFile;
};

type StoreImageSettings = {
  relativeDir: string;
  newFilename: string;
  webp?: boolean;
  webpOnly?: boolean;
};

export const storeImage = async (
  source: string,
  dest: string,
  settings: StoreImageSettings
): Promise<Image[]> => {
  const img = sharp(source, { failOnError: false }).rotate();
  const images: Image[] = [];
  const ext = settings.webpOnly ? 'webp' : await getImageExt(img);
  const filenames = getFilenames(settings.newFilename, ext ? ext : 'jpg');

  const thumbnail = img.clone().resize({
    width: 400,
    height: 400,
    fit: 'cover',
  });
  const middleSize = img.clone().resize({
    width: 750,
    fit: 'contain',
    position: 'left top',
  });

  if (!settings.webpOnly) {
    await img.toFile(path.join(dest, filenames.full));
    await thumbnail.toFile(path.join(dest, filenames.thumb));
    await middleSize.toFile(path.join(dest, filenames.mid));

    images.push({
      full: `${settings.relativeDir}${filenames.full}`,
      mid: `${settings.relativeDir}${filenames.mid}`,
      thumb: `${settings.relativeDir}${filenames.thumb}`,
    });
  }

  if (settings.webp || settings.webpOnly) {
    const webpFilenames = getFilenames(settings.newFilename, 'webp');

    await img.webp().toFile(path.join(dest, webpFilenames.full));
    await thumbnail.webp().toFile(path.join(dest, webpFilenames.thumb));
    await middleSize.webp().toFile(path.join(dest, webpFilenames.mid));

    images.push({
      full: `${settings.relativeDir}${webpFilenames.full}`,
      mid: `${settings.relativeDir}${webpFilenames.mid}`,
      thumb: `${settings.relativeDir}${webpFilenames.thumb}`,
    });
  }

  return images;
};

export const getFilenames = (name: string, ext: string): Image => {
  return {
    full: `${name}.${ext}`,
    mid: `${name}-mid.${ext}`,
    thumb: `${name}-thumb.${ext}`,
  };
};

export const createDirectories = async (hash: string, destiny?: string) => {
  let newFilename, newDir, relativeDir;

  if (!destiny) {
    let counter = 0;
    let newPath = '';

    while (counter + 1 < files.folder.division * 2) {
      newPath += hash.slice(counter, counter + 2) + '/';
      counter += 2;
    }

    newFilename = hash.slice(counter);
    newDir = path.join(__dirname, '../../', files.folder.public, newPath);
    relativeDir = `${files.folder.public}/${newPath}`;
  } else {
    newFilename = hash;
    newDir = path.join(__dirname, '../../', files.folder.public, destiny);
    relativeDir = `${files.folder.public}/${destiny}`;
  }

  await mkdir(newDir, { recursive: true });

  return { newDir, newFilename, relativeDir };
};

export const removeFile = async (filePath: string): Promise<void> => {
  try {
    await unlink(filePath);
  } catch (err) {}
};

export const removeDir = async (dirPath: string): Promise<void> => {
  return await rm(dirPath, { recursive: true, force: true });
};

export const getImageExt = async (
  image: sharp.Sharp
): Promise<string | undefined> => {
  let metadata;

  try {
    metadata = await image.metadata();
  } catch (err) {
    throw { error: 'IMG_NOT_VALID' };
  }

  return metadata.format;
};

export default {
  hashFile,
  saveFile,
  createDirectories,
  removeFile,
  removeDir,
  getImageExt,
};
