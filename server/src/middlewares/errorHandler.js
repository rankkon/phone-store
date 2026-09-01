import { MulterError } from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Dữ liệu gửi lên vượt quá dung lượng cho phép.' });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ.' });
  }

  if (error instanceof MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ảnh vượt quá dung lượng cho phép.'
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

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(statusCode).json({
    message: statusCode >= 500 && isProduction
      ? 'Đã có lỗi xảy ra trên máy chủ.'
      : error.message || 'Đã có lỗi xảy ra trên máy chủ.',
    ...(statusCode < 500 && error.details ? { details: error.details } : {}),
  });
}
