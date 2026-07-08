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

// 🔥 NOVA ROTA: REGISTRAR VENDA E BAIXAR ESTOQUE DE PNEUS NOVOS
router.post('/vendas', async (req, res) => {
    const { pneu_id, cliente, vendedor, quantidade, valor_total, porcentagem_comissao, valor_comissao, data_venda } = req.body;

    try {
        // 1. Verificar se o pneu existe e buscar a quantidade atual no banco de dados
        // (Substitua "db.query" ou "db.execute" pela sintaxe exata do seu banco, ex: Sequelize, Knex, mysql2, etc.)
        const [pneu] = await db.execute('SELECT quantidade_disponivel FROM pneus_novos WHERE id = ?', [pneu_id]);

        if (!pneu || pneu.length === 0) {
            return res.status(404).json({ erro: 'Pneu não encontrado no catálogo.' });
        }

        const qtdAtual = pneu[0].quantidade_disponivel;

        // 2. Trava de segurança: Verificar se tem estoque suficiente para a venda
        if (qtdAtual < quantidade) {
            return res.status(400).json({ erro: 'Estoque insuficiente para realizar esta venda.' });
        }

        // 3. Atualizar/Deduzir a quantidade do estoque do pneu
        const novaQuantidade = qtdAtual - quantidade;
        await db.execute('UPDATE pneus_novos SET quantidade_disponivel = ? WHERE id = ?', [novaQuantidade, pneu_id]);

        // 4. Salvar o histórico da venda e comissão na tabela de vendas
        await db.execute(
            `INSERT INTO vendas_pneus_novos 
            (pneu_id, cliente, vendedor, quantidade, valor_total, porcentagem_comissao, valor_comissao, data_venda) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [pneu_id, cliente, vendedor, quantidade, valor_total, porcentagem_comissao, valor_comissao, data_venda]
        );

        // Retorna sucesso para a tela do frontend
        res.status(201).json({ mensagem: 'Venda registrada com sucesso e estoque atualizado!' });

    } catch (error) {
        console.error('Erro ao processar venda:', error);
        res.status(500).json({ erro: 'Erro interno no servidor ao registrar a venda.' });
    }
});

module.exports = router;