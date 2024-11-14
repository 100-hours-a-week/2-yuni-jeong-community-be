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

export const updateUserProfile = (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const { nickname, profile_image } = req.body;
    if (!nickname && !profile_image) {
        return res.status(400).json({ message: "잘못된 요청" });
    }

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러" });

        const users = JSON.parse(data);
        const user = users.find(user => user.user_id === req.session.user_id);

        if (!user) {
            return res.status(404).json({ message: "찾을 수 없는 사용자입니다." });
        }

        if (nickname) user.nickname = nickname;
        if (profile_image) user.profile_image = profile_image;

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러" });
            res.status(200).json({
                message: "회원 정보 수정 성공",
                data: {
                    user_id: user.user_id,
                    nickname: user.nickname,
                    profile_image: user.profile_image
                }
            });
        });
    });
};
