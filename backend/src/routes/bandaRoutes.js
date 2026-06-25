const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const permissao = require('../middlewares/permissao');

const bandaController = require('../controllers/bandaController');

// LISTAR TODAS
router.get('/', auth, permissao('ADMIN', 'VENDEDOR'), bandaController.listar);

// RELATÓRIO PDF -> TEM QUE VIR ANTES DE /:id
router.get('/pdf', auth, permissao('ADMIN', 'VENDEDOR'), bandaController.gerarPdfEstoque);

// DISPONIBILIDADE
router.get(
    '/disponibilidade',
    auth,
    permissao('ADMIN', 'VENDEDOR', 'PRODUCAO'),
    bandaController.disponibilidade
);

// BUSCAR POR ID
router.get('/:id', auth, permissao('ADMIN', 'VENDEDOR'), bandaController.buscarPorId);

// CADASTRAR
router.post('/', auth, permissao('ADMIN'), bandaController.cadastrar);

// EDITAR
router.put('/:id', auth, permissao('ADMIN'), bandaController.editar);

// ENTRADA DE ESTOQUE
router.put('/:id/entrada', auth, permissao('ADMIN'), bandaController.entradaEstoque);

// EXCLUIR
router.delete('/:id', auth, permissao('ADMIN'), bandaController.excluir);

// ALTERAR STATUS
router.patch('/:id/status', auth, permissao('ADMIN'), bandaController.alterarStatus);

module.exports = router;