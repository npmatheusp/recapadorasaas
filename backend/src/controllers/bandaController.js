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
    return String(codigo).trim().split(/\s+/)[0] || 'SEM GRUPO';
}

const CORES = {
    azul: '#0B4F8C',
    azulClaro: '#EAF3FB',
    cinzaCabecalho: '#F2F4F7',
    zebra: '#FAFAFA',
    linha: '#D8D8D8',
    texto: '#222',
    branco: '#FFFFFF'
};

// ======================================================
// CABEÇALHO
// ======================================================

function desenharCabecalhoPaisagem(doc, dataHora) {
    const margem = 20;
    const largura = doc.page.width;

    // Barra superior
    doc.rect(0, 0, largura, 10)
        .fill(CORES.azul);

    // Empresa
    doc.fillColor(CORES.azul)
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(
            'DO VALE PRUDENTE PNEUS E RECAPAGENS LTDA',
            margem,
            20,
            {
                width: largura - margem * 2,
                align: 'center'
            }
        );

    // Subtítulo
    doc.fillColor('#444')
        .font('Helvetica')
        .fontSize(9)
        .text(
            `RELATÓRIO DE ESTOQUE DE BANDAS    |    ${dataHora}`,
            margem,
            40,
            {
                width: largura - margem * 2,
                align: 'center'
            }
        );

    // Linha azul
    doc.moveTo(margem, 58)
        .lineTo(largura - margem, 58)
        .lineWidth(1.2)
        .strokeColor(CORES.azul)
        .stroke();
}

// ======================================================
// TÍTULO DO BLOCO
// ======================================================

function desenharTituloGrupo(doc, grupo, x, y, largura) {
    doc.rect(x, y, largura, 14)
        .fill(CORES.azul);

    doc.fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(
            `BANDA: ${grupo}`,
            x + 5,
            y + 3,
            {
                width: largura - 10
            }
        );

    return y + 14;
}

// ======================================================
// CABEÇALHO DA TABELA
// ======================================================

function desenharCabecalhoTabelaColuna(doc, x, y, larguraColuna) {
    const colCodigo = larguraColuna * 0.70;
    const colEstoque = larguraColuna * 0.15;
    const colAtivo = larguraColuna * 0.15;

    doc.rect(x, y, larguraColuna, 13)
        .fill(CORES.cinzaCabecalho);

    doc.rect(x, y, larguraColuna, 13)
        .strokeColor(CORES.linha)
        .stroke();

    doc.fillColor(CORES.azul)
        .font('Helvetica-Bold')
        .fontSize(7.2);

    doc.text(
        'Código / Descrição',
        x + 4,
        y + 3,
        {
            width: colCodigo
        }
    );

    doc.text(
        'Est.',
        x + colCodigo,
        y + 3,
        {
            width: colEstoque,
            align: 'center'
        }
    );

    doc.text(
        'Ativo',
        x + colCodigo + colEstoque,
        y + 3,
        {
            width: colAtivo,
            align: 'center'
        }
    );

    return y + 13;
}

// ======================================================
// LINHAS DA TABELA
// ======================================================

function desenharLinhaTabelaColuna(
    doc,
    x,
    y,
    gridWidth,
    item,
    zebra = false
) {
    const colCodigo = gridWidth * 0.70;
    const colEstoque = gridWidth * 0.15;
    const colAtivo = gridWidth * 0.15;

    const alturaLinha = 12;

    // Fundo zebra
    if (zebra) {
        doc.rect(x, y, gridWidth, alturaLinha)
            .fill(CORES.zebra);
    }

    // Borda externa
    doc.rect(x, y, gridWidth, alturaLinha)
        .strokeColor(CORES.linha)
        .lineWidth(0.35)
        .stroke();

    // Linhas verticais internas
    doc.moveTo(x + colCodigo, y)
        .lineTo(x + colCodigo, y + alturaLinha)
        .strokeColor(CORES.linha)
        .stroke();

    doc.moveTo(x + colCodigo + colEstoque, y)
        .lineTo(x + colCodigo + colEstoque, y + alturaLinha)
        .strokeColor(CORES.linha)
        .stroke();

    //---------------------------------------------------
    // Texto Puro do Código/Descrição
    //---------------------------------------------------
    // Alterado para manter os sufixos "- BANDA" e "- ANEL" exatamente como no PDF de exemplo.
    const textoExibicao = String(item.codigo || '').trim();

    doc.fillColor(CORES.texto)
        .font('Helvetica')
        .fontSize(7);

    doc.text(
        textoExibicao,
        x + 3,
        y + 2.5,
        {
            width: colCodigo - 6,
            ellipsis: true
        }
    );

    //---------------------------------------------------
    // Estoque
    //---------------------------------------------------
    const estoque = Number(item.estoque_total || 0);

    if (estoque <= 0) {
        doc.fillColor('#C62828');
    } else if (estoque < 5) {
        doc.fillColor('#E67E22');
    } else {
        doc.fillColor('#1E8449');
    }

    doc.font('Helvetica-Bold')
        .fontSize(7.2)
        .text(
            estoque.toString(),
            x + colCodigo,
            y + 2.5,
            {
                width: colEstoque,
                align: 'center'
            }
        );

    //---------------------------------------------------
    // Ativo
    //---------------------------------------------------
    doc.fillColor(item.ativo ? '#1E8449' : '#C62828')
        .font('Helvetica-Bold')
        .fontSize(7);

    doc.text(
        item.ativo ? 'Sim' : 'Não',
        x + colCodigo + colEstoque,
        y + 2.5,
        {
            width: colAtivo,
            align: 'center'
        }
    );

    return y + alturaLinha;
}

