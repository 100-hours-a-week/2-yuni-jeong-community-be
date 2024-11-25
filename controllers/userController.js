import { deleteFile, getUploadFilePath } from '../utils/fileUtils.js';
import bcrypt from 'bcrypt';
import db from '../utils/db.js';
import * as userModel from '../model/userModel.js';

// id로 회원 찾기
export const getUserById = async (user_id) => {
    try {
        return await userModel.findUserById(user_id);
    } catch (error) {
        console.error('id로 회원 찾기 오류 :', error);
        throw error;
    }
};

// 회원 프로필 업데이트
export const updateUserProfile = async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const { nickname } = req.body;
    const newProfileImage = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (!nickname) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const user = await userModel.findUserById(req.session.user_id);
        if (!user) {
            return res.status(404).json({ message: "사용자를 찾을 수 없습니다.", data: null });
        }

        // 기존 이미지 삭제
        if (newProfileImage && user.profile_image && user.profile_image !== '/uploads/user-profile.jpg') {
            const oldImagePath = getUploadFilePath(user.profile_image);
            deleteFile(oldImagePath);
        }

        // 프로필 업데이트
        await userModel.updateUserProfile(req.session.user_id, nickname, newProfileImage || user.profile_image)

        res.status(200).json({
            message: "회원 정보 수정 성공",
            data: {
                user_id: user.user_id,
                nickname,
                profile_image: newProfileImage || user.profile_image
            }
        });
    } catch (error) {
        console.error('프로필 수정 오류 :', error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 비밀번호 수정
export const updatePassword = async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const { new_password } = req.body;

    if (!new_password) {
        return res.status(400).json({ message: "새로운 비밀번호를 입력해주세요.", data: null });
    }

    try {
        const user = await userModel.findUserById(req.session.user_id);
        if (!user) {
            return res.status(404).json({ message: "사용자를 찾을 수 없습니다.", data: null });
        }

        const isSamePassword = await bcrypt.compare(new_password, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.", data: null });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await userModel.updatePassword(req.session.user_id, hashedPassword);

        res.status(200).json({ message: "비밀번호 변경 성공", data: null });
    } catch (error) {
        console.error('비밀번호 수정 오류 : ', error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 회원 탈퇴
export const deleteUserAccount = async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const user_id = req.session.user_id;

    try {
        // 사용자 데이터 조회
        const user = await userModel.findUserById(user_id);
        if (!user) {
            return res.status(404).json({ message: "사용자를 찾을 수 없습니다.", data: null });
        }

        // 프로필 이미지 삭제
        if (user.profile_image && user.profile_image !== '/uploads/user-profile.jpg') {
            const profileImagePath = getUploadFilePath(user.profile_image);
            deleteFile(profileImagePath);
        }

        // 게시글 이미지 삭제
        const [postRows] = await db.query('SELECT image_url FROM posts WHERE user_id = ?', [user_id]);
        postRows.forEach(post => {
            if (post.image_url) {
                const postImagePath = getUploadFilePath(post.image_url);
                deleteFile(postImagePath);
            }
        });

        // 데이터 삭제
        await userModel.deleteUserAccount(user_id);

        req.session.destroy(err => {
            if (err) {
                console.error('세션 종료 오류 : ', err);
                return res.status(500).json({ message: "서버 에러", data: null });
            }
            res.status(200).json({ message: "회원 탈퇴 성공", data: null });
        });
    } catch (error) {
        console.error('사용자 계정 삭제 오류 : ', error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 이메일 중복 검사
export const checkEmailAvailability =async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "이메일을 입력해주세요.", data: null });
    }

    try {
        const user = await userModel.findUserByEmail(email);
        if (user) {
            return res.status(409).json({ message: "중복된 이메일입니다.", data: null });
        }
        res.status(200).json({ message: "사용 가능한 이메일입니다.", data: null });
    } catch (error) {
        console.error('이메일 중복 검사 오류 : ', error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 닉네임 중복 검사
export const checkNicknameAvailability = async (req, res) => {
    const { nickname } = req.query;

    if (!nickname) {
        return res.status(400).json({ message: "닉네임을 입력해주세요.", data: null });
    }

    try {
        const user = await userModel.findUserByNickname(nickname);
        if (user) {
            return res.status(409).json({ message: "중복된 닉네임입니다.", data: null });
        }
        res.status(200).json({ message: "사용 가능한 닉네임입니다.", data: null });
    } catch (error) {
        console.error('닉네임 중복 검사 오류 : ', error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};
