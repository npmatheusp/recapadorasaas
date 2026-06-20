const express = require('express');

const router = express.Router();

const auth = require('../middlewares/auth');

const producaoController =
require('../controllers/producaoController');

router.get(
    '/historico',
    auth,
    producaoController.historico
);

router.get(
    '/bandas',
    auth,
    producaoController.bandasDisponiveis
);

router.post(
    '/',
    auth,
    producaoController.registrar
);

module.exports = router;