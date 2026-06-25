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
        const { quantidade } = req.body;

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
        // DATA / HORA CORRETA
        // =========================
        const dataGeracao = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // =========================
        // RESUMOS
        // =========================
        const totalItens = bandas.reduce(
            (acc, item) => acc + Number(item.estoque_total || 0),
            0
        );

        const abaixoMinimo = bandas.filter(item =>
            Number(item.estoque_total || 0) < Number(item.estoque_minimo || 0)
        );

        // =========================
        // CABEÇALHO
        // =========================
        doc
            .font('Helvetica-Bold')
            .fontSize(18)
            .text('RELATÓRIO DE ESTOQUE DE BANDAS', {
                align: 'center'
            });

        doc.moveDown(0.4);

        doc
            .font('Helvetica')
            .fontSize(10)
            .text(`Gerado em: ${dataGeracao}`, {
                align: 'center'
            });

        doc.moveDown(1.2);

        // =========================
        // BLOCO RESUMO
        // =========================
        doc.font('Helvetica-Bold').fontSize(12).text('Resumo do Estoque');
        doc.moveDown(0.4);

        doc.font('Helvetica').fontSize(11);
        doc.text(`• Total de bandas ativas: ${bandas.length}`);
        doc.text(`• Total geral em estoque: ${totalItens}`);
        doc.text(`• Bandas abaixo do estoque mínimo: ${abaixoMinimo.length}`);

        doc.moveDown(1);

        if (abaixoMinimo.length > 0) {
            doc
                .font('Helvetica-Bold')
                .fontSize(11)
                .text('ATENÇÃO: Existem bandas abaixo do estoque mínimo.', {
                    underline: false
                });

            doc.moveDown(0.8);
        }

        // =========================
        // TABELA
        // =========================
        const startX = 40;
        let y = doc.y;

        const colCodigo = startX;
        const colDescricao = 120;
        const colEstoque = 345;
        const colMinimo = 410;
        const colSituacao = 475;

        function desenharCabecalhoTabela() {
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('Código', colCodigo, y);
            doc.text('Descrição', colDescricao, y, { width: 210 });
            doc.text('Estoque', colEstoque, y, { width: 50 });
            doc.text('Mínimo', colMinimo, y, { width: 50 });
            doc.text('Situação', colSituacao, y, { width: 80 });

            y += 18;
            doc.moveTo(startX, y).lineTo(555, y).stroke();
            y += 8;
        }

        desenharCabecalhoTabela();

        if (bandas.length === 0) {
            doc.font('Helvetica').fontSize(10).text('Nenhuma banda ativa cadastrada.', startX, y);
        } else {
            for (const banda of bandas) {
                const codigo = String(banda.codigo || '');
                const descricao = banda.descricao || '-';
                const estoque = Number(banda.estoque_total || 0);
                const minimo = Number(banda.estoque_minimo || 0);
                const critica = estoque < minimo;

                // altura estimada da linha
                const alturaDescricao = doc.heightOfString(descricao, {
                    width: 210
                });

                const alturaLinha = Math.max(18, alturaDescricao + 4);

                // quebra de página
                if (y + alturaLinha > 770) {
                    doc.addPage();
                    y = 40;
                    desenharCabecalhoTabela();
                }

                doc.font('Helvetica').fontSize(10);

                doc.text(codigo, colCodigo, y, {
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

                doc.text(
                    critica ? 'ABAIXO DO MÍNIMO' : 'OK',
                    colSituacao,
                    y,
                    { width: 80 }
                );

                y += alturaLinha + 6;

                // linha separadora
                doc.moveTo(startX, y - 3).lineTo(555, y - 3).strokeColor('#dddddd').stroke();
                doc.strokeColor('#000000');
            }
        }

        // =========================
        // RODAPÉ FINAL
        // =========================
        doc.moveDown(2);

        if (abaixoMinimo.length > 0) {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            y += 20;

            doc.font('Helvetica-Bold').fontSize(12).text('Bandas com necessidade de reposição:', startX, y);
            y += 20;

            doc.font('Helvetica').fontSize(10);

            abaixoMinimo.forEach(item => {
                if (y > 770) {
                    doc.addPage();
                    y = 50;
                }

                doc.text(
                    `• ${item.codigo} - ${item.descricao || '-'} | Estoque: ${item.estoque_total} | Mínimo: ${item.estoque_minimo}`,
                    startX,
                    y
                );

                y += 16;
            });
        }

        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF do estoque:', error);
        return res.status(500).json({
            mensagem: 'Erro ao gerar PDF do estoque'
        });
    }
};