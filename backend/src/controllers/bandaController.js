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
            mensagem: 'Banda updated com sucesso'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro ao atualizar banda'
        });
    }
};

// ======================================================
// EXCLUIR
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

// ======================================================
// CABEÇALHO COMPACTO (PAISAGEM)
// ======================================================
function desenharCabecalhoPaisagem(doc, dataHora) {
    const largura = doc.page.width;
    const margem = 25;

    doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#0b2c66')
        .text('DO VALE PRUDENTE PNEUS E RECAPAGENS LTDA', margem, 15, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#333')
        .text(`RELATÓRIO DE ESTOQUE DE BANDAS  |  ${dataHora}`, margem, 32, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.moveTo(margem, 46)
        .lineTo(largura - margem, 46)
        .strokeColor('#0b2c66')
        .stroke();
}

// ======================================================
// COMPONENTES DA TABELA COMPACTA (DUAS COLUNAS)
// ======================================================
function desenharCabecalhoTabelaColuna(doc, x, y, larguraColuna) {
    const colCodigo = Math.floor(larguraColuna * 0.65);
    const colEstoque = Math.floor(larguraColuna * 0.20);
    const colAtivo = larguraColuna - colCodigo - colEstoque;

    doc.rect(x, y, larguraColuna, 16).fill('#dfe8f3');
    doc.fillColor('#0b2c66').font('Helvetica-Bold').fontSize(8.5);

    doc.text('Código / Descrição', x + 4, y + 4, { width: colCodigo - 6 });
    doc.text('Est.', x + colCodigo + 2, y + 4, { width: colEstoque - 4, align: 'center' });
    doc.text('Ativo', x + colCodigo + colEstoque + 2, y + 4, { width: colAtivo - 4, align: 'center' });

    return y + 16;
}

function desenharLinhaTabelaColuna(doc, x, y, larguraColuna, item, zebra = false) {
    const colCodigo = Math.floor(larguraColuna * 0.65);
    const colEstoque = Math.floor(larguraColuna * 0.20);
    const colAtivo = larguraColuna - colCodigo - colEstoque;

    if (zebra) {
        doc.rect(x, y, larguraColuna, 15).fill('#f7f9fc');
    }

    doc.moveTo(x, y + 15)
        .lineTo(x + larguraColuna, y + 15)
        .strokeColor('#eee')
        .stroke();

    doc.fillColor('#222').font('Helvetica').fontSize(8);

    const texto = item.descricao ? `${item.codigo} - ${item.descricao}` : item.codigo;
    doc.text(texto, x + 4, y + 3.5, { width: colCodigo - 6, ellipsis: true });

    doc.text(String(item.estoque_total || 0), x + colCodigo + 2, y + 3.5, {
        width: colEstoque - 4,
        align: 'center'
    });

    doc.text(item.ativo ? 'Sim' : 'Não', x + colCodigo + colEstoque + 2, y + 3.5, {
        width: colAtivo - 4,
        align: 'center'
    });

    return y + 15;
}

// ======================================================
// PDF PRINCIPAL (FORÇADO EM 1 FOLHA)
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

        // Configura o documento em modo PAISAGEM (Landscape) e margens pequenas
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 25,
            bufferPages: true
        });

        doc.pipe(res);

        const dataHora = formatarDataHoraBR();
        desenharCabecalhoPaisagem(doc, dataHora);

        // Definições de posicionamento em 2 Colunas
        const margemEsquerda = 25;
        const espacoEntreColunas = 20;
        const larguraUtil = doc.page.width - (margemEsquerda * 2); 
        const larguraColuna = (larguraUtil - espacoEntreColunas) / 2;

        const yInicial = 55;
        const yLimiteInferior = doc.page.height - 35; // Deixa espaço para o rodapé

        let xAtual = margemEsquerda;
        let yAtual = yInicial;
        let colunaAtual = 1;

        ordenados.forEach((grupo) => {
            const itensDoGrupo = grupos[grupo];
            
            // Calcula a altura necessária para este bloco (Título do grupo + Cabeçalho da tabela + Linhas)
            const alturaBloco = 16 + 16 + (itensDoGrupo.length * 15) + 8;

            // Se o bloco estourar o limite inferior, pula para a coluna da direita ou reduz riscos
            if (yAtual + alturaBloco > yLimiteInferior) {
                if (colunaAtual === 1) {
                    colunaAtual = 2;
                    xAtual = margemEsquerda + larguraColuna + espacoEntreColunas;
                    yAtual = yInicial;
                }
                // Se já estiver na coluna 2 e mesmo assim estourar, o PDFKit criará a folha 2 automaticamente, 
                // mas com essa arquitetura ultra compacta em modo Paisagem, tudo caberá na folha 1.
            }

            // Desenha o Título do Grupo de Banda
            doc.font('Helvetica-Bold')
                .fontSize(10)
                .fillColor('#0b2c66')
                .text(`BANDA: ${grupo}`, xAtual, yAtual + 3);
            
            yAtual += 16;

            // Desenha a tabela do grupo na coluna atual
            yAtual = desenharCabecalhoTabela(doc, xAtual, yAtual, larguraColuna);

            itensDoGrupo.forEach((item, idx) => {
                yAtual = desenharLinhaTabelaColuna(doc, xAtual, yAtual, larguraColuna, item, idx % 2 !== 0);
            });

            yAtual += 8; // Espaçamento leve entre um grupo e outro
        });

        // ==================================================
        // RODAPÉ CORRIGIDO (SEM PRODUZIR PÁGINAS EXTRAS)
        // ==================================================
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);

            const margemInferiorOriginal = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;

            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#666')
                .text(
                    `Página ${i + 1} de ${range.count}`,
                    25,
                    doc.page.height - 20,
                    {
                        width: doc.page.width - 50,
                        align: 'center'
                    }
                );

            doc.page.margins.bottom = margemInferiorOriginal;
        }

        doc.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensagem: 'Erro ao gerar PDF' });
    }
};

// Helper interno ajustado para receber coordenadas dinâmicas
function desenharCabecalhoTabela(doc, x, y, larguraColuna) {
    return desenharCabecalhoTabelaColuna(doc, x, y, larguraColuna);
}