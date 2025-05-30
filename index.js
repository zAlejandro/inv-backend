const express = require('express');
const cors = require('cors');
const pool = require('./db');
const supabase = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/usuarios', async (req, res) => {
    try{
        const result = await pool.query('SELECT id,nombre,correo,created_at FROM usuarios');
        if(!result.rows || result.rows.length === 0){
            return res.json({mensaje: "Todavia no hay nada que mostrar aqui"});
        }

        res.json(result.rows);
    }catch(e){
        res.status(500).json({error:"Error al obtener los usuarios"});
    }
});

app.post('/api/usuarios', async (req, res) =>{
    try {
        const {nombre, correo, password} = req.body;

        if(!nombre || !correo || !password){
            return res.status(400).json({mensaje:'Faltan datos obligatorios'});
        }

        // contraseña encriptada
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre,correo,password) VALUES ($1, $2, $3) RETURNING *',
            [nombre, correo, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({error: 'Error al crear el usuario'})
    }
});

app.get('/api/usuarios/:id', async (req, res) => {
    try{
        const { id } = req.params
        const result = await pool.query('SELECT id,nombre,correo,created_at FROM usuarios WHERE id = $1', [id]);

        if(!result.rows || result.rows.length === 0){
            return res.status(404).json({error: 'No se ha encontrado el usuario especificado'})
        }

        res.json(result.rows[0]);
    }catch(e){
        res.status(500).json({error: 'Error al obtener el usuario especificado'})
    }
});

app.put('/api/usuarios/:id', async (req, res) =>{
    try {
        const {id} = req.params;
        const {nombre, correo, password} = req.body;

        if(!nombre || !correo || !password){
            return res.status(400).json({error: 'Faltan datos obligatorios'});
        }
        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, correo = $2, password = $3 WHERE id = $4 RETURNING *',
            [nombre, correo, password, id]
        );

        if (result.rows.length === 0){
            return res.status(404).json({mensaje: 'No se ha encontrado el usuario especificado'});
        }

        res.status(200).json(result.rows[0]);


    } catch (e) {
        res.status(500).json({error: 'Error al actualizar el usuario'});
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const {id} = req.params;

        const result = await pool.query(
            'DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]
        )

        if (result.rows.length === 0){
            return res.status(404).json({mensaje: 'no se ha encontrado el usuario especificado'});
        }

        res.json({mensaje:'Se ha eliminado el usuario', Usuario: result.rows[0]});
    } catch (e) {
        res.status(500).json({error:'Ha habido un error al eliminar al usuario especificado'});
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});