import db from '../utils/db.js';

export const getAllPosts = async (limit, offset) => {
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
    return posts;
};

export const getPostById = async (post_id) => {
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
    return post;
};

export const uploadPost = async ({ user_id, title, content, image_url, created_at }) => {
    const [result] = await db.query(
        `
        INSERT INTO posts (user_id, title, content, image_url, likes, views, comments_count, created_at)
        VALUES (?, ?, ?, ?, 0, 1, 0, ?)
        `,
        [user_id, title, content, image_url, created_at]
    );
    return result.insertId;
};

export const deletePost = async (post_id) => {
    await db.query('DELETE FROM posts WHERE post_id = ?', [post_id]);
};

export const updatePost = async (post_id, title, content, image_url) => {
    await db.query(
        `
        UPDATE posts
        SET title = ?, content = ?, image_url = ?
        WHERE post_id = ?
        `,
        [title, content, image_url, post_id]
    );
};

export const incrementPostViews = async (post_id) => {
    await db.query('UPDATE posts SET views = views + 1 WHERE post_id = ?', [post_id]);
};

export const checkLikeStatus = async (post_id, user_id) => {
    const [likeCheck] = await db.query(
        'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
        [post_id, user_id]
    );
    return likeCheck.length > 0;
};

export const togglePostLike = async (post_id, user_id, isLiked) => {
    if (isLiked) {
        await db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post_id, user_id]);
            await db.query('UPDATE posts SET likes = likes - 1 WHERE post_id = ?', [post_id]);
    } else {
        await db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [post_id, user_id]);
        await db.query('UPDATE posts SET likes = likes + 1 WHERE post_id = ?', [post_id]);
    }
}