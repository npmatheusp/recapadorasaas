const token = localStorage.getItem('token');


if (!token) {
window.location.href = 'login.html';
}

async function carregarDashboard() {


try {

    const response = await fetch(
        'http://192.168.15.9:3000/api/dashboard',
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
                    ${new Date(
                        p.criado_em
                    ).toLocaleString('pt-BR')}
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

                <td colspan="4"
                    class="text-center">

                    Nenhuma produção encontrada

                </td>

            </tr>

        `;

} catch (error) {

    console.error(
        'Erro ao carregar dashboard:',
        error
    );

}


}

carregarDashboard();

setInterval(
carregarDashboard,
5000
);

window.logout = function () {


localStorage.removeItem('token');
localStorage.removeItem('perfil');
localStorage.removeItem('usuario');

window.location.href =
    'login.html';


};
