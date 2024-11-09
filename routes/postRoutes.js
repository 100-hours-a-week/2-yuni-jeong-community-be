import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const postsFilePath = path.join(__dirname, '../model/posts.json');

router.get('/', (req, res) => {
    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: "서버 에러", data: null });
        }
        const posts = JSON.parse(data);
        res.status(200).json({ message: "게시글 목록 조회 성공", data: posts });
    });
});

router.get('/:postId', (req, res) => {
    const postId = parseInt(req.params.postId, 10);

    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: "서버 에러", data: null });
        }
        const posts = JSON.parse(data);
        const post = posts.find(p => p.post_id === postId);

        if (!post) {
            return res.status(404).json({ message: "찾을 수 없는 게시글입니다.", data: null });
        }

        res.status(200).json({ message: "게시글 조회 성공", data: post });
    });
});

export default router;
