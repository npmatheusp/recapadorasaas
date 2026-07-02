const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const compraController = require('../controllers/compraController');
const multer = require('multer');

// Configura o multer para receber o arquivo direto na memória do Node
const upload = multer({ storage: multer.memoryStorage() });

// Rota de importação protegida por login
router.post('/importar-xml', auth, upload.single('xmlNota'), compraController.importarXML);

module.exports = router;