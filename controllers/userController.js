import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersFilePath = path.join(__dirname, '../model/users.json');
const postsFilePath = path.join(__dirname, '../model/posts.json');
const commentsFilePath = path.join(__dirname, '../model/comments.json');

// id로 회원 찾기
export const getUserById = (userId) => {
    const usersFilePath = path.join(__dirname, '../model/users.json');
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
    return users.find(user => user.user_id === userId);
};

// 회원 프로필 업데이트
export const updateUserProfile = (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const { nickname, profile_image } = req.body;
    if (!nickname) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const users = JSON.parse(data);
        const user = users.find(user => user.user_id === req.session.user_id);

        if (!user) {
            return res.status(404).json({ message: "찾을 수 없는 사용자입니다.", data: null });
        }

        if (nickname) user.nickname = nickname;
        if (profile_image === '') {
            user.profile_image = '/uploads/user-profile.jpg';
        } else if (profile_image) {
            user.profile_image = profile_image;
        }

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
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

// 비밀번호 수정
export const updatePassword = (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const { new_password } = req.body;

    if (!new_password) {
        return res.status(400).json({ message: "새로운 비밀번호를 입력해주세요.", data: null });
    }

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const users = JSON.parse(data);
        const user = users.find((user) => user.user_id === req.session.user_id);

        if (!user) {
            return res.status(404).json({ message: "찾을 수 없는 사용자입니다.", data: null });
        }

        user.password = new_password;

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(200).json({ message: "비밀번호 변경 성공", data: null });
        });
    });
};

// 회원 탈퇴
export const deleteUserAccount = (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ message: "로그인이 필요합니다.", data: null });
    }

    const userId = req.session.user_id;

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const users = JSON.parse(data);
        const userIndex = users.findIndex(user => user.user_id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ message: "찾을 수 없는 사용자입니다.", data: null });
        }

        // 사용자 삭제
        users.splice(userIndex, 1);

        // 게시글 및 댓글 삭제 로직
        fs.readFile(postsFilePath, 'utf8', (postErr, postsData) => {
            if (postErr) return res.status(500).json({ message: "서버 에러", data: null });

            const posts = JSON.parse(postsData);
            const filteredPosts = posts.filter(post => post.user_id !== userId);

            fs.writeFile(postsFilePath, JSON.stringify(filteredPosts, null, 2), 'utf8', (writePostErr) => {
                if (writePostErr) return res.status(500).json({ message: "게시글 삭제 실패", data: null });

                fs.readFile(commentsFilePath, 'utf8', (commentErr, commentsData) => {
                    if (commentErr) return res.status(500).json({ message: "서버 에러", data: null });

                    const comments = JSON.parse(commentsData);
                    const filteredComments = {};

                    Object.keys(comments).forEach(postId => {
                        const postComments = comments[postId];
                        if (Array.isArray(postComments)) {
                            filteredComments[postId] = postComments.filter(comment => comment.user_id !== userId);
                        } else {
                            filteredComments[postId] = [];
                        }
                    });


                    fs.writeFile(commentsFilePath, JSON.stringify(filteredComments, null, 2), 'utf8', (writeCommentErr) => {
                        if (writeCommentErr) return res.status(500).json({ message: "댓글 삭제 실패", data: null });

                        // 세션 종료
                        req.session.destroy(err => {
                            if (err) {
                                return res.status(500).json({ message: "세션 종료 실패", data: null });
                            }
                            res.status(200).json({ message: "회원 탈퇴 성공", data: null });
                        });
                    });
                });
            });
        });
    });
};