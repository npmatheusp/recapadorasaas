const token = localStorage.getItem('token');

// 🔥 ALTERE AQUI PARA O SEU BACKEND NO RENDER
const API_URL = 'https://SEU-BACKEND.onrender.com';

if (!token) {
    window.location.href = 'login.html';
}

async function carregarDashboard() {

    try {

        const response = await fetch(
            `${API_URL}/api/dashboard`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erro ao carregar dashboard');
        }

        const data = await response.json();

        document.getElementById('totalEstoque').textContent =
            data.totalEstoque || 0;

        document.getElementById('producoesHoje').innerText =
            data.producoesHoje || 0;

        document.getElementById('producoesMes').innerText =
            data.producoesMes || 0;

        const tbody =
            document.getElementById('ultimasProducoes');

        const producoes =
            data.ultimasProducoes || [];

        tbody.innerHTML = producoes.length
            ? producoes.map(p => `
                <tr>
                    <td>
                        ${new Date(p.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td>
                        ${p.codigo}
                    </td>
                    <td>
                        ${p.descricao}
                    </td>
                    <td>
                        ${p.quantidade}
                    </td>
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

// LOGOUT
window.logout = function () {

    localStorage.removeItem('token');
    localStorage.removeItem('perfil');
    localStorage.removeItem('usuario');

    window.location.href = 'login.html';
};