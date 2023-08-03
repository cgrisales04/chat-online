const { Router } = require("express");

const { buscarSala,crearSala } = require("../controllers/chat");

const router = Router();

router.get("/", crearSala);

module.exports = router;
