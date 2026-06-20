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
| PERMISSÕES DE PÁGINAS
|--------------------------------------------------------------------------
*/

// ADMIN e VENDEDOR podem acessar estoque (bandas)
if (
    paginaAtual === "bandas.html" &&
    perfil !== "ADMIN" &&
    perfil !== "VENDEDOR"
) {
    window.location.href = "dashboard.html";
}

// Apenas ADMIN acessa reservas
if (
    paginaAtual === "reservas.html" &&
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

document.addEventListener("DOMContentLoaded", () => {

    const menuBandas =
        document.getElementById("menuBandas");

    const menuReservas =
        document.getElementById("menuReservas");

    const menuProducao =
        document.getElementById("menuProducao");

    /*
    |--------------------------------------------------------------------------
    | VENDEDOR
    |--------------------------------------------------------------------------
    | Vê apenas Dashboard + Estoque
    */
    if (perfil === "VENDEDOR") {

        if (menuReservas) {
            menuReservas.style.display = "none";
        }

        if (menuProducao) {
            menuProducao.style.display = "none";
        }

    }

    /*
    |--------------------------------------------------------------------------
    | PRODUÇÃO
    |--------------------------------------------------------------------------
    | Não vê Reservas nem cadastro de Bandas
    */
    if (perfil === "PRODUCAO") {

        if (menuBandas) {
            menuBandas.style.display = "none";
        }

        if (menuReservas) {
            menuReservas.style.display = "none";
        }

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