import AWS from 'aws-sdk';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const BUCKET_NAME = 'yuni-community-bucket';
const CLOUDFRONT_URL = 'https://dyto0gfaepgcj.cloudfront.net';

export const uploadToS3 = async (buffer, fileName, contentType) => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
    };

    try {
        await s3.upload(params).promise();
        console.log("s3에 파일 업로드 성공")
        return `${CLOUDFRONT_URL}/${fileName}`;
    } catch (error) {
        console.error('파일 업로드 오류 :', error);
        throw new Error('s3에 파일 업로드 실패');
    }
};

export const deleteFromS3 = async (fileName) => {
    const params = {
        Bucket: BUCKET_NAME,
        key: fileName,
    };

    try {
        await s3.deleteObject(params).promise();
        console.log("s3 파일 삭제 성공");
    } catch (error) {
        console.error('파일 삭제 오류 : ', error);
    }
}