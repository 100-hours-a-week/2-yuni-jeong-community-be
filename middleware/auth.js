export const isAuthenticated = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.status(401).json({ message: "로그인이 필요합니다." });
    }
};