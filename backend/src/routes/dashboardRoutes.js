const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/', auth, dashboardController.resumo);

module.exports = router;