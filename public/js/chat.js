const url = "http://localhost:8080/api/auth";

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

//Referencias HTML
const txtMensaje = document.getElementById("txtMensaje");
const lista_contactos = document.getElementById("lista_contactos");
const ulMensajes = document.getElementById("ulMensajes");
const btnSalir = document.getElementById("btnSalir");

//Elementos del login
const imagen_login = document.getElementById("imagen_login");
const nombre_login = document.getElementById("nombre_login");

//Elementos del chat privado
const nombre_msg_privado = document.getElementById("nombre-msg-privado");
const img_msg_privado = document.getElementById("img-msg-privado");
const chat_privado = document.getElementById("chat-privado");
const conversacion_privada = document.getElementById("conversacion-privada");

const chat_home = document.getElementById("chat-home");
const content_chat_home = document.getElementById("content-chat-home");

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
      el.addEventListener("click", () => {
        console.log(el.dataset.id);
        socket.emit("buscar-usuario", { id: el.dataset.id }, (usuario) => {
          console.log(usuario);
          renderChatPrivado(usuario);
        });
      });
    });
  });

  socket.on("mensaje-privado", ({de, mensaje, hora_envio}) => {
    conversacion_privada.innerHTML += `
    <div class="d-flex mb-3 pe-3 ps-3">
        <div class="mensaje mensaje-izquierdo d-flex flex-column m-0">
            <span class="text-black">${mensaje}</span>
            <span class="text-end hora-envio text-black">${hora_envio}</span>
        </div>
    </div>
    `;
    conversacion_privada.scrollTop = conversacion_privada.scrollHeight;
  });

  txtMensaje.addEventListener("keyup", ({ keyCode }) => {
    if (keyCode !== 13) return;
    const mensaje = txtMensaje.value;
    if (mensaje.length === 0) return;

    const { uid } = usuario_privado;
    const hora_envio = calcularHoraToAmPm();
    renderMensajeEnviado(mensaje, hora_envio);
    conversacion_privada.scrollTop = conversacion_privada.scrollHeight;

    socket.emit("enviar-mensaje", { mensaje, hora_envio, uid });
    txtMensaje.value = "";
  });
};

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
 * ESC - Para cerrar el chat
 */
document.addEventListener("keyup", ({ keyCode }) => {
  if (keyCode !== 27) return;
  chat_privado.style.display = "none";
  chat_home.style.display = "";
  conversacion_privada.innerHTML = "";
});

const renderInicioChat = () => {
  const { img, nombre } = usuario;
  return `
    <h1 class="text-white" id="nombre">${nombre}</h1>
    <img src="${validarImagen(
      img
    )}" referrerpolicy="no-referrer" alt="" class="m-0 mb-3 mt-3" width="120">
    <p class="text-grey instrucciones">
      Encantado de tenerte por aquí ${nombre}, si deseas
      interactuar con alguien en linea selecciona un chat para iniciar una nueva convesación...
    </p>`;
};

const renderChatPrivado = (usuario = usuario_privado) => {
  usuario_privado = usuario;

  chat_privado.style.display = "";
  chat_home.style.display = "none";
  conversacion_privada.innerHTML = "";

  nombre_msg_privado.innerText = usuario_privado.nombre;
  img_msg_privado.src = validarImagen(usuario_privado.img);
};

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

const validarImagen = (img = "img/user_icon-icons.com_66546.svg") => img;

const calcularHoraToAmPm = (date = new Date) => {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  
  return hours + ":" + minutes + " " + ampm;
};

btnSalir.onclick = async () => {
  console.log("consent revoked");
  localStorage.clear();
  location.reload();
};

const main = async () => {
  await validarJWT();
};

main();
