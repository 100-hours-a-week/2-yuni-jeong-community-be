import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserById } from './userController.js';
import { deleteFile, getUploadFilePath } from '../utils/fileUtils.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsFilePath = path.join(__dirname, '../model/posts.json');
const commentsFilePath = path.join(__dirname, '../model/comments.json');


/* -------------------------- 게시글 API -------------------------- */

// 모든 게시글 조회
export const getAllPosts = (req, res) => {
    const page = parseInt(req.params.page,) || 1; // 요청된 페이지 번호
    const limit = 10;
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
                profile_image: author?.profile_image || '/uploads/user-profile.jpg',
            };
        });

        res.status(200).json({ message: "게시글 목록 조회 성공", data: paginatedPosts });
    });

};

// 게시글 상세 조회
export const getPostById = (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: "서버 에러", data: null });
        }

        const posts = JSON.parse(data);
        const post = posts.find(p => p.post_id === post_id);

        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        const author = getUserById(post.user_id);
        const isAuthor = post.user_id === user_id;

        const isLiked = post.like_users ? post.like_users.includes(user_id) : false;


        post.views += 1;

        fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ message: "조회수 업데이트 실패", data: null });
            }

            const postWithAuthor = {
                ...post,
                author: author ? author.nickname : "알 수 없음",
                profile_image: author?.profile_image || '/uploads/user-profile.jpg',
                image_url: post.image_url || '',
                isAuthor,
                isLiked
            };

            res.status(200).json({ message: "게시글 조회 성공", data: postWithAuthor });
        });
    });
};

// 게시글 등록
export const createPost = (req, res) => {
    const { title, content } = req.body;
    const user_id = req.session.user_id;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const posts = JSON.parse(data);
        const newPost = {
            post_id: uuidv4(),
            user_id,
            title,
            content,
            image_url: req.file ? `/uploads/${req.file.filename}` : '',
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
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const posts = JSON.parse(data);
        const postIndex = posts.findIndex(post => post.post_id === post_id);

        if (postIndex === -1) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }
        
        // 작성자와 삭제하려는 user_id가 같은지 확인
        if (posts[postIndex].user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        const post = posts[postIndex];
        const oldImage = post.image_url;

        if (oldImage) {
            const oldImagePath = getUploadFilePath(path.basename(post.image_url));
            deleteFile(oldImagePath); 
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
    const post_id = req.params.post_id;
    const { title, content } = req.body;
    const user_id = req.session.user_id;

    if (!title || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        try {
            const posts = JSON.parse(data);
            const postIndex = posts.findIndex(post => post.post_id === post_id);

            if (postIndex === -1) {
                return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
            }

            if (posts[postIndex].user_id !== user_id) {
                return res.status(403).json({ message: "권한이 없습니다.", data: null });
            }

            // 기존 이미지 삭제
            const post = posts[postIndex];
            const oldImage = post.image_url;

            if (req.file) {
                const oldImagePath = getUploadFilePath(path.basename(oldImage));
                deleteFile(oldImagePath); // 기존 이미지 삭제
                post.image_url = `/uploads/${req.file.filename}`;
            }

            // 기존 게시글 업데이트
            posts[postIndex] = { 
                ...posts[postIndex], 
                title, 
                content, 
                image_url: post.image_url,
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
    const post_id = req.params.post_id;
    const { content } = req.body;
    const user_id = req.session.user_id;

    if (!user_id || !content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    const author = getUserById(user_id);
    if (!author) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다.", data: null });
    }

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('댓글 데이터 읽기 실패:', err);
            return res.status(500).json({ message: '서버 에러', data: null });
        }

        const commentsData = JSON.parse(data);
        
        if (!commentsData[post_id]) {
            commentsData[post_id] = [];
        }


        const newComment = {
            comment_id: uuidv4(),
            user_id,
            author: author.nickname,
            profile_image: author.profile_image,
            content,
            date: new Date().toISOString(),
        };

        commentsData[post_id].push(newComment);

        fs.writeFile(commentsFilePath, JSON.stringify(commentsData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ message: '서버 에러', data: null });
            }

            fs.readFile(postsFilePath, 'utf8', (postErr, postData) => {
                if (postErr) {
                    console.error("게시글 읽기 실패");
                    return res.status(500).json({ message: '서버 에러', data: null });
                }

                const postsData = JSON.parse(postData);
                const post = postsData.find((p) => p.post_id === post_id);

                if (post) {
                    post.comments_count += 1;
                    fs.writeFile(postsFilePath, JSON.stringify(postsData, null, 2), 'utf8', (updateErr) => {
                        if (updateErr) {
                            console.error('댓글 수 업데이트 실패:', updateErr);
                            return res.status(500).json({ message: '서버 에러', data: null });
                        }
                    });
                }

                res.status(201).json({ message: '댓글 작성 완료', data: newComment });
            });
        });
    });
};

