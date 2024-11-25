import db from '../utils/db.js';

export const findUserByEmail = async (email) => {
    const [[user]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return user;
};

export const findUserByNickname = async (nickname) => {
    const [[user]] = await db.query('SELECT * FROM users WHERE nickname = ?', [nickname]);
    return user;
}

export const findUserById = async (user_id) => {
    const [[user]] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    return user;
}

export const createUser = async (user_data) => {
    const { email, hashedPassword, nickname, profile_image } = user_data;
    const [result] = await db.query(
        'INSERT INTO users (email, password, nickname, profile_image) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, nickname, profile_image]
    );
    return result.insertId;
};


export const updateUserProfile = async (user_id, nickname, profile_image) => {
    await db.query(
        'UPDATE users SET nickname = ?, profile_image = ? WHERE user_id = ?',
        [nickname, profile_image, user_id]
    );
};

export const updatePassword = async (user_id, hashedPassword) => {
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, user_id]);
}

export const deleteUserAccount = async (user_id) => {
    await db.query('DELETE FROM comments WHERE user_id = ?', [user_id]);
    await db.query('DELETE FROM posts WHERE user_id = ?', [user_id]);
    await db.query('DELETE FROM users WHERE user_id = ?', [user_id]);
};