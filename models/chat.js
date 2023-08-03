const { Schema, model } = require("mongoose");

const ChatSchema = Schema({
  de: {
    type: Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  para: {
    type: Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  mensajes: {
    type: Array,
    default: [],
  },
});

module.exports = model("Chat", ChatSchema);
