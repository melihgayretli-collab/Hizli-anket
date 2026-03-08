const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.static(path.join(__dirname, 'public')));

let currentSceneActive = false;
let currentWaitingData = [];
let activePoll = null;
let votedIps = new Set(); // Tekil oy kontrolü için

// Veritabanı Yükleme/Kaydetme Yardımcıları
async function loadDB() {
    try {
        return await fs.readJson(DB_PATH);
    } catch (err) {
        return { categories: [], songs: [] };
    }
}

async function saveDB(data) {
    await fs.writeJson(DB_PATH, data, { spaces: 2 });
}

io.on('connection', async (socket) => {
    const db = await loadDB();
    
    // Açılışta verileri gönder
    socket.emit('init_data', db);
    socket.emit('sahne_durumu_guncelle', currentSceneActive);
    if (currentWaitingData.length > 0) socket.emit('bekleme_guncelle', currentWaitingData);
    if (activePoll) socket.emit('yeni_anket_geldi', activePoll);

    // REPERTUAR GÜNCELLEME (Admin'den gelir)
    socket.on('update_repertuar', async (data) => {
        await saveDB(data);
        // Tüm admin panellerini güncellemek istersen:
        io.emit('init_data', data);
    });

    socket.on('bekleme_yayinla', (data) => {
        currentWaitingData = data;
        io.emit('bekleme_guncelle', data);
    });

    socket.on('sahne_durumu_degistir', (isActive) => {
        currentSceneActive = isActive;
        io.emit('sahne_durumu_guncelle', isActive);
    });

    socket.on('anket_yayinla', (pollData) => {
        votedIps.clear(); // Yeni ankette oyları sıfırla
        activePoll = { ...pollData, votes: {} };
        pollData.options.forEach(opt => activePoll.votes[opt.id] = 0);
        io.emit('yeni_anket_geldi', activePoll);
    });

    socket.on('oy_ver', (optionId) => {
        const clientIp = socket.handshake.address;
        if (activePoll && !votedIps.has(clientIp)) {
            activePoll.votes[optionId] = (activePoll.votes[optionId] || 0) + 1;
            votedIps.add(clientIp); // Bu IP'yi işaretle
            io.emit('oy_guncellendi', activePoll);
            socket.emit('oy_onaylandi'); // Oy verene bildirim
        } else {
            socket.emit('oy_reddedildi', 'Zaten oy verdiniz!');
        }
    });

    socket.on('anketi_bitir_sinyali', (winnerName) => {
        activePoll = null;
        votedIps.clear();
        io.emit('anket_temizle', winnerName);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT}`));
