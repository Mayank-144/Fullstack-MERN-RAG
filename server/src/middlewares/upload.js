import multer from 'multer';
import path from 'path';

// Store files in memory buffer for immediate parsing
const storage = multer.memoryStorage();

// File filter: Only allow PDF and Excel files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type! Only PDF (.pdf) and Excel (.xlsx, .xls) files are allowed.'
      ),
      false
    );
  }
};

// Multer upload instance (Max file size: 25MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit
  }
});
