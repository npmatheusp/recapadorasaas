async function login() {
    try {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value;

        if (!usuario || !senha) {
            alert('Informe usuário e senha.');
            return;
        }

        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario,
                senha
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.mensagem || 'Erro ao realizar login');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('perfil', data.usuario.perfil);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        localStorage.setItem('nome', data.usuario.nome || '');

        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro no login:', error);
        alert('Não foi possível conectar ao servidor.');
    }
}