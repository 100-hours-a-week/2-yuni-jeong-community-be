import db from './utils/db.js';

const testConnection = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Database connection successful!');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error);
    }
};

testConnection();
