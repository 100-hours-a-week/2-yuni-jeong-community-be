import fs from 'fs';
import path from 'path';
import { getUserById } from './userController.js';
import { deleteFile, getUploadFilePath } from '../utils/fileUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { postsFilePath, commentsFilePath } from '../utils/filePath.js';
import db from '../utils/db.js';
import {
    fetchPosts,
    fetchPostById,
    createPost,
    removePost,
    updatePostById,
    incrementPostViews,
    checkLikeStatus,
    togglePostLike,
} from '../model/postModel.js';
import * as commentModel from '../model/commentModel.js';

/* -------------------------- 게시글 API -------------------------- */

// 모든 게시글 조회
export const getAllPosts = async (req, res) => {
    const page = parseInt(req.params.page,) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const posts = await fetchPosts(limit, offset);
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
        const post = await fetchPostById(post_id);

        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        // 좋아요 여부 확인
        const isLiked = await checkLikeStatus(post_id, user_id);
        
        // 조회수 증가
        await incrementPostViews(post_id);

        res.status(200).json({
            message: "게시글 조회 성공",
            data: {
                ...post,
                isAuthor: post.user_id === user_id,
                isLiked
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 등록
export const uploadPost = async (req, res) => {
    const { title, content } = req.body;
    const user_id = req.session.user_id;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    try {
        const post_id = uuidv4();
        const image_url = req.file ? `/uploads/${req.file.filename}` : '';
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await createPost({ post_id, user_id, title, content, image_url, created_at });
    
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
        const post = await fetchPostById(post_id);
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
        await removePost(post_id);
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
        const post = await fetchPostById(post_id);
        console.log(post)
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
        await updatePostById(post_id, title, content, post.image_url);

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
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await commentModel.createComment({comment_id, post_id, user_id, content, created_at});

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
        const comments = await commentModel.getCommentsByPostId(post_id, user_id)
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
        const result = await commentModel.updateComment({comment_id, post_id, user_id, content})
        if (!result) {
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
        const result = await commentModel.deleteComment({comment_id, post_id, user_id});
        

        if (!result) {
            return res.status(404).json({ message: "댓글을 찾을 수 없거나 권한이 없습니다.", data: null });
        }

        res.status(200).json({ message: "댓글 삭제 완료", data: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// /* -------------------------- 좋아요 API -------------------------- */
export const toggleLike = async (req, res) => {
    const post_id  = req.params.post_id;
    const user_id = req.session.user_id;

    if (!user_id) {
        return res.status(401).json({message: "로그인이 필요합니다.", data: null}); 
    }

    try {
        const isLiked = await checkLikeStatus(post_id, user_id);
        await togglePostLike(post_id, user_id, isLiked);

        const post = await fetchPostById(post_id);
        res.status(200).json({
            message: "좋아요 상태 변경 성공",
            data: { likes: post.likes, isLiked: !isLiked  },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};