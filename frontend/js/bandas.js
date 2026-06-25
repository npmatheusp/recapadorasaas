/**
 * Sessão segura
 */
function getToken() {
    return localStorage.getItem("token");
}

function getPerfil() {
    return localStorage.getItem("perfil");
}

let bandasCache = [];

async function carregarBandas() {
    try {
        const token = getToken();

        const resposta = await fetch(`${API}/bandas`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error("ERRO API:", dados);
            alert(dados.mensagem || "Erro ao carregar bandas");
            return;
        }

        bandasCache = dados;
        renderizarTabela(dados);

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar bandas");
    }
}

function renderizarTabela(bandas) {
    const tabela = document.getElementById("tabelaBandas");
    const perfil = getPerfil();

    if (!tabela) return;

    tabela.innerHTML = "";

    bandas.forEach(banda => {
        let botoes = "";

        if (perfil === "ADMIN") {
            botoes = `
                <button class="btn btn-sm btn-info mb-1 w-100"
                    onclick="entradaEstoque(${banda.id})">
                    ➕ Entrada
                </button>

                <button class="btn btn-sm w-100 ${banda.ativo ? 'btn-warning' : 'btn-success'}"
                    onclick="alterarStatus(${banda.id})">
                    ${banda.ativo ? 'Desativar' : 'Ativar'}
                </button>
            `;
        } else {
            botoes = `<span class="text-muted">Somente consulta</span>`;
        }

        const corEstoque =
            Number(banda.estoque_total) <= 0
                ? 'bg-danger'
                : 'bg-primary';

        tabela.innerHTML += `
            <tr>
                <td><strong>${banda.codigo}</strong></td>
                <td>${banda.descricao || ""}</td>
                <td>
                    <span class="badge ${corEstoque}">
                        ${banda.estoque_total}
                    </span>
                </td>
                <td>${banda.estoque_minimo}</td>
                <td>
                    <span class="badge ${banda.ativo ? 'bg-success' : 'bg-secondary'}">
                        ${banda.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>${botoes}</td>
            </tr>
        `;
    });
}

function filtrarBandas() {
    const termo = document.getElementById("filtroBanda").value.toLowerCase();

    const filtradas = bandasCache.filter(b => {
        return (
            (b.codigo || "").toLowerCase().includes(termo) ||
            (b.descricao || "").toLowerCase().includes(termo)
        );
    });

    renderizarTabela(filtradas);
}

function gerarPdfEstoque() {
    window.open('/api/bandas/pdf', '_blank');
}

async function salvarBanda() {
    const perfil = getPerfil();
    const token = getToken();

    if (perfil !== "ADMIN") {
        alert("Sem permissão");
        return;
    }

    try {
        const codigo = document.getElementById("codigo").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const estoque_total = Number(document.getElementById("estoque_total").value || 0);
        const estoque_minimo = Number(document.getElementById("estoque_minimo").value || 0);

        const resposta = await fetch(`${API}/bandas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                codigo,
                descricao,
                estoque_total,
                estoque_minimo
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem || "Erro ao salvar banda");
            return;
        }

        alert(dados.mensagem || "Banda salva com sucesso");
        document.getElementById("codigo").value = "";
        document.getElementById("descricao").value = "";
        document.getElementById("estoque_total").value = "";
        document.getElementById("estoque_minimo").value = "";

        carregarBandas();

    } catch (error) {
        console.error(error);
        alert("Erro ao salvar banda");
    }
}

async function entradaEstoque(id) {
    const perfil = getPerfil();
    const token = getToken();

    if (perfil !== "ADMIN") {
        alert("Sem permissão");
        return;
    }

    const quantidade = prompt("Quantidade:");
    if (!quantidade || Number(quantidade) <= 0) return;

    const observacao = prompt("Observação:", "Entrada estoque");

    try {
        const resposta = await fetch(`${API}/bandas/${id}/entrada`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                quantidade,
                observacao
            })
        });

        const dados = await resposta.json();
        alert(dados.mensagem || "Entrada registrada");

        carregarBandas();

    } catch (error) {
        console.error(error);
        alert("Erro ao lançar entrada de estoque");
    }
}

async function alterarStatus(id) {
    const perfil = getPerfil();
    const token = getToken();

    if (perfil !== "ADMIN") {
        alert("Sem permissão");
        return;
    }

    try {
        const resposta = await fetch(`${API}/bandas/${id}/status`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await resposta.json();
        alert(dados.mensagem || "Status alterado com sucesso");

        carregarBandas();

    } catch (error) {
        console.error(error);
        alert("Erro ao alterar status");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const perfil = getPerfil();

    if (perfil !== "ADMIN") {
        const form = document.getElementById("formCadastroBandas");
        if (form) form.style.display = "none";
    }

    carregarBandas();
});

