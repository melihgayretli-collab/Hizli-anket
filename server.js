const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_PATH = path.join('/var/istek', 'db.json');
fs.ensureFileSync(DATA_PATH);
if (fs.readFileSync(DATA_PATH, 'utf8').trim() === '') {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ categories: [], songs: [] }, null, 2));
}

function readDB() { return fs.readJsonSync(DATA_PATH); }
function writeDB(data) { fs.writeJsonSync(DATA_PATH, data, { spaces: 2 }); }

app.use(express.static(path.join(__dirname, 'public')));

let sceneActive = false;
let waitingMessage = "Bekleme mesajı";

io.on('connection', (socket) => {
  socket.emit('init_data', readDB());
  socket.emit('sahne_durumu_guncelle', sceneActive);
  socket.emit('bekleme_mesaji_guncelle', waitingMessage);

  socket.on('bekleme_mesaji_degistir', (msg) => {
    waitingMessage = msg;
    io.emit('bekleme_mesaji_guncelle', msg);
  });

  socket.on('sahne_durumu_degistir', (isActive) => {
    sceneActive = isActive;
    if(isActive) waitingMessage = "Bir sonraki oylamaya kadar müziğin keyfini çıkar";
    io.emit('sahne_durumu_guncelle', sceneActive);
    io.emit('bekleme_mesaji_guncelle', waitingMessage);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
