import multer from 'multer';
import path from 'node:path';

// store temporarily before we hash it and move it to /public
const uploader = () => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../temp'));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix);
      }
    })
  });
}

export default uploader;