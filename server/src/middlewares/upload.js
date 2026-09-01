import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageUpload({ fileSize, files = 1 }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize,
      files,
      fields: 10,
      fieldSize: 64 * 1024,
      parts: files + 10,
    },
    fileFilter: (req, file, callback) => {
      if (!allowedImageTypes.has(file.mimetype)) {
        callback(new ApiError(400, 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.'));
        return;
      }
      callback(null, true);
    },
  });
}

export const productImageUpload = imageUpload({ fileSize: 5 * 1024 * 1024, files: 5 });
export const avatarImageUpload = imageUpload({ fileSize: 2 * 1024 * 1024 });
export const brandLogoUpload = imageUpload({ fileSize: 2 * 1024 * 1024 });
