import express from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/mensaje", async (req, res) =>{
    res.json({"Menaje":"HOLA"});
})

app.post("/api/register", async (req, res) => {
    const {tenantName, email, password, name} = req.body;

    try {
        const tenantResult = await pool.query(
            'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
            [tenantName]
        );
        const tenantId = tenantResult.rows[0].id;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await pool.query(
            "INSERT INTO users (email, password, name, tenant_id, role) VALUES ($1, $2, $3, $4, $5)",
            [email, hashedPassword, name, tenantId, "tenant_owner"]
        );

        res.json({ message: "Usuario creado correctamente" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post("/api/login", async (req,res) => {
    const {email, password} = req.body;

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if(result.rows.lenght == 0){
            return res.status(401).json({error: "Invalid email or password"});
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(401).json({error: "Invalid email or password"});
        }

        const token = jwt.sign(
            {
                user_id: user.id,
                tenant_id: user.tenant_id,
                role: user.role,
                name: user.name,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        const refreshToken = jwt.sign(
            {
                user_id: user.id,
                tenant_id: user.tenant_id,
                role: user.role,
                name: user.name,
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d"}
        )

        res.json({ token, refreshToken });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/refresh", (req, res) => {
    const {refreshToken} = req.body;

    if(!refreshToken){
        return res.status(400).json({message: "Refresh Token Missing"});
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const payload = {
            user_id: decoded.user_id,
            tenant_id: decoded.tenant_id,
            role: decoded.role,
            name: decoded.name
        };

        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expireIn: "15m",
        });

        res.json({
            token: newAccessToken,
        });
    } catch (e) {
        console.error(e);
        return res.status(401).json({message: "Refresh Token Expired or Invalid"});
    }
});

app.get("/api/me", authMiddleware, (req, res) => {
    res.json({
        user_id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        tenant_id: req.user.tenant_id,
        role: req.user.role
    });
});

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

app.get("/api/products", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products WHERE tenant_id = $1",
            [req.user.tenant_id]
        );
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

function authenticateToken(req, res, next){
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if(!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});