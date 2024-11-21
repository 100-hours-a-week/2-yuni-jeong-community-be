import { getUserById } from './userController.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

export const getCurrentUser = async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({message: "로그인이 필요합니다.", data: null});
    }

    const user = await getUserById(req.session.user_id);
    if(!user){
        return res.status(404).json({message: "사용자를 찾을 수 없습니다." , data: null});
    }

    res.status(200).json({
        message: "유저 정보 조회 성공",
        data: {
            user_id: user.user_id,
            email: user.email,
            nickname: user.nickname,
            profile_image: user.profile_image || '/uploads/user-profile.jpg',
        }});
}


// 회원가입
export const register = async (req, res) => {
    const { email, password, nickname } = req.body;

    // 필수 필드 체크
    if (!email || !password || !nickname) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }
    try {
        const [rows] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(409).json({ message: "이미 사용 중인 이메일입니다.", data: null });
        }

        const [nicknameRows] = await db.query('SELECT user_id FROM users WHERE nickname = ?', [nickname]);
        if (nicknameRows.length > 0) {
            return res.status(409).json({ message: "이미 사용 중인 닉네임입니다.", data: null });
        }
        
        // 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        const user_id = uuidv4();

        const profile_image = req.file ? `/uploads/${req.file.filename}` : '/uploads/user-profile.jpg';
        
        await db.query('INSERT INTO users (user_id, email, password, nickname, profile_image) VALUES (?, ?, ?, ?, ?)', [
            user_id,
            email,
            hashedPassword,
            nickname,
            profile_image
        ]);

        res.status(201).json({ message: "회원가입 성공", data: { user_id } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 로그인
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const [rows] = await db.query('SELECT user_id, password FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }

        req.session.user_id = user.user_id;
        res.status(200).json({ message: "로그인 성공", data: { user_id: user.user_id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 로그아웃
export const logout = (req, res) => {
    if (!req.session.user_id) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });
        res.status(200).json({ message: "로그아웃 성공", data: null });
    });
}