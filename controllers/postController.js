import fs from 'fs';
import path from 'path';
import { getUserById } from './userController.js';
import { deleteFile, getUploadFilePath } from '../utils/fileUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { postsFilePath, commentsFilePath } from '../utils/filePath.js';
import db from '../utils/db.js';

/* -------------------------- 게시글 API -------------------------- */

// 모든 게시글 조회
export const getAllPosts = async (req, res) => {
    const page = parseInt(req.params.page,) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const [posts] = await db.query(
            `
            SELECT p.post_id, p.title, p.content, p.image_url, p.likes, p.views, p.comments_count, p.created_at,
                   u.nickname AS author, u.profile_image
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.user_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );

        res.status(200).json({ message: "게시글 목록 조회 성공", data: posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 상세 조회
export const getPostById = async (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;

    try {
        const [[post]] = await db.query(
            `
            SELECT p.post_id, p.title, p.content, p.image_url, p.likes, p.views, p.comments_count, p.created_at,
                   u.nickname AS author, u.profile_image, p.user_id
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.user_id
            WHERE p.post_id = ?
            `,
            [post_id]
        );
        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        // 좋아요 여부 확인
        const [likeCheck] = await db.query(
            'SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?',
            [post_id, user_id]
        );

        // 조회수 증가
        await db.query('UPDATE posts SET views = views + 1 WHERE post_id = ?', [post_id]);

        res.status(200).json({
            message: "게시글 조회 성공",
            data: {
                ...post,
                isAuthor: post.user_id === user_id,
                isLiked: likeCheck.length > 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 등록
export const createPost = async (req, res) => {
    const { title, content } = req.body;
    const user_id = req.session.user_id;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const post_id = uuidv4();
        const image_url = req.file ? `/uploads/${req.file.filename}` : '';
        const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await db.query(
            `
            INSERT INTO posts (post_id, user_id, title, content, image_url, likes, views, comments_count, created_at)
            VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)
            `,
            [post_id, user_id, title, content, image_url, currentDateTime]
        );

        res.status(201).json({ message: "게시글 작성 완료", data: { post_id } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 삭제
export const deletePost = async (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;

    try {
        const [[post]] = await db.query('SELECT * FROM posts WHERE post_id = ?', [post_id]);
        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        // 작성자와 삭제하려는 user_id가 같은지 확인
        if (post.user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        // 이미지 삭제
        if (post.image_url) {
            const oldImagePath = getUploadFilePath(post.image_url);
            deleteFile(oldImagePath);
        }

        // 게시글 삭제
        await db.query('DELETE FROM posts WHERE post_id = ?', [post_id]);
        res.status(200).json({ message: "게시글 삭제 완료", data: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 수정
export const updatePost = async (req, res) => {
    const post_id = req.params.post_id;
    const { title, content } = req.body;
    const user_id = req.session.user_id;

    if (!title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const [[post]] = await db.query('SELECT * FROM posts WHERE post_id = ?', [post_id]);
        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        if (post.user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        // 이미지 업데이트
        if (req.file) {
            if (post.image_url) {
                const oldImagePath = getUploadFilePath(post.image_url);
                deleteFile(oldImagePath);
            }
            post.image_url = `/uploads/${req.file.filename}`;
        }

        // 게시글 업데이트
        await db.query(
            `
            UPDATE posts
            SET title = ?, content = ?, image_url = ?
            WHERE post_id = ?
            `,
            [title, content, post.image_url, post_id]
        );

        res.status(200).json({ message: "수정 완료", data: post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};


/* -------------------------- 댓글 API -------------------------- */

// 댓글 작성
export const createComment = async (req, res) => {
    const post_id = req.params.post_id;
    const { content } = req.body;
    const user_id = req.session.user_id;

    if (!user_id || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const comment_id = uuidv4();
        const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await db.query(
            `
            INSERT INTO comments (comment_id, post_id, user_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            `,
            [comment_id, post_id, user_id, content, currentDateTime]
        );

        await db.query(
            'UPDATE posts SET comments_count = comments_count + 1 WHERE post_id = ?',
            [post_id]
        );

        res.status(201).json({ message: "댓글 작성 완료", data: { comment_id } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 댓글 조회
export const getCommentsByPostId = async (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;

    try {
        const [comments] = await db.query(
            `
            SELECT c.comment_id, c.content, c.created_at, u.nickname AS author, u.profile_image,
                   CASE WHEN c.user_id = ? THEN true ELSE false END AS isAuthor
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
            `,
            [user_id, post_id]
        );

        res.status(200).json({ message: "댓글 조회 성공", data: comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 댓글 수정 API
export const updateComment = async (req, res) => {
    const post_id = req.params.post_id;
    const comment_id = req.params.comment_id;
    const { content } = req.body;
    const user_id = req.session.user_id;

    if (!content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const [result] = await db.query(
            `
            UPDATE comments
            SET content = ?
            WHERE comment_id = ? AND post_id = ? AND user_id = ?
            `,
            [content, comment_id, post_id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "댓글을 찾을 수 없거나 권한이 없습니다.", data: null });
        }

        res.status(200).json({ message: "댓글 수정 완료", data: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 댓글 삭제
export const deleteComment = async (req, res) => {
    const post_id = req.params.post_id;
    const comment_id = req.params.comment_id;
    const user_id = req.session.user_id;

    try {
        const [result] = await db.query(
            `
            DELETE FROM comments
            WHERE comment_id = ? AND post_id = ? AND user_id = ?
            `,
            [comment_id, post_id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "댓글을 찾을 수 없거나 권한이 없습니다.", data: null });
        }

        await db.query(
            'UPDATE posts SET comments_count = comments_count - 1 WHERE post_id = ?',
            [post_id]
        );

        res.status(200).json({ message: "댓글 삭제 완료", data: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

//     fs.readFile(commentsFilePath, 'utf8', (err, data) => {
//         if (err) return res.status(500).json({ message: "서버 에러", data: null });

//         const commentsData = JSON.parse(data);

//         // post_id 게시글에 해당하는 댓글들 찾기
//         const postComments = commentsData[post_id];
//         if (!postComments) {
//             return res.status(404).json({ message: "댓글을 찾을 수 없습니다.", data: null });
//         }

//         // commentId로 특정 댓글 인덱스 찾기
//         const commentIndex = postComments.findIndex(comment => comment.comment_id === comment_id);
//         if (commentIndex === -1) {
//             return res.status(404).json({ message: "해당 댓글이 없습니다.", data: null });
//         }

//         if (postComments[commentIndex].user_id !== user_id) {
//             return res.status(403).json({ message: "권한이 없습니다.", data: null });
//         }

//         // 댓글 삭제
//         postComments.splice(commentIndex, 1);

//         // 변경된 댓글 데이터를 파일에 저장
//         fs.writeFile(commentsFilePath, JSON.stringify(commentsData), 'utf8', (writeErr) => {
//             if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
//             fs.readFile(postsFilePath, 'utf8', (postErr, postData) => {
//                 if (postErr) return res.status(500).json({ message: "서버 에러", data: null });

//                 const posts = JSON.parse(postData);
//                 const postIndex = posts.findIndex(p => p.post_id === post_id);

//                 if (postIndex !== -1) {
//                     posts[postIndex].comments_count -= 1;

//                     fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), 'utf8', (updateErr) => {
//                         if (updateErr) return res.status(500).json({ message: "댓글 수 업데이트 실패", data: null });

//                         res.status(200).json({ message: "댓글 삭제 완료", data: null });
//                     });
//                 } else {
//                     res.status(404).json({ message: "게시글을 찾을 수 없습니다.", data: null });
//                 }
//             });
//         });
//     });
// };


// /* -------------------------- 좋아요 API -------------------------- */
export const toggleLike = async (req, res) => {
    const post_id  = req.params.post_id;
    const user_id = req.session.user_id;

    if (!user_id) {
        return res.status(401).json({message: "로그인이 필요합니다.", data: null}); 
    }

    try {
        const [likeCheck] = await db.query(
            'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
            [post_id, user_id]
        );

        let isLiked = false;
        if (likeCheck.length > 0) {
            await db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post_id, user_id]);
            await db.query('UPDATE posts SET likes = likes - 1 WHERE post_id = ?', [post_id]);
        } else {
            await db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [post_id, user_id]);
            await db.query('UPDATE posts SET likes = likes + 1 WHERE post_id = ?', [post_id]);
            isLiked = true;
        }

        const [[{ likes }]] = await db.query(
            'SELECT likes FROM posts WHERE post_id = ?',
            [post_id]
        );

        res.status(200).json({
            message: "좋아요 상태 변경 성공",
            data: { likes, isLiked },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};