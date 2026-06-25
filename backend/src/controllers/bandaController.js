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
    // Ex.: "HDC1 225L" => "HDC1"
    // Ex.: "BDR2 260M" => "BDR2"
    const texto = String(codigo).trim();
    if (!texto) return 'SEM GRUPO';

    const partes = texto.split(/\s+/);
    return partes[0] || 'SEM GRUPO';
}

function extrairLargura(codigo = '', descricao = '') {
    // tenta achar número de largura em código/descrição
    // ex.: "HDC1 225L" => 225
    const texto = `${codigo} ${descricao}`.trim();
    const match = texto.match(/\b(\d{3})\b/);
    return match ? Number(match[1]) : '';
}

function agruparBandasPorDesenho(bandas) {
    const grupos = {};

    for (const banda of bandas) {
        const grupo = extrairGrupoBanda(banda.codigo);

        if (!grupos[grupo]) {
            grupos[grupo] = [];
        }

        grupos[grupo].push({
            ...banda,
            largura: extrairLargura(banda.codigo, banda.descricao)
        });
    }

    // ordenar itens dentro do grupo por largura / código
    Object.keys(grupos).forEach(grupo => {
        grupos[grupo].sort((a, b) => {
            const larguraA = Number(a.largura) || 0;
            const larguraB = Number(b.largura) || 0;

            if (larguraA !== larguraB) {
                return larguraA - larguraB;
            }

            return String(a.codigo).localeCompare(String(b.codigo), 'pt-BR');
        });
    });

    return grupos;
}

function garantirEspaco(doc, alturaNecessaria = 80) {
    const limiteInferior = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alturaNecessaria > limiteInferior) {
        doc.addPage();
    }
}

function desenharCabecalhoPagina(doc, dataHora) {
    const larguraPagina = doc.page.width;
    const margem = 40;

    // topo
    doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#0b2c66')
        .text('DoVale', margem, 20, { continued: true });

    doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#333333')
        .text(' Prudente Pneus e Recapagens Ltda', 120, 28);

    doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#333333')
        .text(dataHora, larguraPagina - 180, 24, {
            width: 140,
            align: 'right'
        });

    doc
        .moveTo(margem, 55)
        .lineTo(larguraPagina - margem, 55)
        .lineWidth(1.5)
        .strokeColor('#0b2c66')
        .stroke();

    // título
    doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#0b2c66')
        .text('RELATÓRIO DE ESTOQUE DE BANDAS', 40, 75, {
            align: 'center'
        });

    doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#333333')
        .text('Estoque atual de bandas por desenho/medida', 40, 102, {
            align: 'center'
        });

    doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#333333')
        .text(`Gerado em: ${dataHora}`, 40, 120, {
            align: 'center'
        });

    doc.y = 155;
}

