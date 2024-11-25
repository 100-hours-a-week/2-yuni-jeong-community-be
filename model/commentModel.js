import db from '../utils/db.js';

export const createComment = async ({post_id, user_id, content, created_at}) => {
    const [result] = await db.query(
        `
        INSERT INTO comments (post_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?)
        `,
        [post_id, user_id, content, created_at]
    );

    await db.query(
        'UPDATE posts SET comments_count = comments_count + 1 WHERE post_id = ?',
        [post_id]
    );
    return result.insertId;
}

export const getCommentsByPostId = async (post_id, user_id) => {
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
    return comments;
}

export const updateComment = async ({comment_id, post_id, user_id, content}) => {
    const [result] = await db.query(
        `
        UPDATE comments
        SET content = ?
        WHERE comment_id = ? AND post_id = ? AND user_id = ?
        `,
        [content, comment_id, post_id, user_id]
    );
    
    return result.affectedRows > 0;
}

export const deleteComment = async ({comment_id, post_id, user_id}) => {
    const [result] = await db.query(
        `
        DELETE FROM comments
        WHERE comment_id = ? AND post_id = ? AND user_id = ?
        `,
        [comment_id, post_id, user_id]
    );

    if (result.affectedRows > 0) {
        await db.query(
            'UPDATE posts SET comments_count = comments_count - 1 WHERE post_id = ?',
            [post_id]
        );
    }

    return result.affectedRows > 0;
}