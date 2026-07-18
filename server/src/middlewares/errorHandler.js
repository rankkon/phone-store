import { MulterError } from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);

  if (error instanceof MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Mỗi ảnh chỉ được tối đa 5 MB.'
      : 'Không thể tải tệp lên.';
    return res.status(400).json({ message });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ.',
      details: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'ID hoặc dữ liệu định danh không hợp lệ.' });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'dữ liệu';
    return res.status(409).json({ message: `${field} đã tồn tại.` });
  }

  return res.status(error.statusCode || 500).json({
    message: error.message || 'Đã có lỗi xảy ra trên máy chủ.',
    ...(error.details ? { details: error.details } : {}),
  });
}
