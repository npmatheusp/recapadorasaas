const express = require('express');
const router = express.Router();
const pneusController = require('../controllers/pneusController'); // ajuste o caminho se necessário

// LINK DA CONSULTA ONLINE DO VENDEDOR (Celular / Computador)
router.get('/pneus-novos/online', pneusController.consultarEstoqueOnline);

// LINKS DE ADMINISTRAÇÃO (Para você controlar)
router.get('/pneus-novos', pneusController.listarTodos);
router.post('/pneus-novos', pneusController.cadastrar);
router.put('/pneus-novos/:id/estoque', pneusController.atualizarEstoque);
router.delete('/pneus-novos/:id', pneusController.excluir);

module.exports = router;