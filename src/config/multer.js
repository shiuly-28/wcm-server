import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads/listings');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${randomName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed!'), false);
  },
});

export default upload;
