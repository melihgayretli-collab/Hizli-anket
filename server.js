const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// RENDER PERSISTENT DISK YOLU
// Render panelinde 'Mount Path' neyse o olmalı. /var/istek olarak ayarladık.
const DATA_PATH = path.join('/var/istek', 'db.json');

// Klasörü ve dosyayı kontrol et, yoksa oluştur
fs.ensureFileSync(DATA_PATH);
const fileContent = fs.readFileSync(DATA_PATH, 'utf8');
if (fileContent.trim() === '') {
    fs.writeJsonSync(DATA_PATH, { categories: [], songs: [] }, { spaces: 2 });
}

function readDB() { return fs.readJsonSync(DATA_PATH); }
function writeDB(data) { fs.writeJsonSync(DATA_PATH, data, { spaces: 2 }); }

app.use(express.static(path.join(__dirname, 'public')));

let currentScene = { line1: '', align1: 'center', size1: '1.5rem', line2: '', align2: 'center', size2: '1.5rem' };

io.on('connection', (socket) => {
    // 1. Bağlantı anında diskteki veriyi gönder
    socket.emit('init_data', readDB());
    socket.emit('bekleme_mesaji_guncelle', currentScene);

    // 2. Kategori/Şarkı Güncelleme (DİSKE YAZAR)
    socket.on('db_update', (newDB) => {
        writeDB(newDB); // Fiziksel yazım burada gerçekleşir
        io.emit('init_data', newDB); // Tüm tarayıcılara yeni halini gönder
    });

    // 3. Bekleme Ekranı Mesajı
    socket.on('bekleme_mesaji_degistir', (data) => {
        currentScene = data;
        io.emit('bekleme_mesaji_guncelle', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
