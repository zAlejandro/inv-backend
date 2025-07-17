import express from "express";
import pool from '../db.js';
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const {name, description, price, barcode, category_id, stock} = req.body;
        const tenant_id = req.user.tenant_id;

        if(!name || !price){
            return res.status(400).json({message: "Nombre y precio son requeridos"});
        }

        const result = await pool.query(
            `INSERT INTO products (tenant_id, name, description, price, barcode, category_id, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                tenant_id,
                name,
                description || null,
                price,
                barcode || null,
                category_id || null,
                stock || 0
            ]
        );

        res.status(201).json({
            message: "Producto creado correctamente.",
            producto: result.rows[0]
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({message: "Error interno del servidor."});
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.tenant_id = $1
            ORDER BY p.created_at DESC`,
            [req.user.tenant_id]

        );
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Error al obtener los productos"});
    }
});

router.get("/:id", authMiddleware, async (req, res) => {
    const {id} = req.params;
    const tenant_id = req.user.tenant_id;

    try {
        const result = await pool.query(`SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 and p.tenant_id = $2
            ORDER BY p.created_at DESC;`,
            [id, tenant_id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({message: "Producto no encontrado."});
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error("Error al obtener el producto: ", e);
        res.status(500).json({message: "Error al obtener los datos del producto"});
    }
})

router.delete("/", authMiddleware, async (req, res) => {
    const {id} = req.body;
    const tenant_id = req.user.tenant_id;

    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);

        if(result.rowCount === 0){
            return res.status(404).json({message: "Producto no encontrado"});
        }

        res.json({message: "Producto eliminado correctamente"});
    } catch (e) {
        console.error("Error al eliminar el producto.", e);
        res.status(500).json({message: "Error al eliminar el producto"});
    }
});

router.put("/", authMiddleware, async (req, res) => {
    const { id, name, description, price, stock, category_id } = req.body;
    const tenant_id = req.user.tenant_id;

    if(!id || !name || !description || !price || !stock || !category_id){
        return res.status(400).json({message: "Faltan campos obligatorios"});
    }

    try {
        const result = await pool.query(`UPDATE products
        SET name = $1, description = $2, price = $3, stock = $4, category_id = $5
        WHERE id = $6 AND tenant_id = $7`,
        [name,description || '', price, stock || 0, category_id, id, tenant_id]
    );

    if (result.rowCount === 0){
        return res.status(404).json({message: "producto no encontrado o no autorizado"});
    }

    res.json({message: "Producto actualizado correctamente"});
    } catch (e) {
        console.error("error al actualizar: ", e);
        res.status(500).json({message: "Error del servidor al actualizar producto."})
    }
    
});

export default router;