const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const soruHavuzu = {
    "A": ["Elma", "Armut", "Muz", "Çilek", "Karpuz", "Kavun", "Vişne", "Ananas"],
    "B": ["Mavi", "Kırmızı", "Yeşil", "Sarı", "Mor", "Turuncu", "Pembe", "Siyah"]
};

let sorulanlar = new Set();
let mevcutOylar = {}; // { "Elma": 3, "Muz": 5 }
let mevcutSecenekler = [];
let aktifGrup = "";

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
    // Admin anket başlattığında oyları sıfırla
    socket.on('anket_baslat', (grup) => {
        aktifGrup = grup;
        let havuz = soruHavuzu[grup] || [];
        let secenekler = havuz.filter(x => !sorulanlar.has(x));
        if (secenekler.length < 4) { sorulanlar.clear(); secenekler = havuz; }
        
        mevcutSecenekler = secenekler.sort(() => 0.5 - Math.random()).slice(0, 4);
        mevcutSecenekler.forEach(s => {
            sorulanlar.add(s);
            mevcutOylar[s] = 0; // Oyları sıfırla
        });
        
        io.emit('yeni_soru', { grup, secilenler: mevcutSecenekler });
        io.emit('istatistik_guncelle', mevcutOylar); // Admin panelini sıfırla
    });

    socket.on('oy_ver', (secenek) => {
        if (mevcutOylar.hasOwnProperty(secenek)) {
            mevcutOylar[secenek]++;
            io.emit('istatistik_guncelle', mevcutOylar);
        }
    });

    socket.on('anket_sonlandir', () => {
        // En yüksek oyu alanı bul
        let kazanan = Object.keys(mevcutOylar).reduce((a, b) => mevcutOylar[a] >= mevcutOylar[b] ? a : b, "");
        if (kazanan) {
            io.emit('gecmise_ekle', { grup: aktifGrup, kazanan: kazanan });
            mevcutOylar = {}; // Oyları temizle
        }
    });
});

server.listen(process.env.PORT || 3000);
