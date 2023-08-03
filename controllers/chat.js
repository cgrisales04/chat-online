const { response, request } = require("express");

const Chat = require("../models/chat");

const crearSala = async (de_param, para_param, mensajes_param) => {
  const { estado, data } = await buscarSala(de_param, para_param);

  //Si las personas nunca se han escrito, se crea un nuevo chat
  if (!estado) {
    const guardar_sala = await guardarSala(
      de_param,
      para_param,
      mensajes_param
    );
    return guardar_sala;
  }
  return ({ _id, de, para, mensajes } = data[0]);
};

const guardarMensajes = async (id, mensajes = []) => {
  const chat = await Chat.updateOne({ _id: id }, { $set: { mensajes } });
};

const guardarSala = async (de, para, mensajes) => {
  const chat = new Chat({
    de,
    para,
    mensajes,
  });
  await chat.save();
  return chat;
};

const buscarSala = async (de, para) => {
  return Chat.find({
    $or: [
      {
        de,
        para,
      },
      {
        de: para,
        para: de,
      },
    ],
  })
    .then((chat_encontrado) => {
      if (chat_encontrado.length <= 0) {
        return generarResponse(false, []);
      }
      return generarResponse(true, chat_encontrado);
    })
    .catch((error) => {
      return generarResponse(false, []);
    });
};

const buscarSalaPorUid = async (uid) => {
  const chat = await Chat.findById(uid);
  return chat;
};

const generarResponse = (estado = false, data = []) => {
  return { estado, data };
};

module.exports = {
  crearSala,
  guardarMensajes,
  buscarSalaPorUid,
};
