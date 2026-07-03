const pool = require('../config/database');

// ======================================================
// BANDAS DISPONÍVEIS
// ======================================================
exports.bandasDisponiveis = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT id, codigo, descricao, estoque_total
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

// ======================================================
// REGISTRAR PRODUÇÃO
// ======================================================
exports.registrar = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { banda_id, quantidade, observacao } = req.body;
        const usuario_id = req.usuario.id; 
        const qtd = Number(quantidade);

        const [[banda]] = await conn.execute(`
            SELECT estoque_total FROM bandas WHERE id = ?
        `, [banda_id]);

        if (!banda) {
            await conn.rollback();
            return res.status(404).json({ mensagem: 'Banda não encontrada' });
        }

        if (banda.estoque_total < qtd) {
            await conn.rollback();
            return res.status(400).json({ mensagem: 'Estoque insuficiente' });
        }

        await conn.execute(`
            UPDATE bandas SET estoque_total = estoque_total - ? WHERE id = ?
        `, [qtd, banda_id]);

        await conn.execute(`
            INSERT INTO producao (banda_id, usuario_id, quantidade, observacao)
            VALUES (?, ?, ?, ?)
        `, [banda_id, usuario_id, qtd, observacao || null]);

        await conn.commit();
        res.json({ mensagem: 'Produção registrada com sucesso' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao registrar produção' });
    } finally {
        conn.release();
    }
};

// ======================================================
// HISTÓRICO DE PRODUÇÃO
// ======================================================
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
            INNER JOIN bandas b ON b.id = p.banda_id
            ORDER BY p.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar histórico' });
    }
};

// ======================================================
// CANCELAR LANÇAMENTO (COM TRAVA DE 1 HORA PARA PRODUÇÃO)
// ======================================================
exports.cancelar = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { id } = req.params;

        // Injeta o perfil mapeado pelo seu middleware de segurança
        const usuarioPerfil = req.usuario && req.usuario.perfil; 

        // 1. Busca a produção trazendo também a data de criação (criado_em)
        const [[producao]] = await conn.execute(`
            SELECT banda_id, quantidade, criado_em FROM producao WHERE id = ?
        `, [id]);

        if (!producao) {
            await conn.rollback();
            return res.status(404).json({ mensagem: 'Registro de produção não encontrado' });
        }

        // 2. Aplica a Regra de Tempo (Bloqueia se não for admin)
        if (usuarioPerfil !== 'admin') {
            const dataCriacao = new Date(producao.criado_em);
            const agora = new Date();
            
            // Calcula a diferença em milissegundos
            const diferencaMilissegundos = agora - dataCriacao;
            // Converte 1 hora para milissegundos (1 * 60 * 60 * 1000)
            const umaHoraEmMs = 3600000;

            if (diferencaMilissegundos > umaHoraEmMs) {
                await conn.rollback();
                return res.status(403).json({ 
                    mensagem: 'O prazo limite de 1 hora para cancelamento por operadores expirou. Solicite a um administrador.' 
                });
            }
        }

        // 3. Devolve a quantidade gasta de volta ao estoque da banda
        await conn.execute(`
            UPDATE bandas 
            SET estoque_total = estoque_total + ? 
            WHERE id = ?
        `, [producao.quantidade, producao.banda_id]);

        // 4. Deleta o registro da produção
        await conn.execute(`
            DELETE FROM producao WHERE id = ?
        `, [id]);

        await conn.commit();
        res.json({ mensagem: 'Produção cancelada e estoque estornado com sucesso!' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao cancelar produção' });
    } finally {
        conn.release();
    }
};