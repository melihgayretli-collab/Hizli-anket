const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const DB_PATH = path.join(__dirname, 'data', 'db.json');

fs.ensureDirSync(path.dirname(DB_PATH));

app.use(express.static(path.join(__dirname, 'public')));

let currentSceneActive = false;
let activePoll = null;
let votedIps = new Set();

async function loadDB() {
    try { return await fs.readJson(DB_PATH); }
    catch (e) { return { categories: [], songs: [] }; }
}
async function saveDB(data) {
    try { await fs.writeJson(DB_PATH, data, { spaces: 2 }); }
    catch (e) { console.error("DB kaydedilemedi:", e); }
}

io.on('connection', async (socket) => {
    const db = await loadDB();
    socket.emit('init_data', db);
    socket.emit('sahne_durumu_guncelle', currentSceneActive);
    if (activePoll) socket.emit('yeni_anket_geldi', activePoll);

    socket.on('update_repertuar', async (data) => {
        await saveDB(data);
        io.emit('init_data', data);
    });

    socket.on('sahne_durumu_degistir', (isActive) => {
        currentSceneActive = isActive;
        io.emit('sahne_durumu_guncelle', isActive);
    });

    socket.on('anket_yayinla', (pollData) => {
        votedIps.clear();
        activePoll = { ...pollData, votes: {} };
        pollData.options.forEach(opt => activePoll.votes[opt.id] = 0);
        io.emit('yeni_anket_geldi', activePoll);
    });

    socket.on('oy_ver', (optionId) => {
        const forwarded = socket.handshake.headers['x-forwarded-for'];
        const clientIp = forwarded ? forwarded.split(',')[0] : socket.handshake.address;

        if (activePoll && !votedIps.has(clientIp)) {
            if (activePoll.votes[optionId] !== undefined) {
                activePoll.votes[optionId]++;
                votedIps.add(clientIp);
                io.emit('oy_guncellendi', activePoll);
                socket.emit('oy_onaylandi');
            } else {
                socket.emit('oy_reddedildi', 'Geçersiz seçenek!');
            }
        } else {
            socket.emit('oy_reddedildi', 'Zaten oy verdiniz!');
        }
    });

    socket.on('anketi_bitir_sinyali', (winner) => {
        activePoll = null;
        votedIps.clear();
        io.emit('anket_temizle', winner);
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Sistem hazır."));
