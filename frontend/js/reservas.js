const API = "http://192.168.15.9:3000/api";
const token = localStorage.getItem("token");

// =========================
// CARREGAR BANDAS
// =========================
async function carregarBandas() {
    try {

        const resposta = await fetch(`${API}/bandas/disponibilidade`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const bandas = await resposta.json();

        const select = document.getElementById("banda");

        select.innerHTML = '<option value="">Selecione uma banda...</option>';

        bandas.forEach((banda) => {
            select.innerHTML += `
                <option value="${banda.id}">
                    ${banda.codigo} | Disponível: ${banda.disponivel}
                </option>
            `;
        });

        if ($("#banda").hasClass("select2-hidden-accessible")) {
            $("#banda").select2("destroy");
        }

        $("#banda").select2({
            placeholder: "Digite código da banda...",
            allowClear: true,
            width: "100%"
        });

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar bandas");
    }
}

// =========================
// CRIAR RESERVA
// =========================
async function criarReserva() {
try {


    const cliente = document.getElementById("cliente").value.trim();
    const banda_id = document.getElementById("banda").value;
    const quantidade = document.getElementById("quantidade").value;

    if (!cliente || !banda_id || !quantidade) {
        alert("Preencha todos os campos");
        return;
    }

    const resposta = await fetch(`${API}/reservas`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            cliente,
            banda_id,
            quantidade
        })
    });

    const dados = await resposta.json();

    // SE DEU ERRO, MOSTRA MENSAGEM E NÃO LIMPA A TELA
    if (!resposta.ok) {
        alert(dados.mensagem || "Erro ao criar reserva");
        return;
    }

    // SUCESSO
    alert(dados.mensagem || "Reserva criada");

    document.getElementById("cliente").value = "";
    document.getElementById("quantidade").value = "";

    $("#banda").val(null).trigger("change");

    carregarBandas();
    carregarReservas();

} catch (error) {

    console.error(error);
    alert("Erro ao criar reserva");

}


}


// =========================
// LISTAR RESERVAS (COM CANCELAR + EDITAR)
// =========================
async function carregarReservas() {
    try {

        const resposta = await fetch(`${API}/reservas`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const reservas = await resposta.json();

        const tabela = document.getElementById("tabelaReservas");

        tabela.innerHTML = "";

        reservas.forEach((r) => {

            let badge = "bg-danger";

            if (r.status === "RESERVADO") badge = "bg-warning text-dark";
            if (r.status === "CONCLUIDO") badge = "bg-success";
            if (r.status === "CANCELADO") badge = "bg-secondary";

            tabela.innerHTML += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.cliente}</td>
                    <td>
                        <span class="badge ${badge}">
                            ${r.status}
                        </span>
                    </td>

                    <td>

                        ${r.status === "RESERVADO" ? `
                            
                            <button class="btn btn-sm btn-danger mb-1 w-100"
                                onclick="cancelar(${r.id})">
                                Cancelar
                            </button>

                            <button class="btn btn-sm btn-primary w-100"
                                onclick="editar(${r.id}, '${r.cliente}', ${r.quantidade || 1})">
                                Alterar
                            </button>

                        ` : "-"}

                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar reservas");
    }
}

// =========================
// CANCELAR RESERVA
// =========================
async function cancelar(id) {
    try {

        if (!confirm("Deseja cancelar?")) return;

        const resposta = await fetch(`${API}/reservas/${id}/cancelar`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        alert(dados.mensagem);

        carregarReservas();
        carregarBandas();

    } catch (error) {
        console.error(error);
        alert("Erro ao cancelar");
    }
}

// =========================
// EDITAR RESERVA (NOVO)
// =========================
async function editar(id, clienteAtual, quantidadeAtual) {

    const novoCliente = prompt("Cliente:", clienteAtual);
    const novaQtd = prompt("Quantidade:", quantidadeAtual);

    if (!novoCliente || !novaQtd) return;

    try {

        const resposta = await fetch(`${API}/reservas/${id}/editar`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                cliente: novoCliente,
                quantidade: Number(novaQtd)
            })
        });

        const dados = await resposta.json();

        alert(dados.mensagem || "Atualizado");

        carregarReservas();

    } catch (error) {
        console.error(error);
        alert("Erro ao editar reserva");
    }
}

// =========================
// INIT
// =========================
carregarBandas();
carregarReservas();