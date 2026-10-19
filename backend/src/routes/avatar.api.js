const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const auth = require('./middlewares/auth');
const User = require('./models/User');

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const PUBLIC_BASE = '/uploads/avatars';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const name = `${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      const err = new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).single('avatar');

const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Ảnh vượt quá dung lượng tối đa 2MB' });
    }
    return res.status(err.status || 400).json({ message: err.message || 'Tải ảnh thất bại' });
  });
};

const removeFile = (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.startsWith(PUBLIC_BASE)) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(avatarUrl)), () => {});
};

// Tải lên / cập nhật ảnh đại diện
router.put('/me/avatar', auth, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh (field "avatar")' });
    }
    const newUrl = `${PUBLIC_BASE}/${req.file.filename}`;

    const user = await User.findById(req.user.id);
    if (!user) {
      removeFile(newUrl);
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const oldUrl = user.avatar;
    user.avatar = newUrl;
    await user.save();
    removeFile(oldUrl);

    return res.json({ message: 'Cập nhật ảnh đại diện thành công', avatar: newUrl });
  } catch (err) {
    if (req.file) removeFile(`${PUBLIC_BASE}/${req.file.filename}`);
    console.error('Upload avatar error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Xóa ảnh đại diện
router.delete('/me/avatar', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    removeFile(user.avatar);
    user.avatar = null;
    await user.save();

    return res.json({ message: 'Đã xóa ảnh đại diện' });
  } catch (err) {
    console.error('Delete avatar error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
