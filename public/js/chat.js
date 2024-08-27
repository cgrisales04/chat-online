const url = window.location.hostname.includes("localhost")
  ? "http://localhost:8080/api/auth"
  : "https://chat-online-68pm.onrender.com/api/auth";

let usuario = null;
let socket = null;

let usuario_privado = {
  correo: "",
  estado: false,
  google: false,
  nombre: "",
  rol: "",
  uid: "",
};

let conversacion_activa = {
  _id: "",
  de: "",
  para: "",
  mensajes: [],
};

//Referencias HTML
const txtMensaje = document.getElementById("txtMensaje");
const lista_contactos = document.getElementById("lista_contactos");
const ulMensajes = document.getElementById("ulMensajes");
const btnSalir = document.getElementById("btnSalir");

//Elementos del login
const imagen_login = document.getElementById("imagen_login");
const nombre_login = document.getElementById("nombre_login");

//Elementos del chat privado
const emojis = document.getElementById("emojis");
const emojis_content = document.getElementById("emojis_content");
const icon_send = document.getElementById("icon-send");
const btn_cerrar_chat = document.getElementById("btn_cerrar_chat");
const nombre_msg_privado = document.getElementById("nombre-msg-privado");
const img_msg_privado = document.getElementById("img-msg-privado");
const chat_privado = document.getElementById("chat-privado");
const conversacion_privada = document.getElementById("conversacion-privada");

const chat_home = document.getElementById("chat-home");
const content_chat_home = document.getElementById("content-chat-home");

let emojis_bandera = false;

const pickerOptions = {
  onEmojiSelect: (emoji) => {
    txtMensaje.value += emoji.native;
    txtMensaje.focus();
  },
  locale: "es",
  set: "twitter",
};
const emojiPicker = new EmojiMart.Picker(pickerOptions);

emojis.addEventListener("click", () => {
  emojis_bandera = !emojis_bandera;
  emojis_bandera
    ? emojis_content.append(emojiPicker)
    : (emojis_content.innerHTML = "");
  txtMensaje.focus();
});

document.addEventListener("click", (event) => {
  if (
    !emojis_content.contains(event.target) &&
    event.target !== emojis_content &&
    event.target !== emojis
  ) {
    emojis_content.innerHTML = "";
    emojis_bandera = false;
  }
});

//Validar Token LocalStorage
const validarJWT = async () => {
  const token = localStorage.getItem("token") || "";
  if (token.length <= 10) {
    window.location = "index.html";
    throw new Error("No hay token en el servidor");
  }
  const resp = await fetch(url, {
    headers: { "x-token": token },
  });
  const { usuario: userDB, token: tokenDB } = await resp.json();
  imagen_login.src = validarImagen(userDB.img);
  nombre_login.innerText = userDB.nombre;
  localStorage.setItem("token", tokenDB);
  usuario = userDB;
  document.title = usuario.nombre;
  content_chat_home.innerHTML = renderInicioChat();
  await conectarSocket();
};

const conectarSocket = async () => {
  const socket = io({
    extraHeaders: {
      "x-token": localStorage.getItem("token"),
    },
  });

  socket.on("connect", () => {
    console.log("Socket Online");
  });

  socket.on("disconnect", () => {
    console.log("Socket Disconnect");
  });

  socket.on("usuarios-activos", async (payload) => {
    await renderUsuarios(payload);

    Array.from(document.getElementsByClassName("contacto")).forEach((el) => {
      el.addEventListener("click", async () => {
        try {
          await new Promise((resolve) => {
            socket.emit("buscar-usuario", { id: el.dataset.id }, (usuario) => {
              renderChatPrivado(usuario);
              resolve();
            });
          });
          socket.emit(
            "crear-chat",
            { de: usuario.uid, para: el.dataset.id },
            (nuevo_chat) => {
              conversacion_activa = nuevo_chat;
              conversacion_privada.dataset.id = conversacion_activa._id;
              renderizarConversacionAntigua();
            }
          );
        } catch (error) {
          console.error("Hubo un error en la secuencia de eventos:", error);
        }
      });
    });
  });

  socket.on("mensaje-privado", ({uid_conversacion, de, mensaje, hora_envio }) => {
    Toast.fire({
      icon: "success",
      title: `${de} Te ha enviado un mensaje...`,
    });
    if (uid_conversacion == conversacion_activa._id) {
      renderMensajeRecibido(mensaje, hora_envio);
      conversacion_privada.scrollTop = conversacion_privada.scrollHeight;
    }
  });

  const enviar_mensaje = (mensaje = "") => {
    if (mensaje.length === 0) {
      Toast.fire({
        icon: "warning",
        title: `El mensaje no puede ir vacío.`,
      });
      return;
    }
    const { uid } = usuario_privado;
    const hora_envio = calcularHoraToAmPm();
    renderMensajeEnviado(mensaje, hora_envio);
    conversacion_privada.scrollTop = conversacion_privada.scrollHeight;

    socket.emit("enviar-mensaje", {
      de: usuario.uid,
      mensaje,
      hora_envio,
      uid,
      uid_conversacion: conversacion_activa._id,
    });
    txtMensaje.value = "";
  };

  /**
   * Cada que se presione ENTER se envia el mensaje
   */
  txtMensaje.addEventListener("keyup", ({ keyCode }) => {
    if (keyCode !== 13) return;
    const mensaje = txtMensaje.value;
    enviar_mensaje(mensaje);
  });

  icon_send.addEventListener("click", () => {
    const mensaje = txtMensaje.value;
    enviar_mensaje(mensaje);
  });
};

