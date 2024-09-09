

const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/real-time",
  cors: {
    origin: "*",
  },
});

const db = {
  players: [],
};

function assignRoles(players) {
  const roles = ["Marco", "Polo Especial"];
  const assignedRoles = {};

  const marcoIndex = Math.floor(Math.random() * players.length);
  assignedRoles[players[marcoIndex].socketId] = "Marco";

  let poloEspecialIndex;
  do {
    poloEspecialIndex = Math.floor(Math.random() * players.length);
  } while (poloEspecialIndex === marcoIndex); // Asegurar que no sea el mismo jugador
  assignedRoles[players[poloEspecialIndex].socketId] = "Polo Especial";

  players.forEach((player) => {
    if (!assignedRoles[player.socketId]) {
      assignedRoles[player.socketId] = "Polo";
    }
  });

  players.forEach((player) => {
    player.role = assignedRoles[player.socketId];
  });

  return assignedRoles;
}

// Manejador de conexión WebSocket
io.on("connection", (socket) => {
  console.log("A user connected");

  // Listener para cuando un jugador se une al juego
  socket.on("joinGame", (data) => {
    db.players.push({ nickname: data.nickname, socketId: socket.id });
    console.log(`${data.nickname} joined the game`);
    io.emit("userJoined", db); // Emitimos la lista actualizada de jugadores a todos los conectados
  });

  // Listener para cuando un jugador intenta iniciar el juego
  socket.on("requestStartGame", () => {
    if (db.players.length >= 3) {
      // Asignar roles a los jugadores
      const assignedRoles = assignRoles(db.players);

      // Emitir los roles asignados a cada jugador
      db.players.forEach((player) => {
        io.to(player.socketId).emit("roleAssigned", { role: player.role });
      });

      io.emit("gameStarted"); // Inicia el juego si hay al menos 3 jugadores
      console.log("Game started with sufficient players.");
    } else {
      socket.emit("gameNotStarted", "No hay suficientes jugadores para empezar el juego. Se necesitan al menos 3.");
      console.log("Attempt to start game failed due to insufficient players.");
    }
  });

  // Listener cuando Marco grita
  socket.on("notifyMarco", () => {
    const polos = db.players.filter(player => player.socketId !== socket.id && player.role !== "Marco");

    // Emitir los polos a Marco en forma de lista de botones
    io.to(socket.id).emit('poloList', polos);

    // Broadcast: Avisar a los Polos que Marco ha gritado (excepto Marco)
    socket.broadcast.emit('marcoGritado');
  });

  // Listener para cuando Marco selecciona un Polo
  socket.on("selectPolo", (poloSocketId) => {
    const selectedPolo = db.players.find(player => player.socketId === poloSocketId);
    const marcoPlayer = db.players.find(player => player.socketId === socket.id);

    if (selectedPolo) {
      if (selectedPolo.role === "Polo Especial") {
        // Notificar a todos que el juego ha finalizado
        io.emit("gameFinished", "El Polo Especial ha sido seleccionado. El juego ha terminado.");
      } else {
        // Cambiar roles: Marco se convierte en Polo y el Polo seleccionado es el nuevo Marco
        selectedPolo.role = "Marco";
        marcoPlayer.role = "Polo";

        // Notificar a todos los jugadores los roles actualizados
        db.players.forEach((player) => {
          io.to(player.socketId).emit("roleAssigned", { role: player.role });
        });

        io.emit("rolesUpdated", "El rol de Marco ha cambiado. El nuevo Marco es " + selectedPolo.nickname);
      }
    }
  });

  // Listener cuando un Polo grita
  socket.on("notifyPolo", () => {
    console.log("Polo ha gritado");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    db.players = db.players.filter(player => player.socketId !== socket.id);
    io.emit("userJoined", db); // Emitimos la lista actualizada de jugadores
  });
});

httpServer.listen(5050, () => {
  console.log(`Server is running on http://localhost:5050`);
});
