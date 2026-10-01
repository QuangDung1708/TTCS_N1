const multer = require('multer');
 
// Luu file tam vao bo nho (RAM) truoc khi xu ly tiep (vi du upload len cloud/S3...)
// Neu can luu thang vao o dia, doi sang multer.diskStorage({...})
const storage = multer.memoryStorage();
 
// Chi cho phep dinh dang JPG va PNG
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
 
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chi chap nhan file dinh dang JPG hoac PNG'), false);
  }
};
 
// Gioi han dung luong toi da 2MB
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB (tinh bang byte)
  }
});
 
module.exports = upload;