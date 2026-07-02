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
        
        // 🎯 CAPTURA O PESO UNITÁRIO DIRETO DO XML (Bloco de Transporte/Volumes)
        // Lemos o peso líquido total e dividimos pela quantidade de volumes informada na nota
        let pesoUnitarioXml = 1;
        if (infNFe.transp && infNFe.transp.vol) {
            const vol = infNFe.transp.vol;
            const pesoLiquido = Number(vol.pesoL) || 0;
            const qtdVolumes = Number(vol.qVol) || 1;
            
            if (pesoLiquido > 0) {
                pesoUnitarioXml = pesoLiquido / qtdVolumes; // Ex: 5.950 / 1 = 5.95
            }
        }
        
        let itensProcessados = 0;
        let errosItens = [];

        for (const item of listaItens) {
            const produto = item.prod;
            const cProd = produto.cProd.trim(); 
            const xProd = produto.xProd;        
            
            // Peso total lançado para este item (Ex: 5.95 ou 59.50)
            const pesoTotalItem = Number(produto.qCom); 

            // 🔍 Busca apenas a banda pelo código (sem precisar de coluna de peso)
            const [[banda]] = await conn.execute(`
                SELECT id, estoque_total FROM bandas WHERE codigo = ?
            `, [cProd]);

            if (!banda) {
                errosItens.push(`Código [${cProd}] - ${xProd.substring(0, 30)}... não localizado no sistema.`);
                continue; 
            }

            // 🎯 MATEMÁTICA INTELIGENTE VIA XML:
            // Divide o peso total do item pelo peso unitário extraído da própria nota
            let qCom = Math.round(pesoTotalItem / pesoUnitarioXml);

            // Segurança para nunca zerar por arredondamento
            if (qCom <= 0) qCom = 1;

            // 🆙 Incrementa o estoque com a quantidade real calculada
            await conn.execute(`
                UPDATE bandas 
                SET estoque_total = estoque_total + ? 
                WHERE id = ?
            `, [qCom, banda.id]);

            // 📦 Registra na tabela de histórico de compras
            try {
                await conn.execute(`
                    INSERT INTO compras_itens (banda_id, usuario_id, quantidade, nota_fiscal, observacao)
                    VALUES (?, ?, ?, ?, ?)
                `, [banda.id, req.usuario.id, qCom, numNota, `Importação automática (Peso Unitário NF: ${pesoUnitarioXml.toFixed(3)}kg)`]);
            } catch (errDb) {
                console.warn("Tabela de histórico de compras não localizada, pulando registro histórico.");
            }

            itensProcessados++;
        }

        if (itensProcessados === 0) {
            await conn.rollback();
            return res.status(400).json({ 
                mensagem: `Nenhum produto da NF-e Nº ${numNota} possui código correspondente no seu cadastro de bandas.`,
                erros: errosItens 
            });
        }

        await conn.commit();

        res.json({
            mensagem: `NF-e Nº ${numNota} importada com sucesso! Quantidade calculada dinamicamente pelo peso do XML.`,
            avisos: errosItens.length > 0 ? errosItens : null
        });

    } catch (error) {
        await conn.rollback();
        console.error("Erro no processamento do XML:", error);
        res.status(500).json({ mensagem: 'Erro interno ao processar o arquivo XML da NF-e.' });
    } finally {
        conn.release();
    }
};