// ======================================================
// CALCULA ALTURA DO BLOCO
// ======================================================

function calcularAlturaBloco(itens){
    return (
        14 +      // titulo azul
        13 +      // cabeçalho tabela
        (itens.length * 12) +
        8
    );
}

// ======================================================
// PDF PRINCIPAL
// ======================================================

exports.gerarPdfEstoque = async (req, res) => {
    try {
        const [bandas] = await pool.execute(`
            SELECT
                id,
                codigo,
                descricao,
                estoque_total,
                ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY codigo
        `);

        //--------------------------------------------------
        // AGRUPAR POR DESENHO (Ex: HDC1, RTTR11)
        //--------------------------------------------------
        const grupos = {};

        bandas.forEach(item => {
            const grupo = extrairGrupoBanda(item.codigo);

            if (!grupos[grupo]) {
                grupos[grupo] = [];
            }
            grupos[grupo].push(item);
        });

        const listaGrupos = Object.keys(grupos).sort();

        //--------------------------------------------------
        // CONFIGURAÇÃO DO PDFKIT
        //--------------------------------------------------
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'inline; filename=Relatorio_Estoque_Bandas.pdf'
        );

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 20,
            bufferPages: true
        });

        doc.pipe(res);

        const dataHora = formatarDataHoraBR();
        desenharCabecalhoPaisagem(doc, dataHora);

        //--------------------------------------------------
        // CONFIGURAÇÕES DAS COLUNAS (Layout de 3 colunas)
        //--------------------------------------------------
        const margem = 20;
        const espaco = 12;
        const larguraUtil = doc.page.width - (margem * 2);
        const larguraColuna = (larguraUtil - (espaco * 2)) / 3;

        const yInicial = 66;
        const limitePagina = doc.page.height - 25;

        let coluna = 1;
        let x = margem;
        let y = yInicial;

        //--------------------------------------------------
        // PERCORRER TODOS OS GRUPOS
        //--------------------------------------------------
        for (const grupo of listaGrupos) {
            const itens = grupos[grupo];
            const alturaBloco = calcularAlturaBloco(itens);

            //---------------------------------------------
            // QUEBRA DE COLUNA / PÁGINA
            //---------------------------------------------
            if (y + alturaBloco > limitePagina) {
                if (coluna === 1) {
                    coluna = 2;
                    x = margem + larguraColuna + espaco;
                    y = yInicial;
                }
                else if (coluna === 2) {
                    coluna = 3;
                    x = margem + (larguraColuna * 2) + (espaco * 2);
                    y = yInicial;
                }
                else {
                    // NOVA PÁGINA
                    doc.addPage();
                    desenharCabecalhoPaisagem(doc, dataHora);

                    coluna = 1;
                    x = margem;
                    y = yInicial;
                }
            }

            // TÍTULO AZUL (BANDA: XXX)
            y = desenharTituloGrupo(doc, grupo, x, y, larguraColuna);

            // CABEÇALHO DA TABELA CORRESPONDENTE
            y = desenharCabecalhoTabelaColuna(doc, x, y, larguraColuna);

            // IMPRESSÃO DAS LINHAS
            itens.forEach((item, indice) => {
                y = desenharLinhaTabelaColuna(
                    doc,
                    x,
                    y,
                    larguraColuna,
                    item,
                    indice % 2 !== 0
                );
            });

            // ESPAÇO ENTRE BLOCOS
            y += 8;
        }

        //--------------------------------------------------
        // PAGINAÇÃO DINÂMICA
        //--------------------------------------------------
        const paginas = doc.bufferedPageRange();
        for (let i = 0; i < paginas.count; i++) {
            doc.switchToPage(i);

            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#666666')
                .text(
                    `Página ${i + 1} de ${paginas.count}`,
                    20,
                    doc.page.height - 18,
                    {
                        width: doc.page.width - 40,
                        align: 'center'
                    }
                );
        }

        // FINALIZA PDF
        doc.end();

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            mensagem: 'Erro ao gerar PDF.'
        });
    }
};