import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const usersFilePath = path.join(__dirname, '../model/users.json');
export const postsFilePath = path.join(__dirname, '../model/posts.json');
export const commentsFilePath = path.join(__dirname, '../model/comments.json');