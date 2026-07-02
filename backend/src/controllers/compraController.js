const pool = require('../config/database');
const xml2js = require('xml2js');

exports.importarXML = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensagem: 'Nenhum arquivo XML foi enviado.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Converte o buffer do XML para string texturizada
        const xmlString = req.file.buffer.toString('utf-8');
        
        // Converte XML em Objeto limpo
        const parser = new xml2js.Parser({ explicitArray: false });
        const resultado = await parser.parseStringPromise(xmlString);

        // 🎯 Mapeamento exato baseado na estrutura real do seu nfeProc
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

        const numNota = infNFe.ide.nNF; // Número da Nota (Ex: 3964)
        const itensNota = infNFe.det;   // Itens da nota (<det>)

        // Força virar Array mesmo se a nota viesse com apenas 1 item
        const listaItens = Array.isArray(itensNota) ? itensNota : [itensNota];
        
        let itensProcessados = 0;
        let errosItens = [];

        for (const item of listaItens) {
            const produto = item.prod;
            const cProd = produto.cProd.trim(); // Código do produto (Ex: "457259")
            const xProd = produto.xProd;        // Descrição (Ex: "PRE-MOLDADO MARANGONI...")
            const qCom = Number(produto.qCom);   // Quantidade comprada (Ex: 67.01)

            // 🔍 Busca a banda no seu banco onde o código do cadastro seja igual ao cProd da nota
            const [[banda]] = await conn.execute(`
                SELECT id, estoque_total FROM bandas WHERE codigo = ?
            `, [cProd]);

            if (!banda) {
                errosItens.push(`Código [${cProd}] - ${xProd.substring(0, 30)}... não localizado no sistema.`);
                continue; 
            }

            // 🆙 Atualiza o estoque somando o peso/quantidade que veio na nota
            await conn.execute(`
                UPDATE bandas 
                SET estoque_total = estoque_total + ? 
                WHERE id = ?
            `, [qCom, banda.id]);

            // 📝 Registra no histórico de entradas/produção com o número correto da nota
            await conn.execute(`
                INSERT INTO producao (banda_id, usuario_id, quantidade, observacao)
                VALUES (?, ?, ?, ?)
            `, [banda.id, req.usuario.id, qCom, `Entrada via NF-e Nº ${numNota}`]);

            itensProcessados++;
        }

        // Se nenhum item bateu com o estoque do seu banco, cancela a transação inteira
        if (itensProcessados === 0) {
            await conn.rollback();
            return res.status(400).json({ 
                mensagem: `Nenhum produto da NF-e Nº ${numNota} possui código correspondente no seu cadastro de bandas.`,
                erros: errosItens 
            });
        }

        await conn.commit();

        res.json({
            mensagem: `NF-e Nº ${numNota} importada com sucesso! ${itensProcessados} itens foram adicionados ao estoque.`,
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