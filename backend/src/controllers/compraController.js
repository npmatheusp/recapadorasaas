const pool = require('../config/database');
const xml2js = require('xml2js');

exports.importarXML = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensagem: 'Nenhum arquivo XML foi enviado.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const xmlString = req.file.buffer.toString('utf-8');
        const parser = new xml2js.Parser({ explicitArray: false });
        const resultado = await parser.parseStringPromise(xmlString);

        let infNFe;
        if (resultado.nfeProc && resultado.nfeProc.NFe && resultado.nfeProc.NFe.infNFe) {
            infNFe = resultado.nfeProc.NFe.infNFe;
        } else if (resultado.NFe && resultado.NFe.infNFe) {
            infNFe = resultado.NFe.infNFe;
        }

        if (!infNFe) {
            await conn.rollback();
            return res.status(400).json({ mensagem: 'Estrutura de XML de NF-e inválida ou incompatível.' });
        }

        const numNota = infNFe.ide.nNF;
        const itensNota = infNFe.det;
        const listaItens = Array.isArray(itensNota) ? itensNota : [itensNota];
        
        let itensProcessados = 0;
        let itensIgnoradosCount = 0;
        let errosItens = [];

        // O laço 'for' já processa linha por linha de forma independente
        for (const item of listaItens) {
            const produto = item.prod;
            const cProd = produto.cProd.trim(); 
            const xProd = produto.xProd;        
            const uCom = produto.uCom.toUpperCase().trim(); // KG, PC, UN...
            const infAdProd = item.infAdProd ? String(item.infAdProd) : ''; // Pega o texto adicional da linha

            // 🔍 1. Busca a banda no banco
            const [[banda]] = await conn.execute(`
                SELECT id, estoque_total FROM bandas WHERE codigo = ?
            `, [cProd]);

            // 🛡️ 2. Se o item não estiver cadastrado (insumos, graxas, fretes), ignora a linha e vai para a próxima
            if (!banda) {
                itensIgnoradosCount++;
                continue; 
            }

            let qCom = 0;

            if (uCom === 'KG') {
                // 🎯 ESTRATÉGIA DE EXTRAÇÃO POR LINHA (Padrão Marangoni)
                // Procuramos o padrão '(( QTD BA)' dentro das informações adicionais deste item específico
                const regexQtd = /\(\(\s*(\d+)\s*BA\)/i;
                const match = infAdProd.match(regexQtd);

                if (match && match[1]) {
                    // Se encontrou (ex: '008'), usa esse número exato da linha
                    qCom = parseInt(match[1], 10);
                } else {
                    // Fallback matemático isolado por linha (Valor do Item / Preço Unitário de Ref)
                    // Se não achar o padrão de texto, calcula de forma independente sem usar dados globais da nota
                    const pesoTotalItem = Number(produto.qCom);
                    const vProd = Number(produto.vProd);
                    const vUnCom = Number(produto.vUnCom);

                    // Divide o valor do item pelo preço aproximado de uma unidade cheia
                    // Mas para garantir, se o peso for menor que 12kg e não tiver o padrão, costuma ser 1 unidade
                    if (pesoTotalItem > 0 && pesoTotalItem < 12) {
                        qCom = 1;
                    } else {
                        // Média de segurança por item se tudo falhar
                        qCom = Math.round(pesoTotalItem / 7.85); 
                    }
                }
            } else {
                // Se for PC ou UN (como os anéis), pega a quantidade direta daquela linha
                qCom = Math.round(Number(produto.qCom));
            }

            // Garante que nunca adicione zero por erro de leitura ou arredondamento
            if (qCom <= 0) qCom = 1;

            // 🆙 3. Atualiza o estoque somando a quantidade exata calculada para ESTA LINHA
            await conn.execute(`
                UPDATE bandas 
                SET estoque_total = estoque_total + ? 
                WHERE id = ?
            `, [qCom, banda.id]);

            // 📦 4. Registra no histórico de compras
            try {
                await conn.execute(`
                    INSERT INTO compras_itens (banda_id, usuario_id, quantidade, nota_fiscal, observacao)
                    VALUES (?, ?, ?, ?, ?)
                `, [banda.id, req.usuario.id, qCom, numNota, `Importação linha individual (${uCom})`]);
            } catch (errDb) {
                console.warn("Tabela de histórico de compras não configurada.");
            }

            itensProcessados++;
        }

        if (itensProcessados === 0 && itensIgnoradosCount > 0) {
            await conn.rollback();
            return res.status(400).json({ 
                mensagem: `A NF-e Nº ${numNota} foi processada, mas nenhuma das bandas listadas está cadastrada no seu sistema.`
            });
        }

        await conn.commit();

        res.json({
            mensagem: `NF-e Nº ${numNota} importada com sucesso! ${itensProcessados} itens de estoque atualizados. ${itensIgnoradosCount} itens de insumos foram desconsiderados.`
        });

    } catch (error) {
        await conn.rollback();
        console.error("Erro no processamento do XML:", error);
        res.status(500).json({ message: 'Erro interno ao processar o arquivo XML da NF-e.' });
    } finally {
        conn.release();
    }
};