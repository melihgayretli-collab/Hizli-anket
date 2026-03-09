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

// Merkezi Durum Yönetimi
let sceneActive = false;
let waitingMessage = "Konserimiz birazdan başlayacak...";
let activePoll = null;

io.on('connection', (socket) => {
  // Yeni bağlanan kullanıcıya güncel durumu gönder
  socket.emit('init_data', readDB());
  socket.emit('sahne_durumu_guncelle', sceneActive);
  socket.emit('bekleme_mesaji_guncelle', waitingMessage);
  if (activePoll) socket.emit('anket_guncelle', activePoll);

  // ADMIN: Bekleme metnini tüm ekranlarda değiştirir
  socket.on('bekleme_mesaji_degistir', (msg) => {
    waitingMessage = msg;
    io.emit('bekleme_mesaji_guncelle', msg);
  });

  // ADMIN: Sahne durumunu (Canlı/Beklemede) değiştirir
  socket.on('sahne_durumu_degistir', (isActive) => {
    sceneActive = isActive;
    if (!isActive) activePoll = null; // Sahne kapanınca anketi temizle
    io.emit('sahne_durumu_guncelle', isActive);
  });

  // ADMIN: Anketi tüm ekranlara basar
  socket.on('anket_yayinla', (pollData) => {
    activePoll = pollData;
    io.emit('anket_guncelle', activePoll);
  });

  // KULLANICI: Oy verme işlemi
  socket.on('oy_ver', (songId) => {
    if (activePoll && activePoll.votes.hasOwnProperty(songId)) {
      activePoll.votes[songId]++;
      io.emit('anket_guncelle', activePoll); // Herkese anlık sonuçları yansıt
    }
  });

  // ADMIN: Anketi sonlandır ve kazananı ilan et
  socket.on('anket_bitir', (winner) => {
    activePoll = null;
    io.emit('anket_sonucu_ilan_et', winner);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
