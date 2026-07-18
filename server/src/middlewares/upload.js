import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.'));
      return;
    }
    callback(null, true);
  },
});
