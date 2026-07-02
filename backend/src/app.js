const express = require('express');
const cors = require('cors');
const path = require('path');

// =========================
// ROTAS IMPORTADAS
// =========================
const authRoutes = require('./routes/authRoutes');
const testeRoutes = require('./routes/testeRoutes');
const bandaRoutes = require('./routes/bandaRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const producaoRoutes = require('./routes/producaoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const compraRoutes = require('./routes/compraRoutes'); // 🔥 NOVA ROTA DE XML DE COMPRAS

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// ROTAS DA API
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/teste', testeRoutes);
app.use('/api/bandas', bandaRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/producao', producaoRoutes);
app.use('/api/compras', compraRoutes); // 🔥 ENDPOINT PARA IMPORTAÇÃO DE XML

// =========================
// STATUS DA API
// =========================
app.get('/api/status', (req, res) => {
    res.json({
        sistema: 'Recapadora SaaS',
        status: 'Online'
    });
});

// =========================
// FRONTEND ESTÁTICO
// =========================
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// =========================
// ROTA PRINCIPAL
// =========================
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

module.exports = app;