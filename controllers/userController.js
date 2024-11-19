import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { deleteFile, getUploadFilePath } from '../utils/fileUtils.js';

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

    const { nickname } = req.body;
    const newProfileImage = req.file ? `/uploads/${req.file.filename}` : null;
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

        // 기존 이미지 삭제
        if (
            newProfileImage && // 새 이미지가 업로드되었고,
            user.profile_image && // 기존 이미지가 있으며,
            user.profile_image !== '/uploads/user-profile.jpg'
        ) {
            const oldImagePath = getUploadFilePath(path.basename(user.profile_image));
            deleteFile(oldImagePath);
        }

        if (nickname) user.nickname = nickname;
        if (newProfileImage) {
            user.profile_image = newProfileImage; // 새 프로필 이미지 반영
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

    // 프로필 이미지 삭제
    const deleteProfileImage = () => {
        return new Promise((resolve, reject) => {
            const user = getUserById(userId);
            if (user && user.profile_image && user.profile_image.startsWith('/uploads/') && user.profile_image !== '/uploads/user-profile.jpg') {
                const profileImagePath = getUploadFilePath(path.basename(user.profile_image));
                deleteFile(profileImagePath);
            }
            resolve(); // 프로필 이미지 없더라도 정상 종료
        });
    };

    // 게시글 이미지 삭제
    const deletePostImages = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(postsFilePath, 'utf8', (err, data) => {
                if (err) {
                    return reject({ message: "게시글 데이터 읽기 실패", status: 500 });
                }

                const posts = JSON.parse(data);
                const userPosts = posts.filter(post => post.user_id === userId);

                // 이미지 삭제
                userPosts.forEach(post => {
                    if (post.image_url && post.image_url.startsWith('/uploads/')) {
                        const postImagePath = path.join(__dirname, '../uploads', path.basename(post.image_url));
                        deleteFile(postImagePath);
                    }
                });

                resolve(); // 모든 게시글 이미지 삭제 후 종료
            });
        });
    };

    // 사용자 삭제
    const deleteUser = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(usersFilePath, 'utf8', (err, data) => {
                if (err) {
                    return reject({ message: "사용자 데이터 읽기 실패", status: 500 });
                }

                const users = JSON.parse(data);
                const userIndex = users.findIndex(user => user.user_id === userId);

                if (userIndex === -1) {
                    return reject({ message: "찾을 수 없는 사용자입니다.", status: 404 });
                }

                users.splice(userIndex, 1);

                fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        return reject({ message: "사용자 삭제 실패", status: 500 });
                    }
                    resolve();
                });
            });
        });
    };

    // 게시글 삭제
    const deleteUserPosts = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(postsFilePath, 'utf8', (err, data) => {
                if (err) {
                    return reject({ message: "게시글 데이터 읽기 실패", status: 500 });
                }

                const posts = JSON.parse(data);
                const filteredPosts = posts.filter(post => post.user_id !== userId);

                fs.writeFile(postsFilePath, JSON.stringify(filteredPosts, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        return reject({ message: "게시글 삭제 실패", status: 500 });
                    }
                    resolve();
                });
            });
        });
    };

    // 댓글 삭제
    const deleteUserComments = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(commentsFilePath, 'utf8', (err, data) => {
                if (err) {
                    return reject({ message: "댓글 데이터 읽기 실패", status: 500 });
                }

                const comments = JSON.parse(data);
                const filteredComments = {};

                Object.keys(comments).forEach(postId => {
                    const postComments = comments[postId];
                    if (Array.isArray(postComments)) {
                        filteredComments[postId] = postComments.filter(comment => comment.user_id !== userId);
                    } else {
                        filteredComments[postId] = [];
                    }
                });

                fs.writeFile(commentsFilePath, JSON.stringify(filteredComments, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        return reject({ message: "댓글 삭제 실패", status: 500 });
                    }
                    resolve();
                });
            });
        });
    };

    // 세션 종료
    const destroySession = () => {
        return new Promise((resolve, reject) => {
            req.session.destroy(err => {
                if (err) {
                    return reject({ message: "세션 종료 실패", status: 500 });
                }
                resolve();
            });
        });
    };

    // 삭제 절차 실행
    deleteProfileImage()
        .then(() => deletePostImages())
        .then(() => deleteUser())
        .then(() => deleteUserPosts())
        .then(() => deleteUserComments())
        .then(() => destroySession())
        .then(() => {
            res.status(200).json({ message: "회원 탈퇴 성공", data: null });
        })
        .catch(err => {
            res.status(err.status || 500).json({ message: err.message || "서버 에러", data: null });
        });
};