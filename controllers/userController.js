import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersFilePath = path.join(__dirname, '../model/users.json');

export const getUserById = (userId) => {
    const usersFilePath = path.join(__dirname, '../model/users.json');
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
    return users.find(user => user.user_id === userId);
};