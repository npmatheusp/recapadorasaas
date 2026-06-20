const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const reservaController = require("../controllers/reservaController");

// ======================
// RESERVAS
// ======================
router.get("/", auth, reservaController.listar);
router.post("/", auth, reservaController.criar);
router.put("/:id/cancelar", auth, reservaController.cancelar);
router.put("/:id/editar", auth, reservaController.editar);

// ======================
// PRODUÇÃO
// ======================
router.get("/producao", auth, reservaController.listarProducao);

// REGISTRAR PRODUÇÃO (parcial)
router.post("/:id/producao", auth, reservaController.registrarProducao);

// HISTÓRICO PRODUÇÃO
router.get("/:id/producao", auth, reservaController.historicoProducao);

module.exports = router;