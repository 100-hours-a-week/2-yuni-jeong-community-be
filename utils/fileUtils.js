import fs from 'fs';
import path from 'path';

export const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
        } else {
            console.log(`File deleted: ${filePath}`);
        }
    });
};

export const getUploadFilePath = (filePath) => {
    const normalizedPath = filePath.replace(/^\/uploads\//, '');
    return path.join(process.cwd(), 'uploads', normalizedPath);
};
