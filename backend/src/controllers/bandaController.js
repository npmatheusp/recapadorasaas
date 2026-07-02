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
            mensagem: 'Status updated com sucesso'
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

// 🎯 ESSA FUNÇÃO GARANTE O AGRUPAMENTO SEPARADO POR DESENHO (Ex: HDC1, UTDO31)
function extrairGrupoBanda(codigo = '') {
    const texto = String(codigo).trim();
    const partes = texto.split(/\s+/);
    return partes[0] || 'SEM GRUPO';
}

// 🎯 LIMPA A PALAVRA "BANDA" E TRAÇOS REMANESCENTES DO TEXTO
function limparTextoParaPdf(textoBruto) {
    if (!textoBruto) return '';
    return String(textoBruto)
        .replace(/BANDA\s?/gi, '') // Remove a palavra BANDA
        .replace(/^\s*-\s*/, '')   // Remove hífen solto no início se houver
        .trim();
}

// ======================================================
// CABEÇALHO COMPACTO (PAISAGEM)
// ======================================================
function desenharCabecalhoPaisagem(doc, dataHora) {
    const largura = doc.page.width;
    const margem = 20;

    doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#0b2c66')
        .text('DO VALE PRUDENTE PNEUS E RECAPAGENS LTDA', margem, 12, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#333')
        .text(`RELATÓRIO DE ESTOQUE RESUMIDO POR DESENHO  |  ${dataHora}`, margem, 26, {
            width: largura - margem * 2,
            align: 'center'
        });

    doc.moveTo(margem, 38)
        .lineTo(largura - margem, 38)
        .strokeColor('#0b2c66')
        .stroke();
}

// ======================================================
// COMPONENTES DA TABELA ULTRA COMPACTA (3 COLUNAS)
// ======================================================
function desenharCabecalhoTabelaColuna(doc, x, y, larguraColuna) {
    const colDescricao = Math.floor(larguraColuna * 0.74);
    const colEstoque = larguraColuna - colDescricao;

    doc.rect(x, y, larguraColuna, 11).fill('#dfe8f3');
    doc.fillColor('#0b2c66').font('Helvetica-Bold').fontSize(7);

    doc.text('Descrição', x + 3, y + 2, { width: colDescricao - 4 });
    doc.text('Qtd.', x + colDescricao + 1, y + 2, { width: colEstoque - 2, align: 'center' });

    return y + 11;
}

function desenharLinhaTabelaColuna(doc, x, y, larguraColuna, item, zebra = false) {
    const colDescricao = Math.floor(larguraColuna * 0.74);
    const colEstoque = larguraColuna - colDescricao;

    if (zebra) {
        doc.rect(x, y, larguraColuna, 10).fill('#f7f9fc');
    }

    doc.moveTo(x, y + 10)
        .lineTo(x + larguraColuna, y + 10)
        .strokeColor('#eee')
        .stroke();

    doc.fillColor('#222').font('Helvetica').fontSize(7);

    // 🎯 MANTEVE O TRATAMENTO DE EXIBIÇÃO: Mostra apenas a descrição limpa (Sem código e sem "BANDA")
    const textoExibicao = item.descricao ? limparTextoParaPdf(item.descricao) : item.codigo;
    
    doc.text(textoExibicao, x + 3, y + 1.5, { width: colDescricao - 4, ellipsis: true });

    doc.text(String(item.estoque_total || 0), x + colDescricao + 1, y + 1.5, {
        width: colEstoque - 2,
        align: 'center'
    });

    return y + 10;
}

// ======================================================
// PDF PRINCIPAL (1 FOLHA EM 3 COLUNAS)
// ======================================================
exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
            SELECT id, codigo, descricao, estoque_total, ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        // Realiza o agrupamento usando estritamente o código bruto (ex: HDC1)
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
            layout: 'landscape',
            margin: 20,
            bufferPages: true
        });

        doc.pipe(res);

        const dataHora = formatarDataHoraBR();
        desenharCabecalhoPaisagem(doc, dataHora);

        // Configuração para 3 Colunas paralelas na folha
        const margemEsquerda = 20;
        const espacoEntreColunas = 15;
        const larguraUtil = doc.page.width - (margemEsquerda * 2); 
        const larguraColuna = (larguraUtil - (espacoEntreColunas * 2)) / 3;

        const yInicial = 46;
        const yLimiteInferior = doc.page.height - 25; 

        let xAtual = margemEsquerda;
        let yAtual = yInicial;
        let colunaAtual = 1;

        ordenados.forEach((grupo) => {
            const itensDoGrupo = grupos[grupo];
            
            // Título (12) + Cabeçalho (11) + Linhas (N * 10) + Espaço entre blocos (4)
            const alturaBloco = 12 + 11 + (itensDoGrupo.length * 10) + 4;

            // Gerenciamento dinâmico de colunas
            if (yAtual + alturaBloco > yLimiteInferior) {
                if (colunaAtual === 1) {
                    colunaAtual = 2;
                    xAtual = margemEsquerda + larguraColuna + espacoEntreColunas;
                    yAtual = yInicial;
                } else if (colunaAtual === 2) {
                    colunaAtual = 3;
                    xAtual = margemEsquerda + (larguraColuna * 2) + (espacoEntreColunas * 2);
                    yAtual = yInicial;
                } else {
                    doc.addPage();
                    desenharCabecalhoPaisagem(doc, dataHora);
                    colunaAtual = 1;
                    xAtual = margemEsquerda;
                    yAtual = yInicial;
                }
            }

            // 🎯 MOSTRA O TÍTULO DO DESENHO AGRUPADO IGUAL AO MODELO ANTIGO, MAS LIMPO
            const desenhoLimpo = limparTextoParaPdf(grupo);
            doc.font('Helvetica-Bold')
                .fontSize(8)
                .fillColor('#0b2c66')
                .text(`DESENHO: ${desenhoLimpo}`, xAtual, yAtual + 1);
            
            yAtual += 12;

            // Desenha o cabeçalho e as linhas da tabela daquele desenho específico
            yAtual = desenharCabecalhoTabelaColuna(doc, xAtual, yAtual, larguraColuna);

            itensDoGrupo.forEach((item, idx) => {
                yAtual = desenharLinhaTabelaColuna(doc, xAtual, yAtual, larguraColuna, item, idx % 2 !== 0);
            });

            yAtual += 4; 
        });

        // ==================================================
        // RODAPÉ PROTEGIDO
        // ==================================================
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);

            const margemInferiorOriginal = doc.page.margins.bottom;
            doc.page.margins.bottom = 0; 

            doc.font('Helvetica')
                .fontSize(7.5)
                .fillColor('#666')
                .text(
                    `Página ${i + 1} de ${range.count}`,
                    20,
                    doc.page.height - 15,
                    {
                        width: doc.page.width - 40,
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