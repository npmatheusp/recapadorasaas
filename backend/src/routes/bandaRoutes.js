const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const permissao = require('../middlewares/permissao');

const bandaController = require('../controllers/bandaController');

router.get('/', auth, permissao('ADMIN', 'VENDEDOR'), bandaController.listar);

router.get(
    '/disponibilidade',
    auth,
    permissao('ADMIN', 'VENDEDOR', 'PRODUCAO'),
    bandaController.disponibilidade
);

router.get('/:id', auth, permissao('ADMIN', 'VENDEDOR'), bandaController.buscarPorId);

router.post('/', auth, permissao('ADMIN'), bandaController.cadastrar);

router.put('/:id', auth, permissao('ADMIN'), bandaController.editar);

router.put('/:id/entrada', auth, permissao('ADMIN'), bandaController.entradaEstoque);

router.delete('/:id', auth, permissao('ADMIN'), bandaController.excluir);

router.patch('/:id/status', auth, permissao('ADMIN'), bandaController.alterarStatus);

router.get('/pdf', auth, bandaController.gerarPdfEstoque);

module.exports = router;