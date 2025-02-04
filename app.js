import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import cors from 'cors';
import { createStream } from 'rotating-file-stream';
import morgan from 'morgan';
import fileSystem from 'fs';
import moment from 'moment-timezone';
import session from 'express-session';
import mysqlSession from 'express-mysql-session';  

dotenv.config();

const MySQLStore = mysqlSession(session);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_SECRET = process.env.SESSION_SECRET;
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 8080

app.set('trust proxy', 1);

const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 13306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000, // 15분마다 만료된 세션 정리
    expiration: 86400000, // 세션 만료 기간 (1일)

    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    reconnect: true
};

const sessionStore = new MySQLStore(options);

app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    next();
});

const allowedOrigins = [
    'https://hello-yuniverse.site',
    'https://www.hello-yuniverse.site',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());


app.use(session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        domain: '.hello-yuniverse.site',
        maxAge: 24 * 60 * 60 * 1000,
    }
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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
    res.status(200).json({ status: "Healthy" });
});

app.listen(PORT, () => {
    console.log(`http://${HOST}:${PORT} 에서 서버 실행 중`);
});
