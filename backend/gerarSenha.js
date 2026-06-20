const bcrypt = require('bcryptjs');

async function gerar() {
    const senha = await bcrypt.hash('123456', 10);
    console.log(senha);
}

gerar();