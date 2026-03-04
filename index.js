const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// GRUP VERİLERİ (Burası senin havuzun)
const soruHavuzu = {
    "A": ["Elma", "Armut", "Muz", "Çilek", "Karpuz", "Kavun", "Vişne", "Ananas"],
    "B": ["Mavi", "Kırmızı", "Yeşil", "Sarı", "Mor", "Turuncu", "Pembe", "Siyah"]
};

let sorulanlar = new Set(); // Daha önce sorulanları burada tutuyoruz

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
    // Admin komutu: Rastgele 4 şık seç ve gönder
    socket.on('anket_baslat', (grup) => {
        let havuz = soruHavuzu[grup] || [];
        // Sorulmayanları filtrele
        let secenekler = havuz.filter(x => !sorulanlar.has(x));
        
        // Eğer seçenek kalmadıysa havuzu sıfırla (opsiyonel)
        if (secenekler.length < 4) {
            secilenler = havuz.sort(() => 0.5 - Math.random()).slice(0, 4);
        } else {
            secilenler = secenekler.sort(() => 0.5 - Math.random()).slice(0, 4);
        }

        secilenler.forEach(s => sorulanlar.add(s)); // Sorulanlara ekle
        io.emit('yeni_soru', { grup, secilenler });
    });

    socket.on('oy_ver', (data) => {
        io.emit('sonuc_guncelle', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
