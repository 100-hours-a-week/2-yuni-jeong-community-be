import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import cors from 'cors';
import { createStream } from 'rotating-file-stream';
import morgan from 'morgan';
import fileSystem from 'fs';
import moment from 'moment-timezone';

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
    origin: ['http://localhost:3000','http://3.35.49.33:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 로그 파일 생성
morgan.token('date', (request, response, timezone) => {
    return moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
});

const logDirectory = path.join(__dirname, 'log');
fileSystem.existsSync(logDirectory) || fileSystem.mkdirSync(logDirectory);

const accessLogStream = createStream('access.log', {
    interval: '1d', // 1일 단위
    path: logDirectory,
});

// 시간대를 Asia/Seoul로 설정
morgan.token('date', (request, response, timezone) => {
    return moment().tz(timezone).format();
});

// 로그를 morgan으로 남길 때 홑따옴표(')안의 형식대로 로그를 남기도록 설정
// 토큰: 메시지에 출력되는 특수한 문자열 = :remote-addr, :remote-user, [:date[Asia/Seoul]], :method, :url, :http-version, :status, :res[content-length], :referrer, :user-agent
app.use(
    morgan(
        ':remote-addr - :remote-user [:date[Asia/Seoul]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
        { stream: accessLogStream }
    )
);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(PORT, () => {
    console.log('http://localhost:8080 에서 서버 실행 중');
});
