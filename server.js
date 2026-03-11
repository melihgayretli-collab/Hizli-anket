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
try {
    const content = fs.readFileSync(DATA_PATH, 'utf8').trim();
    if (content === '') {
        fs.writeJsonSync(DATA_PATH, { categories: [], songs: [], sceneActive: false, activePoll: null, history: [], usedSongs: [] }, { spaces: 2 });
    }
} catch (e) {
    fs.writeJsonSync(DATA_PATH, { categories: [], songs: [], sceneActive: false, activePoll: null, history: [], usedSongs: [] }, { spaces: 2 });
}

const readDB = () => fs.readJsonSync(DATA_PATH);
const writeDB = (data) => fs.writeJsonSync(DATA_PATH, data, { spaces: 2 });

app.use(express.static(path.join(__dirname, 'public')));

let currentScene = { line1: '', align1: 'center', size1: '1.5rem', line2: '', align2: 'center', size2: '1.5rem' };

io.on('connection', (socket) => {
    const db = readDB();
    socket.emit('init_data', db);
    socket.emit('bekleme_mesaji_guncelle', currentScene);
    
    if(db.activePoll) socket.emit('poll_update', db.activePoll);

    socket.on('db_update', (newDB) => {
        // Sahne bitirilmişse (sceneActive: false yapılmışsa) geçmişi temizle
        if (newDB.sceneActive === false) {
            newDB.history = [];
            newDB.usedSongs = [];
        }
        writeDB(newDB);
        io.emit('init_data', newDB);
        io.emit('poll_update', newDB.activePoll);
    });

    socket.on('submit_vote', (songId) => {
        const db = readDB();
        if (db.activePoll && db.activePoll.options) {
            const option = db.activePoll.options.find(opt => opt.id == songId);
            if (option) {
                option.votes = (Number(option.votes) || 0) + 1;
                writeDB(db);
                io.emit('poll_update', db.activePoll);
            }
        }
    });

    socket.on('bekleme_mesaji_degistir', (data) => {
        currentScene = data;
        io.emit('bekleme_mesaji_guncelle', data);
    });

    socket.on('start_poll', (pollData) => {
        const db = readDB();
        db.activePoll = pollData;
        writeDB(db);
        io.emit('poll_update', pollData);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server: ${PORT}`));
