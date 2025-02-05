import { uploadToS3, deleteFromS3 } from '../utils/fileUtils.js';
import * as postModel from '../model/postModel.js';
import * as commentModel from '../model/commentModel.js';
import { sanitizeInput } from '../utils/sanitize.js';

/* -------------------------- 게시글 API -------------------------- */

// 모든 게시글 조회
export const getAllPosts = async (req, res) => {
    const page = parseInt(req.params.page,) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const posts = await postModel.getAllPosts(limit, offset);
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
        const post = await postModel.getPostById(post_id);

        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        // 좋아요 여부 확인
        const isLiked = await postModel.checkLikeStatus(post_id, user_id);
        
        // 조회수 증가
        await postModel.incrementPostViews(post_id);

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
    const title = sanitizeInput(req.body.title);
    const content = sanitizeInput(req.body.content);
    const user_id = req.session.user_id;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    if (title.length > 50) {
        return res.status(400).json({ message: "제목은 최대 26자까지 작성 가능합니다.", data: null });
    }

    if (content.length > 1500) {
        return res.status(400).json({ message: "본문은 최대 1500자까지 작성 가능합니다.", data: null });
    }


    try {
        let image_url = '';

        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            image_url = await uploadToS3(req.file.buffer, fileName, req.file.mimetype);
        }
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const post_id = await postModel.uploadPost({ user_id, title, content, image_url, created_at });
    
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
        const post = await postModel.getPostById(post_id);
        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        // 작성자와 삭제하려는 user_id가 같은지 확인
        if (post.user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        // 이미지 삭제
        if (post.image_url) {
            const fileName = post.image_url.split('/').pop();
            await deleteFromS3(fileName);
        }

        // 게시글 삭제
        await postModel.deletePost(post_id);
        res.status(200).json({ message: "게시글 삭제 완료", data: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};

// 게시글 수정
export const updatePost = async (req, res) => {
    const post_id = req.params.post_id;
    const title = sanitizeInput(req.body.title);
    const content = sanitizeInput(req.body.content);
    const user_id = req.session.user_id;

    if (!title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    if (title.length > 50) {
        return res.status(400).json({ message: "제목은 최대 26자까지 작성 가능합니다.", data: null });
    }

    if (content.length > 1500) {
        return res.status(400).json({ message: "본문은 최대 1500자까지 작성 가능합니다.", data: null });
    }


    try {
        const post = await postModel.getPostById(post_id);
        console.log(post)
        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        if (post.user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        let new_image_url = post.image_url;
        let new_file_name = post.image_url ? post.image_url.split('/').pop() : null;

        // 이미지 업데이트
        if (req.file) {
            if (post.image_url) {
                const fileName = post.image_url.split('/').pop();
                await deleteFromS3(fileName);
            }

            new_file_name = req.file.originalname.replace(/\s+/g, '_'); 
            new_image_url = await uploadToS3(req.file.buffer, new_file_name, req.file.mimetype);
        }
        
        // 게시글 업데이트
        await postModel.updatePost(post_id, title, content, new_image_url);

        const updatedPost = await postModel.getPostById(post_id);


        res.status(200).json({ 
            message: "수정 완료", 
            data: { 
                post_id: updatedPost.post_id, 
                image_url: updatedPost.image_url,
                file_name: new_file_name
            } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};


/* -------------------------- 댓글 API -------------------------- */

// 댓글 작성
export const createComment = async (req, res) => {
    const post_id = req.params.post_id;
    const content = sanitizeInput(req.body.content);
    const user_id = req.session.user_id;

    if (!user_id || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    if (content.length > 300) {
        return res.status(400).json({ message: "댓글은 최대 300자까지 작성 가능합니다.", data: null });
    }

    try {
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const comment_id = await commentModel.createComment({post_id, user_id, content, created_at});

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
    const content = sanitizeInput(req.body.content);
    const user_id = req.session.user_id;

    if (!content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    if (content.length > 300) {
        return res.status(400).json({ message: "댓글은 최대 300자까지 작성 가능합니다.", data: null });
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
        const isLiked = await postModel.checkLikeStatus(post_id, user_id);
        await postModel.togglePostLike(post_id, user_id, isLiked);

        const post = await postModel.getPostById(post_id);
        res.status(200).json({
            message: "좋아요 상태 변경 성공",
            data: { likes: post.likes, isLiked: !isLiked  },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러", data: null });
    }
};