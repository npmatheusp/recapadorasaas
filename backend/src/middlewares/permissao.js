const permissao = (...perfisPermitidos) => {

return (req, res, next) => {

    if (
        !req.usuario ||
        !perfisPermitidos.includes(req.usuario.perfil)
    ) {
        return res.status(403).json({
            mensagem: 'Acesso negado'
        });
    }

    next();
};


};

module.exports = permissao;
