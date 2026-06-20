const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {

    try {

        const { usuario, senha } = req.body;

        const [rows] = await pool.execute(
            'SELECT * FROM usuarios WHERE usuario = ?',
            [usuario]
        );

        if(rows.length === 0){
            return res.status(401).json({
                mensagem: 'Usuário não encontrado'
            });
        }

        const user = rows[0];

        const senhaValida = await bcrypt.compare(
            senha,
            user.senha
        );

        if(!senhaValida){
            return res.status(401).json({
                mensagem: 'Senha inválida'
            });
        }

        const token = jwt.sign(
    {
        id: user.id,
        nome: user.nome,
        perfil: user.perfil
    },
    process.env.JWT_SECRET,
    {
        expiresIn: '8h'
    }
);
        return res.json({
            token,
            usuario: {
                id: user.id,
                nome: user.nome,
                perfil: user.perfil
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            mensagem: 'Erro interno'
        });
    }
};