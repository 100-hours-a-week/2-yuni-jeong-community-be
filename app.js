import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import cors from 'cors';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        httpOnly: true,
        secure: false,
    }
}));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(PORT, () => {
    console.log('http://localhost:8080 에서 서버 실행 중');
});