// 댓글 조회
export const getCommentsByPostId = (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.session.user_id;


    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });
            
        const commentsData = JSON.parse(data);
        const comments = commentsData[post_id] || [];

        const commentsWithDetails = comments.map(comment => {
            const author = getUserById(comment.user_id);
            return {
                ...comment,
                author: author ? author.nickname : "알 수 없음",
                profile_image: author ? author.profile_image : null,
                isAuthor: comment.user_id === user_id,
            };
        });
        
        return res.status(200).json({ message: "댓글 조회 성공", data: commentsWithDetails });
    });
};

// 댓글 수정 API
export const updateComment = (req, res) => {
    const post_id = req.params.post_id;
    const comment_id = req.params.comment_id;
    const { content } = req.body;
    const user_id = req.session.user_id;

    if (!content) {
        return res.status(400).json({ message: "잘못된 요청", data: null });
    }

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const commentsData = JSON.parse(data);
        const commentsForPost = commentsData[post_id];

        if (!commentsForPost) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다.', data: null });
        }

        const comment = commentsForPost.find((c) => c.comment_id === comment_id);
        if (!comment || comment.user_id !== user_id) {
            return res.status(403).json({ message: '권한이 없거나 댓글이 없습니다.', data: null });
        }

        comment.content = content;

        fs.writeFile(commentsFilePath, JSON.stringify(commentsData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error('댓글 데이터 쓰기 실패:', writeErr);
                return res.status(500).json({ message: '서버 에러', data: null });
            }

            res.status(200).json({ message: '댓글 수정 완료', data: comment });
        });
    });
};

// 댓글 삭제
export const deleteComment = (req, res) => {
    const post_id = req.params.post_id;
    const comment_id = req.params.comment_id;
    const user_id = req.session.user_id;

    fs.readFile(commentsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "서버 에러", data: null });

        const commentsData = JSON.parse(data);

        // post_id 게시글에 해당하는 댓글들 찾기
        const postComments = commentsData[post_id];
        if (!postComments) {
            return res.status(404).json({ message: "댓글을 찾을 수 없습니다.", data: null });
        }

        // commentId로 특정 댓글 인덱스 찾기
        const commentIndex = postComments.findIndex(comment => comment.comment_id === comment_id);
        if (commentIndex === -1) {
            return res.status(404).json({ message: "해당 댓글이 없습니다.", data: null });
        }

        if (postComments[commentIndex].user_id !== user_id) {
            return res.status(403).json({ message: "권한이 없습니다.", data: null });
        }

        // 댓글 삭제
        postComments.splice(commentIndex, 1);

        // 변경된 댓글 데이터를 파일에 저장
        fs.writeFile(commentsFilePath, JSON.stringify(commentsData), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "서버 에러", data: null });
            fs.readFile(postsFilePath, 'utf8', (postErr, postData) => {
                if (postErr) return res.status(500).json({ message: "서버 에러", data: null });

                const posts = JSON.parse(postData);
                const postIndex = posts.findIndex(p => p.post_id === post_id);

                if (postIndex !== -1) {
                    posts[postIndex].comments_count -= 1;

                    fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), 'utf8', (updateErr) => {
                        if (updateErr) return res.status(500).json({ message: "댓글 수 업데이트 실패", data: null });

                        res.status(200).json({ message: "댓글 삭제 완료", data: null });
                    });
                } else {
                    res.status(404).json({ message: "게시글을 찾을 수 없습니다.", data: null });
                }
            });
        });
    });
};


/* -------------------------- 좋아요 API -------------------------- */
export const toggleLike = (req, res) => {
    const post_id  = req.params.post_id;
    const user_id = req.session.user_id;

    if (!user_id) {
        return res.status(401).json({message: "로그인이 필요합니다.", data: null}); 
    }

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({message: "서버 에러", data: null});

        const posts = JSON.parse(data);
        const post = posts.find((p) => p.post_id === post_id);

        if (!post) {
            return res.status(404).json({message: "게시글을 찾을 수 없습니다. ", data: null});
        }

        if (!post.like_users) {
            post.like_users = [];
        }

        let isLiked = false;

        if (post.like_users.includes(user_id)) {
            post.like_users = post.like_users.filter((id) => id !== user_id);
            post.likes -= 1;
        } else {
            post.like_users.push(user_id);
            post.likes += 1;
            isLiked = true;
        }

        fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), 'utf8', (writeErr)=> {
            if (writeErr) return res.status(500).json({message: "서버 에러", data: null});
            res.status(200).json({
                message: "좋아요 상태 변경 성공",
                data: {
                    likes: post.likes,
                    isLiked
                }
            });
        })
    })
}