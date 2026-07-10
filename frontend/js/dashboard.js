const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

async function carregarDashboard() {
    try {
        // 1. Requisição nativa do painel do Dashboard principal
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            limparSessaoESair();
            return;
        }

        if (!response.ok) {
            const erro = await response.text();
            throw new Error(`Erro ao carregar dashboard: ${response.status} - ${erro}`);
        }

        const data = await response.json();

        // Insere os valores nativos recebidos
        document.getElementById('totalEstoque').textContent = data.totalEstoque || 0;
        document.getElementById('producoesHoje').textContent = data.producoesHoje || 0;
        document.getElementById('producoesMes').textContent = data.producoesMes || 0;

        const tbody = document.getElementById('ultimasProducoes');
        const producoes = data.ultimasProducoes || [];

        tbody.innerHTML = producoes.length
            ? producoes.map(p => `
                <tr>
                    <td>${new Date(p.criado_em).toLocaleString('pt-BR')}</td>
                    <td>${p.codigo}</td>
                    <td>${p.descricao}</td>
                    <td>${p.quantidade}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="4" class="text-center text-muted py-3">
                        Nenhuma produção encontrada
                    </td>
                </tr>
            `;

        // 2. Busca e processamento dinâmico dos Pneus Novos em estoque
        try {
            const resPneus = await fetch('/api/pneus-novos', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resPneus.ok) {
                const pneus = await resPneus.json();
                const somaEstoquePneus = pneus.reduce((acc, cur) => acc + parseInt(cur.quantidade_disponivel || 0), 0);
                document.getElementById('totalPneusNovos').textContent = somaEstoquePneus;
            }
        } catch (errPneus) {
            console.error('Erro ao somar estoque de pneus novos:', errPneus);
        }

        // 3. Busca e processamento dinâmico das Vendas de Pneus Novos no mês vigente
        try {
            const mesAtualYMD = new Date().toISOString().substring(0, 7); // Retorna "YYYY-MM"
            const resVendas = await fetch(`/api/vendas/relatorio?mes=${mesAtualYMD}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resVendas.ok) {
                const vendas = await resVendas.json();
                const somaVendasNovos = vendas.reduce((acc, cur) => acc + parseInt(cur.quantidade || 0), 0);
                document.getElementById('vendasPneusNovos').textContent = somaVendasNovos;
            }
        } catch (errVendas) {
            console.error('Erro ao somar vendas de pneus novos:', errVendas);
        }

    } catch (error) {
        console.error('Erro geral ao atualizar o dashboard:', error);
    }
}

function limparSessaoESair() {
    localStorage.removeItem('token');
    localStorage.removeItem('perfil');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

// Inicializa a carga de dados e cria o intervalo de atualização estável
carregarDashboard();
setInterval(carregarDashboard, 5000);

// Escopo global para a função logout chamada pela navbar
window.logout = function () {
    limparSessaoESair();
};