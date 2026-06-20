const pool = require('../config/database');

exports.bandasDisponiveis = async (req, res) => {

    try {

        const [rows] = await pool.execute(`
            SELECT
                id,
                codigo,
                descricao,
                estoque_total
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao carregar bandas' });
    }

};


exports.registrar = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        const {
            banda_id,
            quantidade,
            observacao
        } = req.body;

        const usuario_id = req.usuario.id; // 🔥 AGORA VEM DO TOKEN

        const qtd = Number(quantidade);

        const [[banda]] = await conn.execute(`
            SELECT estoque_total
            FROM bandas
            WHERE id = ?
        `, [banda_id]);

        if (!banda) {
            await conn.rollback();
            return res.status(404).json({
                mensagem: 'Banda não encontrada'
            });
        }

        if (banda.estoque_total < qtd) {
            await conn.rollback();
            return res.status(400).json({
                mensagem: 'Estoque insuficiente'
            });
        }

        await conn.execute(`
            UPDATE bandas
            SET estoque_total = estoque_total - ?
            WHERE id = ?
        `, [qtd, banda_id]);

        await conn.execute(`
            INSERT INTO producao
            (
                banda_id,
                usuario_id,
                quantidade,
                observacao
            )
            VALUES
            (
                ?, ?, ?, ?
            )
        `, [
            banda_id,
            usuario_id,
            qtd,
            observacao || null
        ]);

        await conn.commit();

        res.json({
            mensagem: 'Produção registrada com sucesso'
        });

    } catch (error) {

        await conn.rollback();

        console.error(error);

        res.status(500).json({
            mensagem: 'Erro ao registrar produção'
        });

    } finally {

        conn.release();
    }

};


exports.historico = async (req, res) => {

    try {

        const [rows] = await pool.execute(`
            SELECT
                p.id,
                b.codigo,
                b.descricao,
                p.quantidade,
                p.observacao,
                p.criado_em
            FROM producao p
            INNER JOIN bandas b
                ON b.id = p.banda_id
            ORDER BY p.id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensagem: 'Erro ao buscar histórico'
        });
    }

};