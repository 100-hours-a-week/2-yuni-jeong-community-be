import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import cors from 'cors';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공

// HTML 파일을 위한 라우트
// app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
// app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'views', 'signin.html')));

// API 라우트
app.use('/users', userRoutes); // /api/users/signup, /api/users/login 경로에 연결

// 서버 시작
app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행 중');
});
