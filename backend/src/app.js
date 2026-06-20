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

app.use(cors());
app.use(express.json());

/**
 * FRONTEND ESTÁTICO
 * Serve os arquivos HTML/CSS/JS da pasta frontend
 */
app.use(express.static(path.join(__dirname, '../../frontend')));

/**
 * ROTAS DA API
 */
app.use('/api/auth', authRoutes);
app.use('/api/teste', testeRoutes);
app.use('/api/bandas', bandaRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/producao', producaoRoutes);

/**
 * ROTA DE STATUS DA API
 */
app.get('/api', (req, res) => {
    res.json({
        sistema: 'Recapadora SaaS',
        status: 'Online'
    });
});

/**
 * ROTA PRINCIPAL
 * Abre o login automaticamente
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

module.exports = app;