import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserById } from './userController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsFilePath = path.join(__dirname, '../model/posts.json');
const commentsFilePath = path.join(__dirname, '../model/comments.json');



/* -------------------------- 게시글 API -------------------------- */

// 모든 게시글 조회
export const getAllPosts = (req, res) => {
    const page = parseInt(req.query.page) || 1; // 요청된 페이지 번호
    const limit = 10; // 페이지당 표시할 게시글 수
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;


    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: "서버 에러", data: null });
        }

        const posts = JSON.parse(data);
        const paginatedPosts = posts.slice(startIndex, endIndex).map(post => {
            const author = getUserById(post.user_id);
            return {
                ...post,
                author: author ? author.nickname : "알 수 없음",
                profile_image: author ? author.profile_image : null
            };
        });

        res.status(200).json({ message: "게시글 목록 조회 성공", data: paginatedPosts });
    });

};

// 게시글 상세 조회
export const getPostById = (req, res) => {
    const postId = parseInt(req.params.postId, 10);

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: "서버 에러", data: null });
        }

        const posts = JSON.parse(data);
        const post = posts.find(p => p.post_id === postId);

        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        const author = getUserById(post.user_id);
        const postWithAuthor = {
            ...post,
            author: author ? author.nickname : "알 수 없음",
            profile_image: author ? author.profile_image : null
        };

        res.status(200).json({ message: "게시글 조회 성공", data: postWithAuthor });
    });
};

// 게시글 등록
export const createPost = (req, res) => {
    const { user_id, title, content, image_url } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const posts = JSON.parse(data);
        const newPost = {
            post_id: posts.length + 1,
            user_id,
            title,
            content,
            image_url: image_url || "",
            likes: 0,
            views: 0,
            comments_count: 0,
            date: new Date().toISOString()
        };

        posts.push(newPost);

        fs.writeFile(postsFilePath, JSON.stringify(posts), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(201).json({ message: "게시글 작성 완료", data: { post_id: newPost.post_id } });
        });
    });
};

// 게시글 삭제
export const deletePost = (req, res) => {
    const postId = parseInt(req.params.postId, 10);

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const posts = JSON.parse(data);
        const postIndex = posts.findIndex(post => post.post_id === postId);

        if (postIndex === -1) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        posts.splice(postIndex, 1);

        fs.writeFile(postsFilePath, JSON.stringify(posts), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(200).json({ message: "게시글 삭제 완료", data: null });
        });
    });
};

// 게시글 수정
export const updatePost = (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const { title, content, image_url } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        try {
            const posts = JSON.parse(data);
            const postIndex = posts.findIndex(post => post.post_id === postId);

            if (postIndex === -1) {
                return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
            }

            // 기존 게시글 업데이트
            posts[postIndex] = { 
                ...posts[postIndex], 
                title, 
                content, 
                image_url: image_url || posts[postIndex].image_url 
            };

            fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), 'utf8', (writeErr) => {
                if (writeErr) return res.status(500).json({ message: "파일 쓰기 에러", data: null });
                res.status(200).json({ message: "수정 완료", data: posts[postIndex] });
            });
        } catch (parseErr) {
            console.error("JSON 파싱 오류:", parseErr);
            return res.status(500).json({ message: "데이터 파싱 중 오류 발생", data: null });
        }
    });
};


/* -------------------------- 댓글 API -------------------------- */

// 댓글 작성
export const createComment = (req, res) => {
    const postId = req.params.post_id;
    const { user_id, content } = req.body;

    if (!user_id || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    const author = getUserById(user_id);
    if (!author) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다.", data: null });
    }

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const commentsData = JSON.parse(data);
        const commentsForPost = commentsData[postId] || [];
        const newComment = {
            comment_id: commentsForPost.length + 1,
            author: author.nickname,
            profile_image: author.profile_image,
            content,
            date: new Date().toISOString(),
        };

        if (!commentsData[postId]) {
            commentsData[postId] = [];
        }

        commentsData[postId].push(newComment);

        fs.writeFile(commentsFilePath, JSON.stringify(commentsData), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(201).json({ message: "댓글 작성 완료", data: newComment });
        });
    });
};

// 댓글 조회
export const getCommentsByPostId = (req, res) => {
    const postId = req.params.post_id;

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });
            
        const commentsData = JSON.parse(data);
        const comments = commentsData[postId] || [];
        
        return res.status(200).json({ message: "댓글 조회 성공", data: comments });
    });
};

// 댓글 수정 API
export const updateComment = (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        try {
            const commentsData = JSON.parse(data);

            // 특정 게시글에 대한 댓글들 - commentsForPost
            const commentsForPost = commentsData[postId];
            if (!Array.isArray(commentsForPost)) {
                return res.status(404).json({ message: "댓글을 찾을 수 없습니다.", data: null });
            }

            // commentId에 해당하는 댓글 - comment
            const comment = commentsForPost.find((c) => c.comment_id === commentId);
            if (!comment) {
                return res.status(404).json({ message: "댓글을 찾을 수 없습니다.", data: null });
            }

            comment.content = content;

            console.log(comment)

            fs.writeFile(commentsFilePath, JSON.stringify(commentsData, null, 2), 'utf8', (writeErr) => {
                if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
                res.status(200).json({ message: "댓글 수정 완료", data: comment });
            });
        } catch (parseErr) {
            console.error("JSON 파싱 오류:", parseErr);
            return res.status(500).json({ message: "데이터 파싱 중 오류 발생", data: null });
        }
    });
};

// 댓글 삭제
export const deleteComment = (req, res) => {
    const postId = req.params.post_id;
    const commentId = parseInt(req.params.comment_id, 10);

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const commentsData = JSON.parse(data);

        // postId 게시글에 해당하는 댓글들 찾기
        const postComments = commentsData[postId];
        if (!postComments) {
            return res.status(404).json({ message: "댓글을 찾을 수 없습니다.", data: null });
        }

        // commentId로 특정 댓글 찾기
        const commentIndex = postComments.findIndex(comment => comment.comment_id === commentId);
        if (commentIndex === -1) {
            return res.status(404).json({ message: "해당 댓글이 없습니다.", data: null });
        }

        // 댓글 삭제
        postComments.splice(commentIndex, 1);

        // 변경된 댓글 데이터를 파일에 저장
        fs.writeFile(commentsFilePath, JSON.stringify(commentsData), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            res.status(200).json({ message: "댓글 삭제 완료", data: null });
        });
    });
};
