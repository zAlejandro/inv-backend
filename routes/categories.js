import express from "express";
import pool from '../db.js';
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name FROM categories WHERE tenant_id = $1",
            [req.user.tenant_id]
        );

        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({error: "Server Error"});
    }
});

router.post("/", authMiddleware, async (req, res) => {
    try {
        const {name, description} = req.body;
        const tenant_id = req.user.tenant_id;

        if(!name){
            return res.status(400).json({message: "Nombre es requerido"});
        }

        const result = await pool.query(
            `INSERT INTO categories (tenant_id, name, description)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                tenant_id,
                name,
                description || null
            ]
        );

        res.status(201).json({
            message: "Categoria creada correctamente.",
            categoria: result.rows[0]
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({message: "Error interno del servidor."});
    }
});

router.get("/:id", authMiddleware, async (req, res) => {
    const {id} = req.params;
    const tenant_id = req.user.tenant_id;

    try {
        const result = await pool.query(`SELECT * FROM categories WHERE id = $1 AND tenant_id = $2`,
            [id, tenant_id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({message: "Categoria no encontrado."});
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error("Error al obtener la categoria: ", e);
        res.status(500).json({message: "Error al obtener los datos de la categoria"});
    }
})

router.put("/", authMiddleware, async (req, res) => {
    const { id, name, description} = req.body;
    const tenant_id = req.user.tenant_id;

    if(!id || !name || !description ){
        return res.status(400).json({message: "Faltan campos obligatorios"});
    }

    try {
        const result = await pool.query(`UPDATE categories
        SET name = $1, description = $2 WHERE id = $3 AND tenant_id = $4`,
        [name, description || '', id, tenant_id]
    );

    if (result.rowCount === 0){
        return res.status(404).json({message: "Categoria no encontrada o no autorizada"});
    }

    res.json({message: "Categoria actualizado correctamente"});
    } catch (e) {
        console.error("error al actualizar: ", e);
        res.status(500).json({message: "Error del servidor al actualizar la categoria."})
    }
    
});

router.delete("/", authMiddleware, async (req, res) => {
    const {id} = req.body;
    const tenant_id = req.user.tenant_id;

    try {
        const result = await pool.query('DELETE FROM categories WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);

        if(result.rowCount === 0){
            return res.status(404).json({message: "Categoria no encontrada"});
        }

        res.json({message: "Categoria eliminada correctamente"});
    } catch (e) {
        console.error("Error al eliminar la categoria.", e);
        res.status(500).json({message: "Error al eliminar la categoria"});
    }
});


export default router;