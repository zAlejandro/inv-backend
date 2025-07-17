import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

function authMiddleware(req, res, next){
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({message: "No Token Provided"});
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({message: "Token Expired or Invalid"});
    }
}

export default authMiddleware;