import { createHash } from 'node:crypto';
import { mkdir, rename, readFile, unlink, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { files } from '../../littleterrarium.config';

type Image = {
  [key: string]: string,
  full: string,
  mid: string,
  thumb: string
}

export type LocalFile = {
  
  destination: string,
  hash: string,
  fieldname?: string,
  mimetype?: string,
  size?: number,
  url?: Image,
  path: Image
}

export const hashFile = async (filePath: string): Promise<string> => {
  const hashes = ['md5', 'sha1', 'sha256'];

  if (hashes.includes(files.hash)) {
    const buffer = await readFile(filePath);
    const sum = createHash(files.hash);
    sum.update(buffer);

    return sum.digest('hex');
  }
  else throw new Error(`files.hash is not a valid algorithm. Valid algorithms: ${hashes}`);
}

// TODO: check if file exists before moving
export const saveFile = async (filePath: string): Promise<LocalFile> => {
  const hash = await hashFile(filePath);
  const ext = await getImageExt(filePath);
  const { newDir, newFile, relativeDir } = await createDirectories(hash);

  const filenameFull = `${newFile}.${ext}`;
  const filenameThumb = `${newFile}-thumb.${ext}`;
  const filenameMid = `${newFile}-mid.${ext}`
  const imageFull = path.join(newDir, filenameFull);
  const imageThumb = path.join(newDir, filenameThumb);
  const imageMid = path.join(newDir, filenameMid);

  await rename(filePath, imageFull);
  
  const img = sharp(imageFull);
  await img.resize({ width: 250, height: 250, fit: 'cover'})
  .withMetadata()
  .toFile(imageThumb);

  await img.resize({ width: 750, fit: 'contain', position: 'left top' })
  .withMetadata()
  .toFile(imageMid);

  const newLocalFile: LocalFile = {
    destination: newDir,
    hash,
    path: {
      full: `${relativeDir}${filenameFull}`,
      mid: `${relativeDir}${filenameMid}`,
      thumb: `${relativeDir}${filenameThumb}`
    }
  };

  return newLocalFile;
}

export const createDirectories = async (hash: string) => {
  let counter = 0;
  let newPath = '';
  while (counter + 1 < files.folder.division * 2) {
    newPath += hash.slice(counter, counter + 2) + '/';
    counter += 2;
  }

  const newFile = hash.slice(counter);
  const newDir = path.join(__dirname, '../../', files.folder.public, newPath);
  const relativeDir = `${files.folder.public}/${newPath}`
  await mkdir(newDir, { recursive: true });

  return {
    newDir,
    newFile,
    relativeDir
  };
}

export const removeFile = (filePath: string): Promise<void> => {
  return unlink(filePath);
}

export const removeDir = async (dirPath: string): Promise<void> => {
  return await rm(dirPath, { recursive: true, force: true });
}

export const getImageExt = async (filePath: string): Promise<string | undefined> => {
  const img = sharp(filePath);
  let metadata;

  try {
    metadata = await img.metadata();
  } catch (err) {
    throw { error: 'IMG_NOT_VALID' };
  }

  return metadata.format;
}

export default {
  hashFile,
  saveFile,
  createDirectories,
  removeFile,
  removeDir,
  getImageExt
};