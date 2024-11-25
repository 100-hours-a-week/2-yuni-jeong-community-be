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
    const { user_id, email, hashedPassword, nickname, profile_image } = user_data;
    await db.query(
        'INSERT INTO users (user_id, email, password, nickname, profile_image) VALUES (?, ?, ?, ?, ?)',
        [user_id, email, hashedPassword, nickname, profile_image]
    );
};