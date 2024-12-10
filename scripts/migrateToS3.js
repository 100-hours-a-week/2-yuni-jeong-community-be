import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import db from '../utils/db.js';
import { BUCKET_NAME, CLOUDFRONT_URL } from '../utils/constants.js';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const migrateFilesToS3 = async () => {
    try {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
            const filePath = path.join(UPLOADS_DIR, file);
            const fileContent = fs.readFileSync(filePath);

            const params = {
                Bucket: BUCKET_NAME,
                Key: file,
                Body: fileContent,
                ContentType: 'image/jpeg',
            };

            await s3.upload(params).promise();
            console.log(`Uploaded: ${file}`);

            const newUrl = `${CLOUDFRONT_URL}/${file}`;
            await db.query('UPDATE users SET profile_image = ? WHERE profile_image = ?', [newUrl, `/uploads/${file}`]);
            await db.query('UPDATE posts SET image_url = ? WHERE image_url = ?', [newUrl, `/uploads/${file}`]);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Error during migration:', error);
    }
};

migrateFilesToS3();
