const pool = require("../config/database");

exports.resumo = async (req, res) => {
    try {
        // 1. Total em estoque das bandas
        const [[estoque]] = await pool.execute(`
            SELECT COALESCE(SUM(estoque_total), 0) AS total
            FROM bandas
            WHERE ativo = TRUE
        `);

        // CORREÇÃO AQUI: Trocar COUNT(*) por SUM(quantidade)
        const [[producoesHoje]] = await pool.execute(`
            SELECT COALESCE(SUM(quantidade), 0) AS total
            FROM producao
            WHERE DATE(criado_em) = CURDATE()
        `);

        // CORREÇÃO AQUI: Trocar COUNT(*) por SUM(quantidade)
        const [[producoesMes]] = await pool.execute(`
            SELECT COALESCE(SUM(quantidade), 0) AS total
            FROM producao
            WHERE MONTH(criado_em) = MONTH(CURDATE())
            AND YEAR(criado_em) = YEAR(CURDATE())
        `);

        const [ultimasProducoes] = await pool.execute(`
            SELECT
                p.id,
                p.quantidade,
                p.criado_em,
                b.codigo,
                b.descricao
            FROM producao p
            INNER JOIN bandas b
                ON b.id = p.banda_id
            ORDER BY p.id DESC
            LIMIT 10
        `);

        res.json({
            totalEstoque: estoque.total,
            producoesHoje: producoesHoje.total, // Agora trará a soma real dos produtos
            producoesMes: producoesMes.total,   // Agora trará a soma real dos produtos
            ultimasProducoes
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: "Erro ao carregar dashboard"
        });
    }
};