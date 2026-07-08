const pool = require('../config/database');

// ======================================================
// CONSULTA ONLINE DO VENDEDOR (Apenas itens com estoque)
// ======================================================
exports.consultarEstoqueOnline = async (req, res) => {
    try {
        // Traz apenas pneus ativos e com quantidade maior que zero
        // Ordena por medida para ficar fácil para o vendedor achar
        const [rows] = await pool.execute(`
            SELECT 
                id,
                medida,
                marca_modelo,
                quantidade_disponivel
            FROM pneus_novos
            WHERE ativo = TRUE AND quantidade_disponivel > 0
            ORDER BY medida, marca_modelo
        `);

        return res.json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao consultar estoque online de pneus novos'
        });
    }
};

// ======================================================
// LISTAR TODOS (Para a sua tela de gerenciamento/adm)
// ======================================================
exports.listarTodos = async (req, res) => {
    try {
        // Mostra tudo (inclusive zerados) para você poder dar entrada no estoque
        const [rows] = await pool.execute(`
            SELECT id, medida, marca_modelo, quantidade_disponivel, ativo 
            FROM pneus_novos 
            WHERE ativo = TRUE
            ORDER BY medida, marca_modelo
        `);
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao listar todos os pneus novos' });
    }
};

// ======================================================
// CADASTRAR NOVO PNEU
// ======================================================
exports.cadastrar = async (req, res) => {
    try {
        const { medida, marca_modelo, quantidade_disponivel } = req.body;

        if (!medida || !medida.trim() || !marca_modelo || !marca_modelo.trim()) {
            return res.status(400).json({
                mensagem: 'Medida e Marca/Modelo são obrigatórios'
            });
        }

        await pool.execute(`
            INSERT INTO pneus_novos (medida, marca_modelo, quantidade_disponivel)
            VALUES (?, ?, ?)
        `, [
            medida.trim(),
            marca_modelo.trim(),
            Number(quantidade_disponivel) || 0
        ]);

        return res.status(201).json({
            mensagem: 'Pneu novo cadastrado com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao cadastrar pneu novo' });
    }
};

// ======================================================
// ATUALIZAR QUANTIDADE EM ESTOQUE (Entradas/Saídas)
// ======================================================
exports.atualizarEstoque = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade } = req.body; // Envia o novo valor total do estoque deste pneu

        if (quantidade === undefined || isNaN(quantidade) || Number(quantidade) < 0) {
            return res.status(400).json({ mensagem: 'Quantidade informada é inválida' });
        }

        await pool.execute(`
            UPDATE pneus_novos
            SET quantidade_disponivel = ?
            WHERE id = ?
        `, [Number(quantidade), id]);

        return res.json({
            mensagem: 'Estoque atualizado com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao atualizar quantidade do pneu' });
    }
};

// ======================================================
// EXCLUIR / DESATIVAR PNEU
// ======================================================
exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.execute(`
            UPDATE pneus_novos
            SET ativo = FALSE
            WHERE id = ?
        `, [id]);

        return res.json({ mensagem: 'Pneu removido do sistema com sucesso' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao excluir pneu' });
    }
};

// 🔥 ADICIONE ESTA FUNÇÃO NO SEU controllers/pneusController.js
exports.registrarVenda = async (req, res) => {
    const { pneu_id, cliente, vendedor, quantidade, valor_total, porcentagem_comissao, valor_comissao, data_venda } = req.body;

    try {
        // 1. Verificar se o pneu existe e buscar a quantidade atual no banco de dados
        // IMPORTANTE: Altere "db" abaixo caso o seu arquivo use outro nome para a conexão (ex: pool, conexao, etc.)
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
        return res.status(201).json({ mensagem: 'Venda registrada com sucesso e estoque atualizado!' });

    } catch (error) {
        console.error('Erro ao processar venda no Controller:', error);
        return res.status(500).json({ erro: 'Erro interno no servidor ao registrar a venda.' });
    }
};