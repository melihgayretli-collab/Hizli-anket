const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Disk mount path
const DATA_PATH = path.join('/var/istek', 'db.json');

// Eğer dosya yoksa oluştur
fs.ensureFileSync(DATA_PATH);
if (fs.readFileSync(DATA_PATH, 'utf8').trim() === '') {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ categories: [], songs: [] }, null, 2));
}

function readDB() { return fs.readJsonSync(DATA_PATH); }
function writeDB(data) { fs.writeJsonSync(DATA_PATH, data, { spaces: 2 }); }

app.use(express.static(path.join(__dirname, 'public')));

let sceneActive = false;
let currentPoll = null;
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

  socket.on('update_repertuar', (data) => {
    const db = readDB();
    db.categories = data.categories;
    db.songs = data.songs;
    writeDB(db);
    io.emit('init_data', db);
  });

  socket.on('anket_baslat', (poll) => {
    currentPoll = { ...poll, votes: {} };
    io.emit('yeni_anket_geldi', currentPoll);
  });

  socket.on('oy_ver', (optionId) => {
    if (!currentPoll) { socket.emit('oy_reddedildi', "Aktif anket yok."); return; }
    if (!currentPoll.votes[optionId]) currentPoll.votes[optionId] = 0;
    currentPoll.votes[optionId]++;
    socket.emit('oy_onaylandi');
    io.emit('oy_guncellendi', currentPoll);
  });

  socket.on('anketi_bitir_sinyali', () => {
    if (!currentPoll) return;
    let winner = null, maxVotes = -1;
    for (const [optId, count] of Object.entries(currentPoll.votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = currentPoll.options.find(o => o.id === optId)?.name;
      }
    }
    io.emit('anket_temizle', winner);
    currentPoll = null;
    waitingMessage = "Bir sonraki oylamaya kadar müziğin keyfini çıkar";
    io.emit('bekleme_mesaji_guncelle', waitingMessage);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
