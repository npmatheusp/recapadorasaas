const pool = require("../config/database");

exports.listar = async (req, res) => {

    try {

        const [rows] = await pool.execute(`
            SELECT
                r.id,
                r.cliente,
                r.quantidade,
                r.status,
                r.criado_em,

                b.id AS banda_id,
                b.codigo,
                b.descricao,

                COALESCE(SUM(p.quantidade),0) AS quantidade_produzida

            FROM reservas r

            LEFT JOIN bandas b
                ON b.id = r.banda_id

            LEFT JOIN producoes p
                ON p.reserva_id = r.id

            GROUP BY r.id

            ORDER BY r.id DESC
        `);

        const resultado = rows.map(item => ({
            ...item,
            quantidade_restante:
                item.quantidade - item.quantidade_produzida
        }));

        res.json(resultado);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensagem: "Erro ao listar reservas"
        });

    }
};


// CRIAR RESERVA (CORRIGIDO COM CONTROLE DE ESTOQUE)
exports.criar = async (req, res) => {


const connection = await pool.getConnection();

try {

    const { cliente, banda_id, quantidade } = req.body;

    await connection.beginTransaction();

    const qtd = Number(quantidade || 1);

    // busca banda
    const [[banda]] = await connection.execute(`
        SELECT estoque_total
        FROM bandas
        WHERE id = ?
    `, [banda_id]);

    if (!banda) {
        return res.status(404).json({
            mensagem: "Banda não encontrada"
        });
    }

    // soma reservas já ativas
    const [[reservado]] = await connection.execute(`
        SELECT COALESCE(SUM(quantidade),0) AS total
        FROM reservas
        WHERE banda_id = ?
        AND status = 'RESERVADO'
    `, [banda_id]);

    const disponivel =
        banda.estoque_total - reservado.total;

    // valida estoque disponível REAL
    if (qtd > disponivel) {

        return res.status(400).json({
            mensagem: `Estoque insuficiente. Disponível: ${disponivel}`
        });

    }

    // cria reserva
    await connection.execute(`
        INSERT INTO reservas (
            cliente,
            banda_id,
            quantidade,
            vendedor_id,
            status
        )
        VALUES (?, ?, ?, ?, 'RESERVADO')
    `, [
        cliente,
        banda_id,
        qtd,
        req.usuario.id
    ]);

    // registra movimentação
    await connection.execute(`
        INSERT INTO movimentacoes (
            banda_id,
            usuario_id,
            tipo,
            quantidade,
            observacao
        )
        VALUES (?, ?, 'RESERVA', ?, ?)
    `, [
        banda_id,
        req.usuario.id,
        qtd,
        `Reserva criada: ${cliente}`
    ]);

    await connection.commit();

    res.json({
        mensagem: "Reserva criada com sucesso"
    });

} catch (error) {

    await connection.rollback();

    console.error(error);

    res.status(500).json({
        mensagem: "Erro ao criar reserva"
    });

} finally {

    connection.release();

}


};



exports.listarProducao = async (req, res) => {

    try {

        const [rows] = await pool.execute(`
            SELECT
                r.id,
                r.cliente,
                r.quantidade,
                r.status,

                b.id AS banda_id,
                b.codigo,
                b.descricao,

                COALESCE(SUM(p.quantidade),0) AS quantidade_produzida

            FROM reservas r

            INNER JOIN bandas b
                ON b.id = r.banda_id

            LEFT JOIN producoes p
                ON p.reserva_id = r.id

            WHERE r.status = 'RESERVADO'

            GROUP BY r.id

            ORDER BY r.id DESC
        `);

        const resultado = rows.map(item => ({
            ...item,
            quantidade_restante:
                item.quantidade - item.quantidade_produzida
        }));

        res.json(resultado);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensagem: "Erro ao listar produção"
        });

    }
};
// CANCELAR RESERVA
// CANCELAR RESERVA
exports.cancelar = async (req, res) => {

    try {

        const { id } = req.params;

        const [[reserva]] = await pool.execute(`
            SELECT
                banda_id,
                quantidade,
                status
            FROM reservas
            WHERE id = ?
        `, [id]);

        if (!reserva) {
            return res.status(404).json({
                mensagem: "Reserva não encontrada"
            });
        }

        if (reserva.status === 'CANCELADO') {
            return res.status(400).json({
                mensagem: "Reserva já cancelada"
            });
        }

        // Soma tudo que já foi produzido
        const [[producao]] = await pool.execute(`
            SELECT
                COALESCE(SUM(quantidade), 0) AS produzido
            FROM producoes
            WHERE reserva_id = ?
        `, [id]);

        const produzido = Number(producao.produzido);

        // Apenas cancela a reserva
        await pool.execute(`
            UPDATE reservas
            SET status = 'CANCELADO'
            WHERE id = ?
        `, [id]);

        // Registra movimentação
        await pool.execute(`
            INSERT INTO movimentacoes (
                banda_id,
                usuario_id,
                tipo,
                quantidade,
                observacao
            )
            VALUES (?, ?, 'CANCELAMENTO', ?, ?)
        `, [
            reserva.banda_id,
            req.usuario.id,
            reserva.quantidade,
            `Reserva #${id} cancelada`
        ]);

        return res.json({
            mensagem: "Reserva cancelada com sucesso",
            produzido
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            mensagem: "Erro ao cancelar reserva"
        });

    }

};

