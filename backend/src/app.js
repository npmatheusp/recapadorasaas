const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const testeRoutes = require('./routes/testeRoutes');
const bandaRoutes = require('./routes/bandaRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const producaoRoutes = require('./routes/producaoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// =========================
// CORS (CORRETO PARA PRODUÇÃO)
// =========================
app.use(cors({
    origin: 'https://recapadorasaas.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🔥 IMPORTANTE: garante preflight funcionando em todas rotas
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://recapadorasaas.onrender.com');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// =========================
// MIDDLEWARE
// =========================
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