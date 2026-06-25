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
// ENTRADA DE ESTOQUE
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

// ======================================================
// FUNÇÕES AUXILIARES DO PDF
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
    if (!texto) return 'SEM GRUPO';

    const partes = texto.split(/\s+/);
    return partes[0] || 'SEM GRUPO';
}

function garantirEspaco(doc, alturaNecessaria = 80) {
    const limiteInferior = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alturaNecessaria > limiteInferior) {
        doc.addPage();
    }
}

// ======================================================
// CABEÇALHO (AJUSTADO)
// ======================================================
function desenharCabecalhoPagina(doc, dataHora) {
    const larguraPagina = doc.page.width;
    const margem = 40;

    doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#0b2c66')
        .text('Do Vale Prudente Pneus e Recapagens Ltda', margem, 25, {
            width: larguraPagina - margem * 2,
            align: 'center'
        });

    doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#333333')
        .text(dataHora, margem, 50, {
            width: larguraPagina - margem * 2,
            align: 'center'
        });

    doc
        .moveTo(margem, 70)
        .lineTo(larguraPagina - margem, 70)
        .strokeColor('#0b2c66')
        .lineWidth(1.2)
        .stroke();

    doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#0b2c66')
        .text('RELATÓRIO DE ESTOQUE DE BANDAS', margem, 85, {
            width: larguraPagina - margem * 2,
            align: 'center'
        });

    doc.y = 120;
}

// ======================================================
// TÍTULO GRUPO
// ======================================================
function desenharTituloGrupo(doc, titulo) {
    garantirEspaco(doc, 50);

    const x = 40;
    const largura = doc.page.width - 80;
    const y = doc.y;

    doc.roundedRect(x, y, largura, 28, 4).fill('#0b2c66');

    doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(`BANDA: ${titulo}`, x, y + 7, {
            width: largura,
            align: 'center'
        });

    doc.y = y + 36;
}

// ======================================================
// TABELA (SEM LARGURA)
// ======================================================
function desenharCabecalhoTabela(doc) {
    garantirEspaco(doc, 40);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;
    const altura = 26;

    const colCodigo = 260;
    const colEstoque = 120;
    const colAtivo = largura - colCodigo - colEstoque;

    doc.rect(x, y, largura, altura).fill('#dfe8f3');

    doc.fillColor('#0b2c66').font('Helvetica-Bold').fontSize(10);

    doc.text('Código / Descrição', x + 8, y + 8, {
        width: colCodigo - 10
    });

    doc.text('Estoque Total', x + colCodigo + 8, y + 8, {
        width: colEstoque - 10,
        align: 'center'
    });

    doc.text('Ativo', x + colCodigo + colEstoque + 8, y + 8, {
        width: colAtivo - 10,
        align: 'center'
    });

    doc.y = y + altura;
}

// ======================================================
// LINHA TABELA (SEM LARGURA)
// ======================================================
function desenharLinhaTabela(doc, item, zebra = false) {
    garantirEspaco(doc, 28);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;
    const altura = 28;

    const colCodigo = 260;
    const colEstoque = 120;
    const colAtivo = largura - colCodigo - colEstoque;

    if (zebra) {
        doc.rect(x, y, largura, altura).fill('#f7f9fc');
    }

    doc.moveTo(x, y + altura)
        .lineTo(x + largura, y + altura)
        .strokeColor('#d9d9d9')
        .stroke();

    doc.fillColor('#222').font('Helvetica').fontSize(10);

    const descricaoLinha = item.descricao
        ? `${item.codigo} - ${item.descricao}`
        : item.codigo;

    doc.text(descricaoLinha, x + 8, y + 8, {
        width: colCodigo - 12
    });

    doc.text(String(item.estoque_total || 0), x + colCodigo + 8, y + 8, {
        width: colEstoque - 10,
        align: 'center'
    });

    doc.text(item.ativo ? 'Sim' : 'Não', x + colCodigo + colEstoque + 8, y + 8, {
        width: colAtivo - 10,
        align: 'center'
    });

    doc.y = y + altura;
}

// ======================================================
// RESUMO GRUPO (CORRIGIDO)
// ======================================================
function desenharResumoGrupo(doc, itens) {
    garantirEspaco(doc, 50);

    const totalItens = itens.length;
    const totalEstoque = itens.reduce(
        (acc, item) => acc + Number(item.estoque_total || 0),
        0
    );

    const y = doc.y;

    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#222')
        .text(`TOTAL DE ITENS: ${totalItens}`, 40, y);

    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#222')
        .text(`TOTAL EM ESTOQUE: ${totalEstoque}`, 40, y + 14);

    doc.y = y + 35;
}

// ======================================================
// RESUMO FINAL (CORRIGIDO)
// ======================================================
function desenharResumoFinal(doc, resumo) {
    garantirEspaco(doc, 140);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;
    const altura = 100;

    doc.roundedRect(x, y, largura, altura, 8)
        .strokeColor('#0b2c66')
        .stroke();

    doc.font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#111')
        .text('RESUMO GERAL', x + 20, y + 15);

    doc.font('Helvetica')
        .fontSize(12)
        .text(`Total de bandas ativas: ${resumo.totalBandasAtivas}`, x + 20, y + 40)
        .text(`Total de itens: ${resumo.totalItens}`, x + 20, y + 58)
        .text(`Total de grupos: ${resumo.totalGrupos}`, x + 20, y + 76);

    doc.font('Helvetica-Bold')
        .fontSize(14)
        .text('Total geral em estoque:', x + 280, y + 40);

    doc.font('Helvetica-Bold')
        .fontSize(26)
        .fillColor('#0b2c66')
        .text(String(resumo.totalEstoqueGeral), x + 280, y + 62);

    doc.y = y + altura + 20;
}

// ======================================================
// GERAR PDF
// ======================================================
exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
            SELECT id, codigo, descricao, estoque_total, estoque_minimo, ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        if (!bandas.length) {
            return res.status(404).json({
                mensagem: 'Nenhuma banda ativa encontrada'
            });
        }

        const grupos = {};
        for (const b of bandas) {
            const grupo = extrairGrupoBanda(b.codigo);
            if (!grupos[grupo]) grupos[grupo] = [];
            grupos[grupo].push(b);
        }

        const gruposOrdenados = Object.keys(grupos).sort();

        const dataHora = formatarDataHoraBR();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=relatorio.pdf');

        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        doc.pipe(res);

        desenharCabecalhoPagina(doc, dataHora);

        let totalEstoqueGeral = 0;
        let totalItens = 0;

        gruposOrdenados.forEach((grupo, i) => {
            const itens = grupos[grupo];

            garantirEspaco(doc, 100);

            desenharTituloGrupo(doc, grupo);
            desenharCabecalhoTabela(doc);

            itens.forEach((item, idx) => {
                desenharLinhaTabela(doc, item, idx % 2 !== 0);
            });

            desenharResumoGrupo(doc, itens);

            totalEstoqueGeral += itens.reduce((a, b) => a + Number(b.estoque_total || 0), 0);
            totalItens += itens.length;

            if (i < gruposOrdenados.length - 1) doc.moveDown(1);
        });

        desenharResumoFinal(doc, {
            totalBandasAtivas: bandas.length,
            totalItens,
            totalGrupos: gruposOrdenados.length,
            totalEstoqueGeral
        });

        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);
            doc.text(`Página ${i + 1} de ${range.count}`, 480, 20);
        }

        doc.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao gerar PDF' });
    }
};