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
        console.log(user.name);

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

        res.json({ token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server error" });
    }
});

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