const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// RENDER PERSISTENT DISK
const DATA_PATH = path.join('/var/istek', 'db.json');

fs.ensureFileSync(DATA_PATH);
if (fs.readFileSync(DATA_PATH, 'utf8').trim() === '') {
    fs.writeJsonSync(DATA_PATH, { categories: [], songs: [] }, { spaces: 2 });
}

const readDB = () => fs.readJsonSync(DATA_PATH);
const writeDB = (data) => fs.writeJsonSync(DATA_PATH, data, { spaces: 2 });

app.use(express.static(path.join(__dirname, 'public')));

let currentScene = { 
    line1: '', align1: 'center', size1: '1.5rem', 
    line2: '', align2: 'center', size2: '1.5rem' 
};

io.on('connection', (socket) => {
    socket.emit('init_data', readDB());
    socket.emit('bekleme_mesaji_guncelle', currentScene);

    socket.on('db_update', (newDB) => {
        writeDB(newDB);
        io.emit('init_data', newDB);
    });

    socket.on('bekleme_mesaji_degistir', (data) => {
        currentScene = data;
        io.emit('bekleme_mesaji_guncelle', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server port: ${PORT}`));
