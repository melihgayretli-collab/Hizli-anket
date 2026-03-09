const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// RENDER DISK AYARI
const DISK_PATH = '/var/istek';
const DATA_PATH = path.join(DISK_PATH, 'db.json');

// Disk klasörünü ve db.json dosyasını garantiye al
fs.ensureDirSync(DISK_PATH);
if (!fs.existsSync(DATA_PATH)) {
    fs.writeJsonSync(DATA_PATH, { categories: [], songs: [] }, { spaces: 2 });
}

// Veri okuma/yazma yardımcıları
const readDB = () => fs.readJsonSync(DATA_PATH);
const writeDB = (data) => fs.writeJsonSync(DATA_PATH, data, { spaces: 2 });

app.use(express.static(path.join(__dirname, 'public')));

// Bellekteki anlık durumlar (Hız için)
let currentScene = { 
    line1: '', align1: 'center', size1: '1.5rem', 
    line2: '', align2: 'center', size2: '1.5rem' 
};
let sceneActive = false;

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı');
    
    // İlk bağlantıda mevcut verileri gönder
    socket.emit('init_data', readDB());
    socket.emit('bekleme_mesaji_guncelle', currentScene);
    socket.emit('sahne_durumu_guncelle', sceneActive);

    // BEKLEME EKRANI GÜNCELLEME
    socket.on('bekleme_mesaji_degistir', (data) => {
        currentScene = data;
        io.emit('bekleme_mesaji_guncelle', data);
    });

    // SAHNE DURUMU (BAŞLAT/DURDUR)
    socket.on('sahne_durumu_degistir', (isActive) => {
        sceneActive = isActive;
        io.emit('sahne_durumu_guncelle', isActive);
    });

    // REPERTUAR (DB.JSON) GÜNCELLEME - KRİTİK VERİ
    socket.on('db_update', (newDB) => {
        writeDB(newDB); // Kalıcı diske yaz
        io.emit('init_data', newDB); // Tüm adminlere yayınla
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
    console.log(`Veri yolu: ${DATA_PATH}`);
});
