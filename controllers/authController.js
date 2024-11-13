import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersFilePath = path.join(__dirname, '../model/users.json');


// 회원가입
export const register = (req, res) => {
    const { email, password, nickname, profile_image } = req.body;

    // 필수 필드 체크
    if (!email || !password || !nickname) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    // 사용자 중복 체크
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const users = JSON.parse(data);
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({ message: "이미 사용 중인 이메일입니다.", data: null });
        }

        const newUser = {
            user_id: users.length + 1, // TODO: user_id UUID로 수정하기
            email,
            password,
            nickname,
            profile_image: profile_image || ""
        };
        users.push(newUser);

        fs.writeFile(usersFilePath, JSON.stringify(users), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(201).json({ message: "회원가입 성공", data: { user_id: newUser.user_id } });
        });
    });
};

// 로그인 로직
export const login = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const users = JSON.parse(data);
        const user = users.find(u => u.email === email && u.password === password);

        if (!user || user.password !== password) {
            return res.status(400).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }
        
        req.session.user_id = user.user_id;
        res.status(200).json({ message: "login_success", data: { user_id: user.user_id } });
    });
};

export const logout = (req, res) => {
    if (!req.session.user_id) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });
        res.status(200).json({ message: "로그아웃 성공", data: null });
    });
}