const pool = require('../config/database');
const PDFDocument = require('pdfkit');

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
// PDF PRINCIPAL (CORRIGIDO DEFINITIVAMENTE)
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
            margin: 40
        });

        doc.pipe(res);

        const dataHora = formatarDataHoraBR();

        let pagina = 1;

        function rodape() {
            doc.font('Helvetica')
                .fontSize(9)
                .fillColor('#666')
                .text(
                    `Página ${pagina}`,
                    40,
                    doc.page.height - 30,
                    {
                        width: doc.page.width - 80,
                        align: 'center'
                    }
                );

            pagina++;
        }

        // rodapé automático ao criar página
        doc.on('pageAdded', rodape);

        // primeira página
        desenharCabecalhoPagina(doc, dataHora);
        rodape();

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

        doc.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao gerar PDF' });
    }
};