/**
 * Funcion que renderiza concatenando el mensaje recibido
 * @param {String} mensaje Mensaje enviado
 * @param {String} hora_envio Hora con formato AM/PM
 */
const renderMensajeRecibido = (mensaje = "", hora_envio) => {
  conversacion_privada.innerHTML += `
    <div class="d-flex mb-3 pe-3 ps-3">
        <div class="mensaje mensaje-izquierdo d-flex flex-column m-0">
            <span class="text-black">${mensaje}</span>
            <span class="text-end hora-envio text-black">${hora_envio}</span>
        </div>
    </div>
    `;
};

/**
 * Funcion que renderiza concatenando el mensaje enviado
 * @param {String} mensaje Mensaje enviado
 * @param {String} hora_envio Hora con formato AM/PM
 */
const renderMensajeEnviado = (mensaje = "", hora_envio) => {
  conversacion_privada.innerHTML += `
  <div class="d-flex justify-content-end mb-3 pe-3 ps-3">
    <div class="mensaje mensaje-derecha d-flex flex-column m-0">
        <span class="text-white">${mensaje}</span>
        <span class="text-white text-end hora-envio text-grey">${hora_envio}</span>
    </div>
  </div>
  `;
};

/**
 * Se renderiza la conversacion antigua
 * @param {Array} conversacion Conversacion antigua de 10 mensajes
 */
const renderizarConversacionAntigua = () => {
  conversacion_activa.mensajes
    .reverse()
    .forEach(({ mensaje, hora_envio, de }) => {
      if (de == usuario.uid) {
        renderMensajeEnviado(mensaje, hora_envio);
      } else {
        renderMensajeRecibido(mensaje, hora_envio);
      }
      conversacion_privada.scrollTop = conversacion_privada.scrollHeight;
    });
};

const cerrar_chat = () => {
  chat_privado.style.display = "none";
  chat_home.style.display = "";
  conversacion_privada.innerHTML = "";
  conversacion_privada.setAttribute("data-id", "");
  conversacion_activa = {};
  emojis_content.innerHTML = "";
};

btn_cerrar_chat.addEventListener("click", cerrar_chat);

/**
 * ESC - Para cerrar el chat
 */
document.addEventListener("keyup", ({ keyCode }) => {
  if (keyCode !== 27) return;
  cerrar_chat();
});

/**
 * Funcion que maqueta la bienvenida al usuario logueado
 * @returns Estructura de bienvenida al usuario
 */
const renderInicioChat = () => {
  const { img, nombre } = usuario;
  return `
    <h1 class="text-white" id="nombre">${nombre}</h1>
    <img src="${validarImagen(
      img
    )}" referrerpolicy="no-referrer" alt="" class="m-0 mb-3 mt-3" width="120">
    <p class="text-grey instrucciones">
      Encantado de tenerte por aquí ${nombre}, si deseas
      interactuar con alguien en linea selecciona un chat para iniciar una nueva conversación...
    </p>`;
};

/**
 * Funcion renderisa todo el chat privado
 * @param {usuario_privado} usuario Usuario seleccionado de la lista
 */
const renderChatPrivado = (usuario = usuario_privado) => {
  usuario_privado = usuario;

  chat_privado.style.display = "";
  chat_home.style.display = "none";
  conversacion_privada.innerHTML = "";

  txtMensaje.placeholder = `Escribe un mensaje para ${usuario_privado.nombre}...`;

  nombre_msg_privado.innerText = usuario_privado.nombre;
  img_msg_privado.src = validarImagen(usuario_privado.img);
};

/**
 * Renderisa los usuarios en la lista de contactos
 * @param {Array} usuarios Lista de usuarios
 */
const renderUsuarios = async (usuarios = []) => {
  let usersHtml = "";
  usuarios.forEach(({ nombre, uid, img }) => {
    usersHtml += `
        <div class="d-flex mt-2 me-2 mb-3 contacto" data-id="${uid}">
            <div class="position-relative">
                <img referrerpolicy="no-referrer" src="${validarImagen(
                  img
                )}" alt="" width="40" class="m-0">
                <span
                    class="position-absolute translate-middle p-1 bg-success border border-light rounded-circle">
                </span>
            </div>
            <div class="d-flex flex-column ms-3">
                <h6 class="m-0 font-title">${nombre}</h6>
                <p class="m-0 text-grey">En linea</p>
            </div>
        </div>
    `;
  });
  lista_contactos.innerHTML = usersHtml;
};

/**
 * Valida que si haya una imagen  y asigna una por defecto en caso de que
 * sea vacio
 * @param {String} img Ruta de imagen
 * @returns Si la imagen existe retorna la imagen sino retorna una imagen general
 */
const validarImagen = (img = "img/user_icon-icons.com_66546.svg") => img;

/**
 *
 * @param {Date} date Fecha
 * @returns La hora con el formato AM/PM
 */
const calcularHoraToAmPm = (date = new Date()) => {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return hours + ":" + minutes + " " + ampm;
};

/**
 * Si se presiona el boton de salir, borra el token y recarga la pagina
 */
btnSalir.onclick = async () => {
  console.log("consent revoked");
  localStorage.clear();
  location.reload();
};

const main = async () => {
  await validarJWT();
};

main();
