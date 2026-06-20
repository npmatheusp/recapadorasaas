const pool = require('../config/database');

exports.listar = async (req, res) => {

    try {

        const [movimentacoes] = await pool.execute(`
            SELECT
                m.id,
                b.codigo,
                m.tipo,
                m.quantidade,
                m.observacao,
                u.nome AS usuario,
                m.criado_em
            FROM movimentacoes m
            INNER JOIN bandas b
                ON b.id = m.banda_id
            INNER JOIN usuarios u
                ON u.id = m.usuario_id
            ORDER BY m.criado_em DESC
        `);

        res.json(movimentacoes);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensagem: 'Erro ao listar movimentações'
        });

    }

};

exports.entrada = async (req, res) => {

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const {
            banda_id,
            quantidade,
            observacao
        } = req.body;

        await connection.execute(
            `
            UPDATE bandas
            SET estoque_total =
                estoque_total + ?
            WHERE id = ?
            `,
            [
                quantidade,
                banda_id
            ]
        );

        await connection.execute(
            `
            INSERT INTO movimentacoes
            (
                banda_id,
                usuario_id,
                tipo,
                quantidade,
                observacao
            )
            VALUES
            (
                ?, ?, 'ENTRADA', ?, ?
            )
            `,
            [
                banda_id,
                req.usuario.id,
                quantidade,
                observacao || 'Entrada manual'
            ]
        );

        await connection.commit();

        res.json({
            mensagem: 'Entrada registrada'
        });

    } catch (error) {

        await connection.rollback();

        console.error(error);

        res.status(500).json({
            mensagem: 'Erro ao registrar entrada'
        });

    } finally {

        connection.release();

    }

};