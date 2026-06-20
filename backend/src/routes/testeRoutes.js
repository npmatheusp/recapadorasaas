const express = require('express');

const auth =
require('../middlewares/auth');

const router = express.Router();

router.get(
    '/',
    auth,
    (req,res)=>{

        res.json({
            mensagem:'Rota protegida',
            usuario:req.usuario
        });

    }
);

module.exports = router;