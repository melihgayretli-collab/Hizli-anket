const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

// Tüm istemcilerde durumu eşitlemek için sunucu tarafında bir state tutuyoruz
let currentPoll = null;

io.on('connection', (socket) => {
    // Yeni bağlanan kullanıcıya eğer aktif bir anket varsa onu gönder
    if (currentPoll) {
        socket.emit('yeni_anket_geldi', currentPoll);
    }

    // Admin anket yayınladığında
    socket.on('anket_yayinla', (pollData) => {
        currentPoll = pollData;
        io.emit('yeni_anket_geldi', pollData);
    });

    // Kullanıcı oy verdiğinde
    socket.on('oy_ver', (optionId) => {
        if (currentPoll) {
            currentPoll.votes[optionId] = (currentPoll.votes[optionId] || 0) + 1;
            // Güncel oy sayılarını admin ve diğerlerine gönder
            io.emit('oy_sayisini_guncelle', currentPoll.votes);
        }
    });

    // Anket bitirildiğinde
    socket.on('anketi_bitir_sinyali', (winnerName) => {
        currentPoll = null;
        io.emit('anket_temizle', winnerName);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server port: ${PORT}`));
