const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Sahne ve Anket Durumunu Sunucu Tarafında Tutmak (Yeni bağlananlar için)
let currentSceneActive = false;
let currentWaitingData = [];
let activePoll = null;

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Yeni bağlanan kullanıcıya mevcut durumu gönder
    socket.emit('sahne_durumu_guncelle', currentSceneActive);
    if (currentWaitingData.length > 0) {
        socket.emit('bekleme_guncelle', currentWaitingData);
    }
    if (activePoll) {
        socket.emit('yeni_anket_geldi', activePoll);
    }

    // --- BEKLEME EKRANI SENKRONİZASYONU ---
    socket.on('bekleme_yayinla', (data) => {
        currentWaitingData = data; // Sunucuda sakla
        io.emit('bekleme_guncelle', data); // Tüm cihazlara yay
    });

    // --- SAHNE DURUM YÖNETİMİ ---
    socket.on('sahne_durumu_degistir', (isActive) => {
        currentSceneActive = isActive; // Sunucuda sakla
        io.emit('sahne_durumu_guncelle', isActive); // Tüm cihazlara yay (Kullanıcı metni burada değişir)
    });

    // --- ANKET YÖNETİMİ ---
    socket.on('anket_yayinla', (pollData) => {
        activePoll = {
            ...pollData,
            votes: {} // Oyları sıfırla
        };
        pollData.options.forEach(opt => {
            activePoll.votes[opt.id] = 0;
        });
        io.emit('yeni_anket_geldi', activePoll);
    });

    socket.on('oy_ver', (optionId) => {
        if (activePoll) {
            activePoll.votes[optionId] = (activePoll.votes[optionId] || 0) + 1;
            io.emit('oy_guncellendi', activePoll);
        }
    });

    // --- SAHNEYİ VE ANKETİ BİTİRME ---
    socket.on('anketi_bitir_sinyali', (winnerName) => {
        activePoll = null; // Anketi sunucudan sil
        io.emit('anket_temizle', winnerName); // Tüm cihazlarda ekranı temizle
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
