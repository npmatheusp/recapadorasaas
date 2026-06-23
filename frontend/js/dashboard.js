const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

async function carregarDashboard() {
    try {
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('perfil');
            localStorage.removeItem('usuario');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            const erro = await response.text();
            throw new Error(`Erro ao carregar dashboard: ${response.status} - ${erro}`);
        }

        const data = await response.json();

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
                    <td colspan="4" class="text-center">
                        Nenhuma produção encontrada
                    </td>
                </tr>
            `;

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

carregarDashboard();
setInterval(carregarDashboard, 5000);

window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('perfil');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
};