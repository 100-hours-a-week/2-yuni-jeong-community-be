import multer from 'multer';
import path from 'path';
import { getUploadFilePath } from '../utils/fileUtils.js';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, getUploadFilePath('')); // 파일 저장 경로
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // 이미지 파일만 허용
    } else {
        cb(new Error('이미지만 업로드 가능합니다.'), false);
    }
};

// 업로드 미들웨어 설정
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 파일 크기 제한 5MB
});

export default upload;