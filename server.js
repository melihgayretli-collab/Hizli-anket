// Socket.io bağlantısı içinde olmalıdır
io.on('connection', (socket) => {

    // ANKET YAYINLAMA: Herkese gönderir
    socket.on('anket_yayinla', (pollData) => {
        io.emit('yeni_anket_geldi', pollData);
    });

    // OY VERME: Gelen oyu tüm cihazlara yansıtır
    socket.on('oy_ver', (optionId) => {
        // Burada poll nesnesini güncelleyip io.emit('oy_guncellendi', poll) yapmalısınız
        // Basitçe oyu geri yayınlıyoruz (Server-side poll yönetimine göre güncelleyin)
    });

    // BEKLEME EKRANI SENKRONİZASYONU: Kritik nokta burası!
    socket.on('bekleme_yayinla', (data) => {
        io.emit('bekleme_guncelle', data);
    });

    // SAHNEYİ VE ANKETİ BİTİRME: Tüm ekranları temizler
    socket.on('anketi_bitir_sinyali', (winnerName) => {
        io.emit('anket_temizle', winnerName);
    });

});