function desenharTituloGrupo(doc, titulo) {
    garantirEspaco(doc, 50);

    const x = 40;
    const largura = doc.page.width - 80;
    const y = doc.y;

    doc
        .roundedRect(x, y, largura, 28, 4)
        .fill('#0b2c66');

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

function desenharCabecalhoTabela(doc) {
    garantirEspaco(doc, 40);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;
    const altura = 26;

    // colunas
    const colCodigo = 180;
    const colLargura = 110;
    const colEstoque = 110;
    const colAtivo = largura - colCodigo - colLargura - colEstoque;

    doc
        .rect(x, y, largura, altura)
        .fill('#dfe8f3');

    doc.fillColor('#0b2c66').font('Helvetica-Bold').fontSize(10);

    doc.text('Código / Descrição', x + 8, y + 8, {
        width: colCodigo - 10
    });

    doc.text('Largura (mm)', x + colCodigo + 8, y + 8, {
        width: colLargura - 10,
        align: 'center'
    });

    doc.text('Estoque Total', x + colCodigo + colLargura + 8, y + 8, {
        width: colEstoque - 10,
        align: 'center'
    });

    doc.text('Ativo', x + colCodigo + colLargura + colEstoque + 8, y + 8, {
        width: colAtivo - 10,
        align: 'center'
    });

    doc.y = y + altura;
}

function desenharLinhaTabela(doc, item, zebra = false) {
    garantirEspaco(doc, 28);

    const x = 40;
    const y = doc.y;
    const largura = doc.page.width - 80;
    const altura = 28;

    const colCodigo = 180;
    const colLargura = 110;
    const colEstoque = 110;
    const colAtivo = largura - colCodigo - colLargura - colEstoque;

    if (zebra) {
        doc
            .rect(x, y, largura, altura)
            .fill('#f7f9fc');
    }

    // linha divisória
    doc
        .moveTo(x, y + altura)
        .lineTo(x + largura, y + altura)
        .lineWidth(0.5)
        .strokeColor('#d9d9d9')
        .stroke();

    doc.fillColor('#222222').font('Helvetica').fontSize(10);

    const descricaoLinha = item.descricao
        ? `${item.codigo} - ${item.descricao}`
        : item.codigo;

    doc.text(descricaoLinha, x + 8, y + 8, {
        width: colCodigo - 12
    });

    doc.text(String(item.largura || ''), x + colCodigo + 8, y + 8, {
        width: colLargura - 10,
        align: 'center'
    });

    doc.text(String(item.estoque_total || 0), x + colCodigo + colLargura + 8, y + 8, {
        width: colEstoque - 10,
        align: 'center'
    });

    doc.text(item.ativo ? 'Sim' : 'Não', x + colCodigo + colLargura + colEstoque + 8, y + 8, {
        width: colAtivo - 10,
        align: 'center'
    });

    doc.y = y + altura;
}

function desenharResumoGrupo(doc, itens) {
    garantirEspaco(doc, 30);

    const totalItens = itens.length;
    const totalEstoque = itens.reduce((acc, item) => acc + Number(item.estoque_total || 0), 0);

    doc.moveDown(0.4);

    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#222222')
        .text(`TOTAL DE ITENS: ${totalItens}`, 40, doc.y, {
            align: 'center'
        });

    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#222222')
        .text(`TOTAL EM ESTOQUE: ${totalEstoque}`, 0, doc.y - 13, {
            align: 'center'
        });

    doc.moveDown(1.2);
}

function desenharResumoFinal(doc, resumo) {
    garantirEspaco(doc, 120);

    const x = 40;
    const y = doc.y + 5;
    const largura = doc.page.width - 80;
    const altura = 95;

    doc
        .roundedRect(x, y, largura, altura, 8)
        .lineWidth(1)
        .strokeColor('#0b2c66')
        .stroke();

    doc
        .moveTo(x + largura / 2, y + 12)
        .lineTo(x + largura / 2, y + altura - 12)
        .lineWidth(1)
        .strokeColor('#0b2c66')
        .stroke();

    // lado esquerdo
    doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#111111')
        .text('RESUMO GERAL', x + 20, y + 15);

    doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#222222')
        .text(`Total de bandas ativas: ${resumo.totalBandasAtivas}`, x + 20, y + 42)
        .text(`Total de itens (medidas): ${resumo.totalItens}`, x + 20, y + 60)
        .text(`Total de grupos (desenhos): ${resumo.totalGrupos}`, x + 20, y + 78);

    // lado direito
    doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#222222')
        .text('Total geral em estoque:', x + largura / 2 + 20, y + 30);

    doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#0b2c66')
        .text(String(resumo.totalEstoqueGeral), x + largura / 2 + 20, y + 52, {
            width: largura / 2 - 40,
            align: 'center'
        });

    doc.y = y + altura + 20;

    doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#555555')
        .text('Este relatório é apenas para fins informativos.', 40, doc.y, {
            align: 'center'
        });
}

// ======================================================
// GERAR PDF DE ESTOQUE
// ======================================================
exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
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

        if (!bandas.length) {
            return res.status(404).json({
                mensagem: 'Nenhuma banda ativa encontrada para gerar o relatório'
            });
        }

        const grupos = agruparBandasPorDesenho(bandas);
        const gruposOrdenados = Object.keys(grupos).sort((a, b) =>
            a.localeCompare(b, 'pt-BR', { numeric: true })
        );

        const dataHora = formatarDataHoraBR();

        // response PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'inline; filename=relatorio-estoque-bandas.pdf'
        );

        const doc = new PDFDocument({
            size: 'A4',
            margin: 40,
            bufferPages: true
        });

        doc.pipe(res);

        // Cabeçalho da primeira página
        desenharCabecalhoPagina(doc, dataHora);

        let totalEstoqueGeral = 0;
        let totalItens = 0;

        gruposOrdenados.forEach((nomeGrupo, indiceGrupo) => {
            const itens = grupos[nomeGrupo];

            const alturaEstimadaGrupo = 70 + (itens.length * 28) + 45;
            garantirEspaco(doc, alturaEstimadaGrupo);

            desenharTituloGrupo(doc, nomeGrupo);
            desenharCabecalhoTabela(doc);

            itens.forEach((item, index) => {
                desenharLinhaTabela(doc, item, index % 2 !== 0);
            });

            desenharResumoGrupo(doc, itens);

            totalItens += itens.length;
            totalEstoqueGeral += itens.reduce(
                (acc, item) => acc + Number(item.estoque_total || 0),
                0
            );

            if (indiceGrupo < gruposOrdenados.length - 1) {
                doc.moveDown(0.6);
            }
        });

        desenharResumoFinal(doc, {
            totalBandasAtivas: bandas.length,
            totalItens,
            totalGrupos: gruposOrdenados.length,
            totalEstoqueGeral
        });

        // numeração de páginas
        const pageRange = doc.bufferedPageRange();
        for (let i = 0; i < pageRange.count; i++) {
            doc.switchToPage(i);

            doc
                .font('Helvetica')
                .fontSize(10)
                .fillColor('#333333')
                .text(
                    `Página ${i + 1} de ${pageRange.count}`,
                    doc.page.width - 140,
                    40,
                    {
                        width: 100,
                        align: 'right'
                    }
                );
        }

        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return res.status(500).json({
            mensagem: 'Erro ao gerar PDF de estoque'
        });
    }
};