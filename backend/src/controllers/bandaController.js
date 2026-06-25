const pool = require('../config/database');
const PDFDocument = require('pdfkit');

exports.listar = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT *
            FROM bandas
            ORDER BY codigo
        `);

        return res.json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao listar bandas'
        });
    }
};

exports.cadastrar = async (req, res) => {
    try {
        const {
            codigo,
            descricao,
            estoque_total,
            estoque_minimo
        } = req.body;

        if (!codigo || !codigo.trim()) {
            return res.status(400).json({
                mensagem: 'Código é obrigatório'
            });
        }

        const [existe] = await pool.execute(`
            SELECT id FROM bandas WHERE codigo = ?
        `, [codigo.trim()]);

        if (existe.length > 0) {
            return res.status(400).json({
                mensagem: 'Já existe uma banda com este código'
            });
        }

        await pool.execute(`
            INSERT INTO bandas
            (codigo, descricao, estoque_total, estoque_minimo)
            VALUES (?, ?, ?, ?)
        `, [
            codigo.trim(),
            descricao || null,
            Number(estoque_total) || 0,
            Number(estoque_minimo) || 0
        ]);

        return res.status(201).json({
            mensagem: 'Banda cadastrada com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao cadastrar banda'
        });
    }
};

exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT *
            FROM bandas
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Banda não encontrada'
            });
        }

        return res.json(rows[0]);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao buscar banda'
        });
    }
};

exports.editar = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            codigo,
            descricao,
            estoque_minimo
        } = req.body;

        const [existente] = await pool.execute(`
            SELECT id FROM bandas WHERE id = ?
        `, [id]);

        if (existente.length === 0) {
            return res.status(404).json({
                mensagem: 'Banda não encontrada'
            });
        }

        await pool.execute(`
            UPDATE bandas
            SET
                codigo = ?,
                descricao = ?,
                estoque_minimo = ?
            WHERE id = ?
        `, [
            codigo,
            descricao,
            Number(estoque_minimo) || 0,
            id
        ]);

        return res.json({
            mensagem: 'Banda atualizada com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao atualizar banda'
        });
    }
};

exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.execute(`
            UPDATE bandas
            SET ativo = FALSE
            WHERE id = ?
        `, [id]);

        return res.json({
            mensagem: 'Banda desativada com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao excluir banda'
        });
    }
};

exports.alterarStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT ativo
            FROM bandas
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Banda não encontrada'
            });
        }

        const novoStatus = rows[0].ativo ? 0 : 1;

        await pool.execute(`
            UPDATE bandas
            SET ativo = ?
            WHERE id = ?
        `, [novoStatus, id]);

        return res.json({
            mensagem: 'Status atualizado com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao alterar status'
        });
    }
};

exports.entradaEstoque = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, observacao } = req.body;

        const qtd = Number(quantidade);

        if (!qtd || qtd <= 0) {
            return res.status(400).json({
                mensagem: 'Quantidade inválida'
            });
        }

        const [banda] = await pool.execute(`
            SELECT id FROM bandas WHERE id = ?
        `, [id]);

        if (banda.length === 0) {
            return res.status(404).json({
                mensagem: 'Banda não encontrada'
            });
        }

        await pool.execute(`
            UPDATE bandas
            SET estoque_total = estoque_total + ?
            WHERE id = ?
        `, [qtd, id]);

        return res.json({
            mensagem: 'Entrada de estoque realizada com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao registrar entrada'
        });
    }
};

exports.disponibilidade = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                id,
                codigo,
                descricao,
                estoque_total,
                estoque_minimo,
                ativo,
                estoque_total AS disponivel
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        return res.json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao buscar disponibilidade'
        });
    }
};

exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
            SELECT
                codigo,
                descricao,
                estoque_total,
                estoque_minimo,
                ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        const doc = new PDFDocument({
            margin: 40,
            size: 'A4'
        });

        const nomeArquivo = `estoque-bandas-${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${nomeArquivo}"`
        );

        doc.pipe(res);

        // =========================
        // CABEÇALHO
        // =========================
        doc
            .fontSize(18)
            .text('Relatório de Estoque de Bandas', {
                align: 'center'
            });

        doc.moveDown(0.5);

        doc
            .fontSize(10)
            .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
                align: 'center'
            });

        doc.moveDown(1.5);

        // =========================
        // RESUMO
        // =========================
        const totalItens = bandas.reduce(
            (acc, item) => acc + Number(item.estoque_total || 0),
            0
        );

        doc
            .fontSize(12)
            .text(`Total de bandas cadastradas ativas: ${bandas.length}`);

        doc
            .fontSize(12)
            .text(`Total geral em estoque: ${totalItens}`);

        doc.moveDown(1);

        // =========================
        // TABELA
        // =========================
        const startX = 40;
        let y = doc.y + 10;

        const colCodigo = startX;
        const colDescricao = 120;
        const colEstoque = 350;
        const colMinimo = 430;
        const colStatus = 500;

        // Cabeçalho da tabela
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Código', colCodigo, y);
        doc.text('Descrição', colDescricao, y);
        doc.text('Estoque', colEstoque, y);
        doc.text('Mínimo', colMinimo, y);
        doc.text('Status', colStatus, y);

        y += 20;

        doc.moveTo(startX, y - 5).lineTo(560, y - 5).stroke();

        doc.font('Helvetica');

        if (bandas.length === 0) {
            doc.text('Nenhuma banda cadastrada.', startX, y + 10);
        } else {
            for (const banda of bandas) {
                // quebra de página
                if (y > 750) {
                    doc.addPage();
                    y = 50;

                    doc.fontSize(10).font('Helvetica-Bold');
                    doc.text('Código', colCodigo, y);
                    doc.text('Descrição', colDescricao, y);
                    doc.text('Estoque', colEstoque, y);
                    doc.text('Mínimo', colMinimo, y);
                    doc.text('Status', colStatus, y);

                    y += 20;
                    doc.moveTo(startX, y - 5).lineTo(560, y - 5).stroke();
                    doc.font('Helvetica');
                }

                const descricao = banda.descricao || '-';
                const estoque = Number(banda.estoque_total || 0);
                const minimo = Number(banda.estoque_minimo || 0);
                const status = banda.ativo ? 'Ativo' : 'Inativo';

                doc.fontSize(10);
                doc.text(String(banda.codigo || ''), colCodigo, y, {
                    width: 70
                });

                doc.text(descricao, colDescricao, y, {
                    width: 210
                });

                doc.text(String(estoque), colEstoque, y, {
                    width: 50
                });

                doc.text(String(minimo), colMinimo, y, {
                    width: 50
                });

                doc.text(status, colStatus, y, {
                    width: 50
                });

                y += 22;
            }
        }

        doc.moveDown(2);

        // =========================
        // RODAPÉ
        // =========================
        doc.moveTo(startX, y + 10).lineTo(560, y + 10).stroke();

        doc
            .fontSize(9)
            .text(
                'Relatório gerado automaticamente pelo sistema Recapadora SaaS.',
                startX,
                y + 20,
                { align: 'center' }
            );

        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF do estoque:', error);
        return res.status(500).json({
            mensagem: 'Erro ao gerar PDF do estoque'
        });
    }
};