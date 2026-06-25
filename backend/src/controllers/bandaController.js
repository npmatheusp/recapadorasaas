const pool = require('../config/database');
const PDFDocument = require('pdfkit');

// ======================================================
// LISTAR (igual)
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
        return res.status(500).json({ mensagem: 'Erro ao listar bandas' });
    }
};

// ======================================================
// HELPERS
// ======================================================
function formatarDataHoraBR() {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium'
    }).format(new Date());
}

function extrairGrupoBanda(codigo = '') {
    const partes = String(codigo).trim().split(/\s+/);
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
function desenharCabecalhoTabela(doc, x, largura) {

    const y = doc.y;

    const colCodigo = largura * 0.65;
    const colEstoque = largura * 0.20;
    const colAtivo = largura * 0.15;

    doc.rect(x, y, largura, 22).fill('#dfe8f3');

    doc.fillColor('#0b2c66')
        .font('Helvetica-Bold')
        .fontSize(9);

    doc.text('Código / Descrição', x + 5, y + 6, { width: colCodigo - 10 });
    doc.text('Estoque', x + colCodigo, y + 6, { width: colEstoque, align: 'center' });
    doc.text('Ativo', x + colCodigo + colEstoque, y + 6, { width: colAtivo, align: 'center' });

    doc.y = y + 22;
}

function desenharLinhaTabela(doc, item, x, largura, zebra) {

    garantirEspaco(doc, 22);

    const y = doc.y;

    const colCodigo = largura * 0.65;
    const colEstoque = largura * 0.20;
    const colAtivo = largura * 0.15;

    if (zebra) {
        doc.rect(x, y, largura, 22).fill('#f7f9fc');
    }

    doc.moveTo(x, y + 22)
        .lineTo(x + largura, y + 22)
        .strokeColor('#ddd')
        .stroke();

    doc.fillColor('#222').font('Helvetica').fontSize(8.5);

    const texto = item.descricao
        ? `${item.codigo} - ${item.descricao}`
        : item.codigo;

    doc.text(texto, x + 5, y + 6, { width: colCodigo - 10 });

    doc.text(String(item.estoque_total || 0),
        x + colCodigo,
        y + 6,
        { width: colEstoque, align: 'center' }
    );

    doc.text(item.ativo ? 'Sim' : 'Não',
        x + colCodigo + colEstoque,
        y + 6,
        { width: colAtivo, align: 'center' }
    );

    doc.y = y + 22;
}

// ======================================================
// PDF PRINCIPAL (2 COLUNAS)
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

        // COLUNAS DA PÁGINA
        const margem = 40;
        const larguraTotal = doc.page.width - margem * 2;
        const colunaLargura = larguraTotal / 2 - 10;

        let coluna = 0;

        ordenados.forEach((grupo, i) => {

            const x = margem + (coluna * (colunaLargura + 20));

            garantirEspaco(doc, 120);

            doc.font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#0b2c66')
                .text(`BANDA: ${grupo}`, x, doc.y);

            doc.y += 15;

            desenharCabecalhoTabela(doc, x, colunaLargura);

            grupos[grupo].forEach((item, idx) => {
                desenharLinhaTabela(doc, item, x, colunaLargura, idx % 2 !== 0);
            });

            coluna++;

            // troca de linha (2 colunas)
            if (coluna > 1) {
                coluna = 0;
                doc.y += 20;
            }
        });

        // ==================================================
        // PAGINAÇÃO CORRIGIDA (RODAPÉ FIXO)
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
                    doc.page.height - 30,
                    { width: doc.page.width - 80, align: 'center' }
                );
        }

        doc.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao gerar PDF' });
    }
};