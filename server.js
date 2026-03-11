const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// RENDER PERSISTENT DISK YOLU
const DATA_PATH = path.join('/var/istek', 'db.json');

// Veritabanı Başlatma ve Kontrolü
fs.ensureFileSync(DATA_PATH);
try {
    const content = fs.readFileSync(DATA_PATH, 'utf8').trim();
    if (content === '') {
        fs.writeJsonSync(DATA_PATH, { categories: [], songs: [], sceneActive: false, activePoll: null, usedSongs: [], pollHistory: [] }, { spaces: 2 });
    } else {
        const db = fs.readJsonSync(DATA_PATH);
        // Eksik alanlar varsa tamamla (Geriye dönük uyumluluk için)
        if (!db.usedSongs) db.usedSongs = [];
        if (!db.pollHistory) db.pollHistory = [];
        fs.writeJsonSync(DATA_PATH, db, { spaces: 2 });
    }
} catch (e) {
    fs.writeJsonSync(DATA_PATH, { categories: [], songs: [], sceneActive: false, activePoll: null, usedSongs: [], pollHistory: [] }, { spaces: 2 });
}

const readDB = () => fs.readJsonSync(DATA_PATH);
const writeDB = (data) => fs.writeJsonSync(DATA_PATH, data, { spaces: 2 });

app.use(express.static(path.join(__dirname, 'public')));

// Sahne bekleme metni objesi
let currentScene = { 
    line1: '', align1: 'center', size1: '1.5rem', 
    line2: '', align2: 'center', size2: '1.5rem' 
};

io.on('connection', (socket) => {
    const db = readDB();
    
    // Yeni bağlanan kullanıcıya güncel durumu gönder
    socket.emit('init_data', db);
    socket.emit('bekleme_mesaji_guncelle', currentScene);
    if(db.activePoll) socket.emit('poll_update', db.activePoll);

    // Genel Veritabanı Güncelleme (Repertuar vb.)
    socket.on('db_update', (newDB) => {
        writeDB(newDB);
        io.emit('init_data', newDB);
        // Eğer bir anket başlatıldıysa veya güncellendiyse tüm kullanıcılara bildir
        io.emit('poll_update', newDB.activePoll);
    });

    // Canlı Oy Verme İşlemi
    socket.on('submit_vote', (songId) => {
        const db = readDB();
        if (db.activePoll && db.activePoll.options) {
            const option = db.activePoll.options.find(opt => opt.id == songId);
            if (option) {
                option.votes = (Number(option.votes) || 0) + 1;
                writeDB(db);
                // Oyları anlık olarak herkese gönder (Canlı grafik için)
                io.emit('poll_update', db.activePoll);
            }
        }
    });

    // Admin Oylamayı Bitirdiğinde Kazananı Duyur
    socket.on('finish_poll_event', (winnerData) => {
        // Tüm kullanıcılarda "Kutlama Ekranını" tetikler
        io.emit('celebrate_winner', winnerData);
    });

    // Bekleme Ekranı Metin Değişikliği
    socket.on('bekleme_mesaji_degistir', (data) => {
        currentScene = data;
        io.emit('bekleme_mesaji_guncelle', data);
    });

    // Yeni Anket Başlatma
    socket.on('start_poll', (pollData) => {
        const db = readDB();
        db.activePoll = pollData;
        writeDB(db);
        io.emit('poll_update', pollData);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Hacı abi, İstek Portal ${PORT} portunda çalışıyor!`));
