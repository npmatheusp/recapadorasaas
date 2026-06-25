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

        if (!token) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        const resposta = await fetch(`${API}/bandas`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("perfil");
            localStorage.removeItem("usuario");
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

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

async function gerarPdfEstoque() {
    try {
        const token = getToken();

        if (!token) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        const resposta = await fetch(`${API}/bandas/pdf`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("perfil");
            localStorage.removeItem("usuario");
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        if (!resposta.ok) {
            let mensagem = "Erro ao gerar PDF";
            try {
                const erro = await resposta.json();
                mensagem = erro.mensagem || mensagem;
            } catch (_) {}
            throw new Error(mensagem);
        }

        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "estoque-bandas.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert(error.message || "Erro ao gerar PDF");
    }
}

async function salvarBanda() {
    const perfil = getPerfil();
    const token = getToken();

    if (perfil !== "ADMIN") {
        alert("Sem permissão");
        return;
    }

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
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

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("perfil");
            localStorage.removeItem("usuario");
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

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

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
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

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("perfil");
            localStorage.removeItem("usuario");
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        if (!resposta.ok) {
            alert(dados.mensagem || "Erro ao lançar entrada de estoque");
            return;
        }

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

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
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

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("perfil");
            localStorage.removeItem("usuario");
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        if (!resposta.ok) {
            alert(dados.mensagem || "Erro ao alterar status");
            return;
        }

        alert(dados.mensagem || "Status alterado com sucesso");
        carregarBandas();

    } catch (error) {
        console.error(error);
        alert("Erro ao alterar status");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const perfil = getPerfil();

    if (!perfil) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    if (perfil !== "ADMIN") {
        const form = document.getElementById("formCadastroBandas");
        if (form) form.style.display = "none";
    }

    carregarBandas();
});