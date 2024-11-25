import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as userModel from '../model/userModel.js';

export const getCurrentUser = async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({message: "로그인이 필요합니다.", data: null});
    }

    try {
        const user = await userModel.findUserById(req.session.user_id);
        if (!user) {
            return res.status(404).json({message: "사용자를 찾을 수 없습니다." , data: null});
        }

        res.status(200).json({
            message: '유저 정보 조회 성공',
            data: {
                user_id: user.user_id,
                email: user.email,
                nickname: user.nickname,
                profile_image: user.profile_image || '/uploads/user-profile.jpg',
            }
        });
    } catch (error) {
        res.status(500).json({message: '서버 에러', data: null});
    }
}


// 회원가입
export const register = async (req, res) => {
    const { email, password, nickname } = req.body;

    // 필수 필드 체크
    if (!email || !password || !nickname) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }
    try {
        const existingUserByEmail = await userModel.findUserByEmail(email);
        if (existingUserByEmail) {
            return res.status(409).json({ message: "이미 사용 중인 이메일입니다.", data: null }); 
        }

        const existingUserByNickname = await userModel.findUserByNickname(nickname);
        if (existingUserByNickname) {
            return res.status(409).json({ message: "이미 사용 중인 닉네임입니다.", data: null });
        }
        
        // 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);
        const profile_image = req.file ? `/uploads/${req.file.filename}` : '/uploads/user-profile.jpg';
        
        const user_id = await userModel.createUser({email, hashedPassword, nickname, profile_image});

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
        const user = await userModel.findUserByEmail(email);
        if (!user) {
            return res.status(400).json({ message: "가입되지 않은 이메일입니다.", data: null });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "비밀번호가 잘못되었습니다.", data: null });
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