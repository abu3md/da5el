const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public")); // ملفات الواجهة

let players = [];

io.on("connection", (socket) => {
  console.log("🔵 متصل:", socket.id);

  // تسجيل الدخول
  socket.on("login", (username) => {
    if (!username) {
      socket.emit("loginError", "الرجاء إدخال اسم مستخدم.");
      return;
    }

    let role = "player";
    if (username === "Sam@123") role = "admin";
    else if (username === "Sam@321") role = "spectator";

    const player = {
      id: socket.id,
      name: username,
      role,
      team: null,
      points: 0
    };

    players.push(player);

    socket.emit("loginSuccess", player);
    io.emit("updateState", { players, teams: { blue: 0, red: 0 } });
  });

  // قطع الاتصال
  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit("updateState", { players, teams: { blue: 0, red: 0 } });
    console.log("🔴 انقطع:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("🚀 السيرفر شغال على http://localhost:3000");
});
