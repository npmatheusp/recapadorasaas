function getToken() {
    return localStorage.getItem('token');
}

function validarSessao() {
    const token = getToken();
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    validarSessao();

    const formXml = document.getElementById('formImportarXml');
    if (formXml) {
        formXml.addEventListener('submit', enviarXML);
    }
});

async function enviarXML(e) {
    e.preventDefault();

    const fileInput = document.getElementById('xmlNota');
    if (!fileInput.files.length) {
        alert('Por favor, selecione um arquivo XML.');
        return;
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Processando Nota...';

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append('xmlNota', fileInput.files[0]);

        // 🔥 Certifique-se de que a variável global ${API} está definida no seu config.js
        const response = await fetch(`${API}/compras/importar-xml`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const resultado = await response.json();

        if (!response.ok) {
            let msg = resultado.mensagem || 'Erro ao importar nota.';
            if (resultado.erros) {
                msg += '\n\nDetalhes:\n' + resultado.erros.join('\n');
            }
            alert(msg);
            return;
        }

        let msgSucesso = resultado.mensagem;
        if (resultado.avisos) {
            msgSucesso += '\n\n⚠️ Atenção com alguns itens não importados:\n' + resultado.avisos.join('\n');
        }

        alert(msgSucesso);
        formXml.reset();

    } catch (error) {
        console.error(error);
        alert('Erro de conexão ao enviar o XML.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Importar XML da Nota';
    }
}

function sairSistema() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}