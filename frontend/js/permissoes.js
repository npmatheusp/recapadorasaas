const token = localStorage.getItem("token");
const perfil = localStorage.getItem("perfil");

if (!token) {
    window.location.href = "login.html";
}

const paginaAtual = window.location.pathname
    .split("/")
    .pop();

/*
|--------------------------------------------------------------------------
| PERMISSÕES DE PÁGINAS (Segurança de URL)
|--------------------------------------------------------------------------
*/

// ADMIN e VENDEDOR podem acessar estoque (bandas) e consulta de pneus novos
if (
    (paginaAtual === "bandas.html" || paginaAtual === "consulta-pneus.html") &&
    perfil !== "ADMIN" &&
    perfil !== "VENDEDOR"
) {
    window.location.href = "dashboard.html";
}

// Apenas ADMIN acessa reservas, compras, relatórios e gerenciamento de pneus
if (
    (paginaAtual === "reservas.html" || 
     paginaAtual === "compras.html" || 
     paginaAtual === "relatorio-vendas.html" || 
     paginaAtual === "gerenciar-pneus.html") &&
    perfil !== "ADMIN"
) {
    window.location.href = "dashboard.html";
}

// ADMIN e PRODUÇÃO acessam produção
if (
    paginaAtual === "producao.html" &&
    perfil !== "ADMIN" &&
    perfil !== "PRODUCAO"
) {
    window.location.href = "dashboard.html";
}

/*
|--------------------------------------------------------------------------
| CONTROLE VISUAL DOS MENUS (Esconder Botões)
|--------------------------------------------------------------------------
*/
document.addEventListener("DOMContentLoaded", () => {

    const menuBandas = document.getElementById("menuBandas");
    const menuConsultaPneus = document.getElementById("menuConsultaPneus");
    const menuReservas = document.getElementById("menuReservas");
    const menuProducao = document.getElementById("menuProducao");
    const menuCompras = document.getElementById("menuCompras");
    const menuRelatorio = document.getElementById("menuRelatorio");
    const menuGerenciarPneus = document.getElementById("menuGerenciarPneus");

    /*
    |--------------------------------------------------------------------------
    | VENDEDOR
    |--------------------------------------------------------------------------
    | Vê apenas Dashboard + Estoque Borracha + Estoque Pneus Novos
    */
    if (perfil === "VENDEDOR") {

        if (menuReservas) menuReservas.style.display = "none";
        if (menuProducao) menuProducao.style.display = "none";
        if (menuCompras) menuCompras.style.display = "none";
        if (menuRelatorio) menuRelatorio.style.display = "none";
        if (menuGerenciarPneus) menuGerenciarPneus.style.display = "none";

    }

    /*
    |--------------------------------------------------------------------------
    | PRODUÇÃO
    |--------------------------------------------------------------------------
    | Não vê Reservas, Compras, Relatórios, Gerenciamento nem Estoques
    */
    if (perfil === "PRODUCAO") {

        if (menuBandas) menuBandas.style.display = "none";
        if (menuConsultaPneus) menuConsultaPneus.style.display = "none";
        if (menuReservas) menuReservas.style.display = "none";
        if (menuCompras) menuCompras.style.display = "none";
        if (menuRelatorio) menuRelatorio.style.display = "none";
        if (menuGerenciarPneus) menuGerenciarPneus.style.display = "none";

    }

});

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/
window.logout = function () {

    localStorage.removeItem("token");
    localStorage.removeItem("perfil");
    localStorage.removeItem("nome");

    window.location.href = "login.html";

};