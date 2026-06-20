const express = require('express');

const router = express.Router();

const auth = require('../middlewares/auth');

const movimentacaoController =
require('../controllers/movimentacaoController');

router.get(
    '/',
    auth,
    movimentacaoController.listar
);

router.post(
    '/entrada',
    auth,
    movimentacaoController.entrada
);

module.exports = router;