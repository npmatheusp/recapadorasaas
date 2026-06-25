const pool = require('../config/database');
const PDFDocument = require('pdfkit');

// ======================================================
// LISTAR
// ======================================================
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

// ======================================================
// CADASTRAR
// ======================================================
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
            SELECT id
            FROM bandas
            WHERE codigo = ?
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

// ======================================================
// BUSCAR POR ID
// ======================================================
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

// ======================================================
// EDITAR
// ======================================================
exports.editar = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            codigo,
            descricao,
            estoque_minimo
        } = req.body;

        const [existente] = await pool.execute(`
            SELECT id
            FROM bandas
            WHERE id = ?
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

// ======================================================
// EXCLUIR (DESATIVAR)
// ======================================================
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

// ======================================================
// ALTERAR STATUS
// ======================================================
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

// ======================================================
// ENTRADA ESTOQUE
// ======================================================
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
            SELECT id
            FROM bandas
            WHERE id = ?
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

// ======================================================
// DISPONIBILIDADE
// ======================================================
exports.disponibilidade = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                id,
                codigo,
                descricao,
                estoque_total,
                estoque_minimo,
                ativo
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

// ======================================================
// HELPERS PDF
// ======================================================
function formatarDataHoraBR() {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium'
    }).format(new Date());
}

function extrairGrupoBanda(codigo = '') {
    const texto = String(codigo).trim();
    const partes = texto.split(/\s+/);
    return partes[0] || 'SEM GRUPO';
}

function garantirEspaco(doc, altura = 80) {
    const limite = doc.page.height - doc.page.margins.bottom;
    if (doc.y + altura > limite) {
        doc.addPage();
    }
}

// ======================================================
// CABEÇALHO
// ======================================================
function desenharCabecalhoPagina(doc, dataHora) {
    const largura = doc.page.width;
    const margem = 40;

    doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#0b2c66')
        .text('DO VALE PRUDENTE PNEUS E RECAPAGENS LTDA', margem, 25, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#333')
        .text(dataHora, margem, 50, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.moveTo(margem, 70)
        .lineTo(largura - margem, 70)
        .strokeColor('#0b2c66')
        .stroke();

    doc.font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#0b2c66')
        .text('RELATÓRIO DE ESTOQUE DE BANDAS', margem, 85, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.y = 120;
}

// ======================================================
// TABELA
// ======================================================
function desenharCabecalhoTabela(doc) {
    garantirEspaco(doc, 40);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;

    const colCodigo = 260;
    const colEstoque = 120;
    const colAtivo = largura - colCodigo - colEstoque;

    doc.rect(x, y, largura, 25).fill('#dfe8f3');

    doc.fillColor('#0b2c66').font('Helvetica-Bold').fontSize(10);

    doc.text('Código / Descrição', x + 8, y + 7, { width: colCodigo - 10 });
    doc.text('Estoque Total', x + colCodigo + 8, y + 7, { width: colEstoque - 10, align: 'center' });
    doc.text('Ativo', x + colCodigo + colEstoque + 8, y + 7, { width: colAtivo - 10, align: 'center' });

    doc.y = y + 25;
}

function desenharLinhaTabela(doc, item, zebra = false) {
    garantirEspaco(doc, 28);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;

    const colCodigo = 260;
    const colEstoque = 120;
    const colAtivo = largura - colCodigo - colEstoque;

    if (zebra) {
        doc.rect(x, y, largura, 28).fill('#f7f9fc');
    }

    doc.moveTo(x, y + 28)
        .lineTo(x + largura, y + 28)
        .strokeColor('#ddd')
        .stroke();

    doc.fillColor('#222').font('Helvetica').fontSize(10);

    const texto = item.descricao
        ? `${item.codigo} - ${item.descricao}`
        : item.codigo;

    doc.text(texto, x + 8, y + 8, { width: colCodigo - 10 });

    doc.text(String(item.estoque_total || 0), x + colCodigo + 8, y + 8, {
        width: colEstoque - 10,
        align: 'center'
    });

    doc.text(item.ativo ? 'Sim' : 'Não', x + colCodigo + colEstoque + 8, y + 8, {
        width: colAtivo - 10,
        align: 'center'
    });

    doc.y = y + 28;
}

// ======================================================
// PDF PRINCIPAL
// ======================================================
exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
            SELECT id, codigo, descricao, estoque_total, ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        const grupos = {};

        for (const b of bandas) {
            const g = extrairGrupoBanda(b.codigo);
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(b);
        }

        const ordenados = Object.keys(grupos).sort();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=estoque.pdf');

        const doc = new PDFDocument({
            size: 'A4',
            margin: 40,
            bufferPages: true
        });

        doc.pipe(res);

        const dataHora = formatarDataHoraBR();
        desenharCabecalhoPagina(doc, dataHora);

        ordenados.forEach((grupo) => {

            garantirEspaco(doc, 80);

            doc.font('Helvetica-Bold')
                .fontSize(13)
                .fillColor('#0b2c66')
                .text(`BANDA: ${grupo}`, 40);

            desenharCabecalhoTabela(doc);

            grupos[grupo].forEach((item, idx) => {
                desenharLinhaTabela(doc, item, idx % 2 !== 0);
            });

            doc.moveDown(1);
        });

        // ==================================================
        // ✔️ CORREÇÃO DEFINITIVA DA PAGINAÇÃO
        // ==================================================
        const range = doc.bufferedPageRange();

        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);

            doc.font('Helvetica')
                .fontSize(9)
                .fillColor('#666')
                .text(
                    `Página ${i + 1} de ${range.count}`,
                    40,
                    doc.page.height - 20, // 👈 FIXO DENTRO DA PÁGINA
                    {
                        width: doc.page.width - 80,
                        align: 'center'
                    }
                );
        }

        doc.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao gerar PDF' });
    }
};