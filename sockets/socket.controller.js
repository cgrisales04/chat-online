const { Socket } = require("socket.io");
const { comprobarJWT } = require("../helpers");
const { ChatMensajes } = require("../models");
const {
  crearSala,
  buscarSalaPorUid,
  guardarMensajes,
} = require("../controllers/chat");
const { obtenerUsuario } = require("../controllers/usuarios");

const chatMensajes = new ChatMensajes();

const socketController = async (socket = new Socket(), io) => {
  const usuario = await comprobarJWT(socket.handshake.headers["x-token"]);
  if (!usuario) {
    return socket.disconnect();
  }

  //Agregar el usuario conectado
  chatMensajes.agregarUsuario(usuario);
  io.emit("usuarios-activos", chatMensajes.usuariosArr);
  socket.emit("recibir-mensajes", chatMensajes.ultimos10);

  // Seleccionar usuario
  socket.on("buscar-usuario", async ({ id }, callback) => {
    const usuario = await obtenerUsuario(id);
    callback(usuario);
  });

  //Creacion de conversación
  socket.on("crear-chat", async ({ de, para }, callback) => {
    const conversacion = await crearSala(de, para);
    callback(conversacion);
  });

  //Conectarlo a una sala
  socket.join(usuario.id);

  socket.on("disconnect", () => {
    chatMensajes.desconectarUsuario(usuario.id);
    io.emit("usuarios-activos", chatMensajes.usuariosArr);
  });

  socket.on(
    "enviar-mensaje",
    async ({ uid, de, mensaje, hora_envio, uid_conversacion }) => {
      if (uid) {
        let { mensajes } = await buscarSalaPorUid(uid_conversacion);

        mensajes.unshift({
          de,
          para: uid,
          hora_envio,
          mensaje,
        });
        mensajes = mensajes.slice(0, 10);

        await guardarMensajes(uid_conversacion, mensajes);

        //Mensaje privado
        socket
          .to(uid)
          .emit("mensaje-privado", { de: usuario.nombre, mensaje, hora_envio });
      } else {
        chatMensajes.enviarMensaje(usuario.id, usuario.nombre, mensaje);
        io.emit("recibir-mensajes", chatMensajes.ultimos10);
      }
    }
  );
};

module.exports = {
  socketController,
};
