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

// Extrai a primeira palavra do texto para servir como cabeçalho do grupo
function extrairGrupoBanda(texto = '') {
    return String(texto).trim().split(/\s+/)[0] || 'SEM GRUPO';
}

// Limpa de forma inteligente os sufixos deixando apenas o essencial (ex: RTAW 220M)
function limparSufixoInutil(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/-?\s*BANDA/gi, '')
        .replace(/-?\s*ANEL/gi, '')
        .replace(/-?\s*ANÉL/gi, '')
        .replace(/-?\s*Borrachudo/gi, '')
        .trim();
}

const CORES = {
    azul: '#0B4F8C',
    texto: '#222222'
};

// ======================================================
// CABEÇALHO CLEAN
// ======================================================
function desenharCabecalhoPaisagem(doc, dataHora) {
    const margem = 20;
    const largura = doc.page.width;

    // Barra superior decorativa fina
    doc.rect(0, 0, largura, 6)
        .fill(CORES.azul);

    // Empresa
    doc.fillColor(CORES.azul)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('DO VALE PRUDENTE PNEUS E RECAPAGENS LTDA', margem, 18, {
            width: largura - margem * 2,
            align: 'center'
        });

    // Subtítulo
    doc.fillColor('#555555')
        .font('Helvetica')
        .fontSize(9)
        .text(`RELATÓRIO DE ESTOQUE DE BANDAS    |    ${dataHora}`, margem, 35, {
            width: largura - margem * 2,
            align: 'center'
        });

    // Linha divisória fina
    doc.moveTo(margem, 50)
        .lineTo(largura - margem, 50)
        .lineWidth(0.8)
        .strokeColor('#CCCCCC')
        .stroke();
}

// ======================================================
// DESENHAR BLOCO SIMPLIFICADO
// ======================================================
function desenharBlocoGrupo(doc, grupo, itens, x, y, larguraColuna) {
    // Título do Grupo (Ex: RTAW)
    doc.fillColor(CORES.azul)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(grupo, x, y);
    
    y += 14; // Espaço após o título do grupo

    // Renderizar itens do grupo
    itens.forEach(item => {
        // Usa a descrição limpa para exibição no relatório
        const descricaoLimpa = limparSufixoInutil(item.descricao || item.codigo);
        const estoque = Number(item.estoque_total || 0).toString();

        doc.fillColor(CORES.texto)
            .font('Helvetica')
            .fontSize(9);

        // Texto do item (Ordenado por Descrição)
        doc.text(descricaoLimpa, x, y, {
            width: larguraColuna * 0.75,
            ellipsis: true
        });

        // Quantidade alinhada à direita do bloco
        doc.font('Helvetica-Bold')
            .text(estoque, x + (larguraColuna * 0.75), y, {
                width: larguraColuna * 0.25,
                align: 'right'
            });

        y += 12; // Espaçamento entre as linhas de dados
    });

    return y; // Retorna o novo Y atualizado
}

// ======================================================
// CALCULA ALTURA DO BLOCO CLEAN
// ======================================================
function calcularAlturaBloco(itens) {
    return 14 + (itens.length * 12) + 15; // Título + Linhas + Margem inferior entre blocos
}

// ======================================================
// PDF PRINCIPAL
// ======================================================
exports.gerarPdfEstoque = async (req, res) => {
    try {
        // Mudança aqui: Agora busca ordenando por 'descricao' do banco de dados
        const [bandas] = await pool.execute(`
            SELECT
                id,
                codigo,
                descricao,
                estoque_total,
                ativo
            FROM bandas
            WHERE ativo = TRUE
            ORDER BY descricao ASC, codigo ASC
        `);

        // Agrupar itens por desenho usando o campo 'descricao'
        const grupos = {};
        bandas.forEach(item => {
            // Se não houver descrição, usa o código como fallback para não quebrar
            const textoParaGrupo = item.descricao ? item.descricao : item.codigo;
            const grupo = extrairGrupoBanda(textoParaGrupo);
            
            if (!grupos[grupo]) {
                grupos[grupo] = [];
            }
            grupos[grupo].push(item);
        });

        const listaGrupos = Object.keys(grupos).sort();

        // Configuração de Resposta do Servidor
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

        // Grid Layout de 3 Colunas limpas paralelas
        const margem = 20;
        const espacoFator = 20; // Espaço entre as colunas
        const larguraUtil = doc.page.width - (margem * 2);
        const larguraColuna = (larguraUtil - (espacoFator * 2)) / 3;

        const yInicial = 60;
        const limitePagina = doc.page.height - 25;

        let coluna = 1;
        let x = margem;
        let y = yInicial;

        // Loop pelos grupos mapeados
        for (const grupo of listaGrupos) {
            const itens = grupos[grupo];
            const alturaBloco = calcularAlturaBloco(itens);

            // Validação de quebra de colunas e páginas dinâmicas
            if (y + alturaBloco > limitePagina) {
                if (coluna === 1) {
                    coluna = 2;
                    x = margem + larguraColuna + espacoFator;
                    y = yInicial;
                }
                else if (coluna === 2) {
                    coluna = 3;
                    x = margem + (larguraColuna * 2) + (espacoFator * 2);
                    y = yInicial;
                }
                else {
                    doc.addPage();
                    desenharCabecalhoPaisagem(doc, dataHora);

                    coluna = 1;
                    x = margem;
                    y = yInicial;
                }
            }

            // Desenha o bloco simplificado solicitado
            y = desenharBlocoGrupo(doc, grupo, itens, x, y, larguraColuna);
            
            // Espaçamento extra de segurança entre grupos na mesma coluna
            y += 15; 
        }

        // Paginação Dinâmica Inferior
        const paginas = doc.bufferedPageRange();
        for (let i = 0; i < paginas.count; i++) {
            doc.switchToPage(i);

            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#777777')
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

        doc.end();

    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            mensagem: 'Erro ao gerar PDF.'
        });
    }
};