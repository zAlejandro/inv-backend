const jwt = require('jsonwebtoken');

function verificarToken(req, res, next){
    const token = req.headers['Authorization'];

    if(!token) return res.status(401).json({menasje: 'Token requerido'});

    try {
        const decoded = jwt.verify(token.replace('Bearer', ''), process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (e) {
        res.status(403).json({mensaje: 'Token Invalido o expirado'});
    }
}

module.exports = verificarToken;