const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Sunucu tarafında tutulan global durumlar
let currentSceneActive = false;
let currentWaitingData = [];
let activePoll = null;

io.on('connection', (socket) => {
    console.log('Cihaz bağlandı:', socket.id);

    // Yeni bağlanan cihaza mevcut durumu yükle
    socket.emit('sahne_durumu_guncelle', currentSceneActive);
    if (currentWaitingData.length > 0) socket.emit('bekleme_guncelle', currentWaitingData);
    if (activePoll) socket.emit('yeni_anket_geldi', activePoll);

    // --- BEKLEME EKRANI SENKRONİZASYONU ---
    socket.on('bekleme_yayinla', (data) => {
        currentWaitingData = data; 
        io.emit('bekleme_guncelle', data); // Tüm cihazlara adminin metinlerini basar
    });

    // --- SAHNE DURUM YÖNETİMİ ---
    socket.on('sahne_durumu_degistir', (isActive) => {
        currentSceneActive = isActive;
        io.emit('sahne_durumu_guncelle', isActive); // Herkeste "Bir sonraki oylama..." metnini açar/kapatır
    });

    // --- ANKET YÖNETİMİ ---
    socket.on('anket_yayinla', (pollData) => {
        activePoll = { ...pollData, votes: {} };
        pollData.options.forEach(opt => activePoll.votes[opt.id] = 0);
        io.emit('yeni_anket_geldi', activePoll);
    });

    socket.on('oy_ver', (optionId) => {
        if (activePoll) {
            activePoll.votes[optionId] = (activePoll.votes[optionId] || 0) + 1;
            io.emit('oy_guncellendi', activePoll); // Canlı oylama sonuçlarını tüm cihazlara yayar
        }
    });

    socket.on('anketi_bitir_sinyali', (winnerName) => {
        activePoll = null;
        io.emit('anket_temizle', winnerName);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde aktif`));
