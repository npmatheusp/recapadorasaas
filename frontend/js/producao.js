const API = "/api";

let bandasCache = [];

document.addEventListener('DOMContentLoaded', () => {
    validarSessao();
    carregarBandas();
    carregarHistorico();

    const form = document.getElementById('formProducao');
    if (form) {
        form.addEventListener('submit', registrarProducao);
    }
});

// =========================
// SESSÃO
// =========================
function getToken() {
    return localStorage.getItem('token');
}

function getUsuario() {
    try {
        const data = localStorage.getItem('usuario');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function validarSessao() {
    const token = getToken();

    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        window.location.href = 'login.html';
    }
}

// =========================
// CARREGAR BANDAS
// =========================
async function carregarBandas() {
    try {
        const token = getToken();

        const response = await fetch(`${API}/producao/bandas`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bandas = await response.json();

        if (!response.ok) {
            alert(bandas.mensagem || 'Erro ao carregar bandas');
            return;
        }

        bandasCache = bandas;
        configurarBuscaBandas();

    } catch (error) {
        console.error(error);
        alert('Erro ao carregar bandas');
    }
}

// =========================
// BUSCA DE BANDAS
// =========================
function configurarBuscaBandas() {
    const campoBusca = document.getElementById('bandaBusca');
    const resultado = document.getElementById('resultadoBandas');

    if (!campoBusca || !resultado) return;

    campoBusca.addEventListener('input', () => {
        const termo = campoBusca.value.toLowerCase().trim();

        // limpa seleção anterior se o usuário começar a digitar novamente
        document.getElementById('banda').value = '';

        if (!termo) {
            resultado.style.display = 'none';
            resultado.innerHTML = '';
            return;
        }

        const filtradas = bandasCache.filter(banda =>
            (banda.codigo || '').toLowerCase().includes(termo) ||
            (banda.descricao || '').toLowerCase().includes(termo)
        );

        renderizarResultadosBandas(filtradas);
    });

    document.addEventListener('click', (e) => {
        if (
            !campoBusca.contains(e.target) &&
            !resultado.contains(e.target)
        ) {
            resultado.style.display = 'none';
        }
    });
}

function renderizarResultadosBandas(bandas) {
    const resultado = document.getElementById('resultadoBandas');

    if (!resultado) return;

    if (!bandas.length) {
        resultado.innerHTML = `
            <div class="item-banda text-muted">
                Nenhuma banda encontrada
            </div>
        `;
        resultado.style.display = 'block';
        return;
    }

    resultado.innerHTML = '';

    bandas.forEach(banda => {
        resultado.innerHTML += `
            <div
                class="item-banda"
                onclick="selecionarBanda(${banda.id})"
            >
                <div class="banda-codigo">
                    ${banda.codigo}
                </div>

                <div class="banda-descricao">
                    ${banda.descricao || ''}
                </div>

                <div class="banda-estoque">
                    Estoque: ${banda.estoque_total}
                </div>
            </div>
        `;
    });

    resultado.style.display = 'block';
}

function selecionarBanda(id) {
    const banda = bandasCache.find(b => b.id === id);
    if (!banda) return;

    document.getElementById('bandaBusca').value =
        `${banda.codigo} - ${banda.descricao || ''}`;

    document.getElementById('banda').value = banda.id;

    const resultado = document.getElementById('resultadoBandas');
    if (resultado) {
        resultado.style.display = 'none';
        resultado.innerHTML = '';
    }
}

// =========================
// CARREGAR HISTÓRICO
// =========================
async function carregarHistorico() {
    try {
        const token = getToken();

        const response = await fetch(`${API}/producao/historico`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const historico = await response.json();

        if (!response.ok) {
            alert(historico.mensagem || 'Erro ao carregar histórico');
            return;
        }

        const tabela = document.getElementById('tabelaHistorico');
        if (!tabela) return;

        tabela.innerHTML = '';

        if (!historico.length) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        Nenhum registro encontrado
                    </td>
                </tr>
            `;
            return;
        }

        historico.forEach(item => {
            tabela.innerHTML += `
                <tr>
                    <td>${new Date(item.criado_em).toLocaleString('pt-BR')}</td>
                    <td>${item.codigo}</td>
                    <td>${item.descricao || ''}</td>
                    <td>${item.quantidade}</td>
                    <td>${item.observacao || ''}</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        alert('Erro ao carregar histórico');
    }
}

// =========================
// REGISTRAR PRODUÇÃO
// =========================
async function registrarProducao(e) {
    e.preventDefault();

    try {
        const token = getToken();

        if (!token) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return;
        }

        const bandaId = document.getElementById('banda').value;
        const quantidade = Number(document.getElementById('quantidade').value);
        const observacao = document.getElementById('observacao').value.trim();

        if (!bandaId) {
            alert('Selecione uma banda na busca.');
            return;
        }

        if (!quantidade || quantidade <= 0) {
            alert('Quantidade inválida.');
            return;
        }

        const body = {
            banda_id: bandaId,
            quantidade,
            observacao
        };

        const response = await fetch(`${API}/producao`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const resultado = await response.json();

        if (!response.ok) {
            alert(resultado.mensagem || 'Erro ao registrar produção');
            return;
        }

        alert(resultado.mensagem || 'Produção registrada com sucesso');

        document.getElementById('formProducao').reset();
        document.getElementById('banda').value = '';

        const resultadoBandas = document.getElementById('resultadoBandas');
        if (resultadoBandas) {
            resultadoBandas.innerHTML = '';
            resultadoBandas.style.display = 'none';
        }

        await carregarBandas();
        await carregarHistorico();

    } catch (error) {
        console.error(error);
        alert('Erro ao registrar produção');
    }
}

// =========================
// NAVEGAÇÃO
// =========================
function voltarDashboard() {
    window.location.href = 'dashboard.html';
}

function sairSistema() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('perfil');
        localStorage.removeItem('nome');

        window.location.href = 'login.html';
    }
}