const multer = require("multer");
const path = require("path");
const fs = require("fs");

// select folder based on mimetype
function getUploadDir(mimetype) {
  if (
    mimetype === "application/pdf" ||
    mimetype === "application/msword" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "uploads/cvs";
  }

  if (mimetype.startsWith("image/")) return "uploads/images";
  if (mimetype.startsWith("video/")) return "uploads/videos";
  if (mimetype.startsWith("audio/")) return "uploads/audios";

  return "uploads/others";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir(file.mimetype);

    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, dir);
    });
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const isCv =
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const isMedia =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/");

  if (isCv || isMedia) return cb(null, true);

  cb(
    new Error(
      "Only CV (pdf/doc/docx), image, video, audio files are allowed"
    ),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadSingle = upload.single("file");

const uploadFields = upload.fields([
  { name: "cv", maxCount: 1 },
  { name: "image", maxCount: 10 },
  { name: "video", maxCount: 2 },
  { name: "audio", maxCount: 5 },
]);

// 🔥 Wallet transfer image upload
const uploadWalletImage = upload.single("image");

module.exports = {
  uploadSingle,
  uploadFields,
  uploadWalletImage,
};