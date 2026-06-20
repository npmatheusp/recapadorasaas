const pool = require('../config/database');

async function obterDisponivel(bandaId) {

    const [estoque] = await pool.execute(
        `
        SELECT estoque_total
        FROM bandas
        WHERE id = ?
        `,
        [bandaId]
    );

    const [reservado] = await pool.execute(
        `
        SELECT
            COALESCE(SUM(ri.quantidade),0) total
        FROM reserva_itens ri
        INNER JOIN reservas r
            ON r.id = ri.reserva_id
        WHERE
            ri.banda_id = ?
            AND r.status = 'RESERVADO'
        `,
        [bandaId]
    );

    const total = estoque[0].estoque_total;
    const reservadoTotal = reservado[0].total;

    return total - reservadoTotal;
}

module.exports = {
    obterDisponivel
};