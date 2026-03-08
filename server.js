const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Veritabanı dosya yolu
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.static(path.join(__dirname, 'public')));

let currentSceneActive = false;
let currentWaitingData = [];
let activePoll = null;
let votedIps = new Set(); // Tekil oy takibi için

// JSON dosyasından veri okuma fonksiyonu
async function loadDB() {
    try {
        const exists = await fs.pathExists(DB_PATH);
        if (!exists) return { categories: [], songs: [] };
        return await fs.readJson(DB_PATH);
    } catch (err) {
        console.error("DB Okuma Hatası:", err);
        return { categories: [], songs: [] };
    }
}

// JSON dosyasına veri yazma fonksiyonu
async function saveDB(data) {
    try {
        await fs.ensureDir(path.dirname(DB_PATH));
        await fs.writeJson(DB_PATH, data, { spaces: 2 });
    } catch (err) {
        console.error("DB Kayıt Hatası:", err);
    }
}

io.on('connection', async (socket) => {
    const db = await loadDB();
    
    // Yeni bağlanana mevcut verileri ve durumu gönder
    socket.emit('init_data', db);
    socket.emit('sahne_durumu_guncelle', currentSceneActive);
    if (currentWaitingData.length > 0) socket.emit('bekleme_guncelle', currentWaitingData);
    if (activePoll) socket.emit('yeni_anket_geldi', activePoll);

    // Repertuar güncellendiğinde (Kategori/Şarkı ekle-sil)
    socket.on('update_repertuar', async (data) => {
        await saveDB(data);
        io.emit('init_data', data); // Tüm admin panellerini senkronize et
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
        votedIps.clear(); // Her yeni ankette oyları sıfırla
        activePoll = { ...pollData, votes: {} };
        pollData.options.forEach(opt => activePoll.votes[opt.id] = 0);
        io.emit('yeni_anket_geldi', activePoll);
    });

    socket.on('oy_ver', (optionId) => {
        const clientIp = socket.handshake.address; // Kullanıcı IP'sini al
        
        if (activePoll && !votedIps.has(clientIp)) {
            activePoll.votes[optionId] = (activePoll.votes[optionId] || 0) + 1;
            votedIps.add(clientIp); // IP'yi kayıt altına al
            io.emit('oy_guncellendi', activePoll);
            socket.emit('oy_onaylandi');
        } else {
            socket.emit('oy_reddedildi', 'Bu anket için zaten oy kullandınız.');
        }
    });

    socket.on('anketi_bitir_sinyali', (winnerName) => {
        activePoll = null;
        votedIps.clear();
        io.emit('anket_temizle', winnerName);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu aktif: http://localhost:${PORT}`));