exports.editar = async (req, res) => {

    try {

        const { id } = req.params;
        const { cliente, quantidade } = req.body;

        const [[reserva]] = await pool.execute(`
            SELECT *
            FROM reservas
            WHERE id = ?
        `, [id]);

        if (!reserva) {

            return res.status(404).json({
                mensagem: "Reserva não encontrada"
            });

        }

        const [[produzido]] = await pool.execute(`
            SELECT
                COALESCE(SUM(quantidade),0) AS total
            FROM producoes
            WHERE reserva_id = ?
        `, [id]);

        if (Number(quantidade) < produzido.total) {

            return res.status(400).json({
                mensagem:
                    `Já foram produzidas ${produzido.total} unidades`
            });

        }

        await pool.execute(`
            UPDATE reservas
            SET
                cliente = ?,
                quantidade = ?
            WHERE id = ?
        `, [
            cliente,
            quantidade,
            id
        ]);

        res.json({
            mensagem:
                "Reserva atualizada com sucesso"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensagem:
                "Erro ao editar reserva"
        });

    }

};

exports.registrarProducao = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        const { id } = req.params;

        const {
            banda_utilizada_id,
            quantidade,
            observacao
        } = req.body;

        if (!quantidade || quantidade <= 0) {

    await conn.rollback();

    return res.status(400).json({
        mensagem: "Quantidade inválida"
    });

        }

        const [reservaRows] = await conn.execute(
            `
            SELECT *
            FROM reservas
            WHERE id = ?
            `,
            [id]
        );

        if (reservaRows.length === 0) {

    await conn.rollback();

    return res.status(404).json({
        mensagem: "Reserva não encontrada"
    });

}

        const reserva = reservaRows[0];

        const [produzidoRows] = await conn.execute(
            `
            SELECT
                COALESCE(SUM(quantidade),0) AS total
            FROM producoes
            WHERE reserva_id = ?
            `,
            [id]
        );

        const jaProduzido = produzidoRows[0].total;

        const restante =
            reserva.quantidade - jaProduzido;

        if (quantidade > restante) {

    await conn.rollback();

    return res.status(400).json({
        mensagem:
            `Restam apenas ${restante} unidades`
    });

}

        const [bandaRows] = await conn.execute(
            `
            SELECT *
            FROM bandas
            WHERE id = ?
            `,
            [banda_utilizada_id]
        );

        if (bandaRows.length === 0) {

    await conn.rollback();

    return res.status(404).json({
        mensagem: "Banda não encontrada"
    });

}

        const banda = bandaRows[0];

            await conn.execute(
            `
            INSERT INTO producoes
            (
                reserva_id,
                banda_utilizada_id,
                usuario_id,
                quantidade,
                observacao
            )
            VALUES
            (
                ?, ?, ?, ?, ?
            )
            `,
            [
                id,
                banda_utilizada_id,
                req.usuario.id,
                quantidade,
                observacao || null
            ]
        );

        await conn.execute(
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
                ?, ?, 'CONSUMO', ?, ?
            )
            `,
            [
                banda_utilizada_id,
                req.usuario.id,
                quantidade,
                `Produção reserva #${id}`
            ]
        );

        if (
            jaProduzido + quantidade
            >= reserva.quantidade
        ) {

            await conn.execute(
                `
                UPDATE reservas
                SET
                    status = 'CONCLUIDO'
                WHERE id = ?
                `,
                [id]
            );

        }
        await conn.execute(`
    UPDATE bandas
    SET estoque_total = estoque_total - ?
    WHERE id = ?
`, [
    quantidade,
    banda_utilizada_id
]);

        await conn.commit();

        return res.json({
            mensagem:
                "Produção registrada com sucesso"
        });

    } catch (error) {

        await conn.rollback();

        console.error(error);

        return res.status(500).json({
            mensagem: "Erro ao registrar produção"
        });

    } finally {

        conn.release();

    }

};

exports.historicoProducao = async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT

                p.id,

                p.quantidade,

                p.observacao,

                p.criado_em,

                b.codigo,

                b.descricao

            FROM producoes p

            INNER JOIN bandas b
                ON b.id = p.banda_utilizada_id

            WHERE p.reserva_id = ?

            ORDER BY p.id DESC
        `,
        [id]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensagem:
                "Erro ao buscar histórico"
        });

    }

};