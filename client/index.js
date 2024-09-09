let socket = io('http://localhost:5050', { path: '/real-time' });

const divLogin = document.getElementById('div-login');
const container = document.getElementById('data-container');

document.getElementById('join-button').addEventListener('click', ShowName);

async function ShowName(event) {
  event.preventDefault();

  const name = document.getElementById('name').value;
  container.innerHTML = `<p>Nickname: ${name}</p>
  <button id='startbutton'> START GAME </button>`;

  socket.emit('joinGame', { nickname: name });

  divLogin.style.display = 'none';
  container.style.display = 'block';

  document.getElementById('startbutton').addEventListener('click', StartGame);
}

async function StartGame() {
  socket.emit('requestStartGame');
}

socket.on("gameStarted", () => {
  document.getElementById('startbutton').style.display = 'none';
  container.innerHTML += `<p>Has entrado al juego</p>`;
});

socket.on("roleAssigned", (data) => {
  container.innerHTML = `<p>Eres ${data.role}</p>`;

  let buttonText = data.role === "Marco" ? "GRITAR MARCO" : "GRITAR POLO";

  const gritarButton = document.createElement('button');
  gritarButton.id = "gritar-button";
  gritarButton.textContent = buttonText;

  container.appendChild(gritarButton);

  gritarButton.addEventListener('click', () => {
    socket.emit(data.role === "Marco" ? "notifyMarco" : "notifyPolo");
  });
});

// Mostrar lista de Polos como botones para Marco
socket.on('poloList', (polos) => {
  container.innerHTML += `<p>Selecciona un Polo:</p>`;

  polos.forEach((polo) => {
    const poloButton = document.createElement('button');
    poloButton.textContent = polo.nickname;
    poloButton.addEventListener('click', () => {
      socket.emit('selectPolo', polo.socketId); // Marco selecciona un Polo
    });
    container.appendChild(poloButton);
  });
});

// Notificar a los Polos cuando Marco grita
socket.on('marcoGritado', () => {
  container.innerHTML += `<h2>MARCO ha gritado!! Debes gritar Polo!</h2>`;
});

// Notificar a todos cuando el juego ha terminado
socket.on('gameFinished', (message) => {
  container.innerHTML += `<h2>${message}</h2>`;
});

// Notificar a todos cuando los roles cambian
socket.on('rolesUpdated', (message) => {
  container.innerHTML = `<h2>${message}</h2>`;
});
