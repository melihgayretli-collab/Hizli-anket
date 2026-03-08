<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Hızlı Anket - Canlı Sahne</title>
    <script src="/socket.io/socket.io.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --primary: #38bdf8;
            --success: #22c55e;
            --danger: #ef4444;
            --text: #f8fafc;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        body { background: var(--bg); color: var(--text); overflow-x: hidden; }

        /* Ana Ekran */
        .container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        #status { font-size: 1.2rem; text-align: center; margin-top: 50px; color: var(--primary); display: none; }
        
        /* Butonlar ve Menüler */
        .menu-btn { 
            width: 100%; max-width: 300px; padding: 15px; margin: 10px 0; 
            border: none; border-radius: 12px; background: var(--card); 
            color: white; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 10px;
        }

        /* Katman Yönetimi */
        .layer { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg); padding: 20px; z-index: 100; overflow-y: auto; }
        .layer-header { display: flex; align-items: center; margin-bottom: 20px; gap: 15px; }
        
        /* Kategori ve Şarkı Listeleri */
        .cat-item, .song-item { background: var(--card); padding: 15px; border-radius: 10px; margin-bottom: 10px; }
        .item-header { display: flex; justify-content: space-between; align-items: center; }
        .confirm-area { display: none; margin-top: 10px; border-top: 1px solid #334155; pt: 10px; }

        input, select { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; }
    </style>
</head>
<body>

    <div class="container">
        <h1 style="margin-top: 20px; letter-spacing: 2px;">CANLI ANKET</h1>
        <div id="status">Bir sonraki oylama gelene kadar müziğin keyfini çıkar</div>
        
        <div id="options" style="width: 100%; max-width: 400px; margin-top: 30px;"></div>

        <button class="menu-btn" onclick="openAdmin()" style="margin-top: auto; opacity: 0.5;">PANEL</button>
    </div>

    <div id="layer-admin" class="layer">
        <div class="layer-header">
            <i class="fas fa-arrow-left" onclick="closeAdmin()"></i>
            <h2>ADMİN PANELİ</h2>
        </div>
        
        <button id="btn-start" class="menu-btn" style="background: var(--success)" onclick="startScene()">SAHNEYİ BAŞLAT</button>
        <button id="btn-stop" class="menu-btn" style="background: var(--danger); display:none;" onclick="stopScene()">SAHNEYİ BİTİR</button>
        
        <button class="menu-btn" onclick="renderWaitingDisplay()">BEKLEME EKRANI DÜZENLE</button>
        <button id="btn-rep" class="menu-btn" onclick="renderCategories()">REPERTUAR DÜZENLE</button>
    </div>

    <div id="layer-cats" class="layer">
        <div class="layer-header">
            <i class="fas fa-arrow-left" onclick="switchLayer('layer-admin', '')"></i>
            <h2 id="cat-title">KATEGORİLER</h2>
        </div>
        <div id="cat-list"></div>
        <button class="menu-btn" style="background:var(--primary)" onclick="openAddCat()">YENİ KATEGORİ EKLE</button>
    </div>

    <script>
        const socket = io();
        let categories = [];
        let allSongs = [];
        let sceneActive = false;

        // --- SUNUCU SENKRONİZASYONU ---

        // Sunucudan (JSON DB) gelen verileri yükle
        socket.on('init_data', (data) => {
            categories = data.categories || [];
            allSongs = data.songs || [];
            // Eğer kategori listesi açıksa güncelle
            if(document.getElementById('layer-cats').style.display === 'block') renderCategories();
        });

        socket.on('sahne_durumu_guncelle', (isActive) => {
            sceneActive = isActive;
            const statusEl = document.getElementById('status');
            statusEl.style.display = isActive ? 'block' : 'none';
            updateAdminUI();
        });

        // Oylama Sonuçları ve Tekil Oy Geri Bildirimleri
        socket.on('oy_onaylandi', () => alert("Oyunuz alındı!"));
        socket.on('oy_reddedildi', (msg) => alert(msg));

        // --- VERİ YÖNETİMİ ---

        function saveData() {
            const data = { categories, songs: allSongs };
            socket.emit('update_repertuar', data); // Sunucuya (JSON DB) gönder
            localStorage.setItem('rep_cats', JSON.stringify(categories));
            localStorage.setItem('rep_songs', JSON.stringify(allSongs));
        }

        // --- SAHNE VE MENÜ AKSİYONLARI ---

        function startScene() {
            socket.emit('sahne_durumu_degistir', true);
            closeAdmin();
        }

        function stopScene() {
            if(confirm("Sahne bitirilsin mi?")) {
                socket.emit('sahne_durumu_degistir', false);
                socket.emit('anketi_bitir_sinyali', null);
            }
        }

        function openAdmin() { document.getElementById('layer-admin').style.display = 'block'; }
        function closeAdmin() { document.getElementById('layer-admin').style.display = 'none'; }

        function switchLayer(id, title) {
            document.querySelectorAll('.layer').forEach(l => l.style.display = 'none');
            document.getElementById(id).style.display = 'block';
            if(title) document.getElementById('cat-title').innerText = title;
        }

        // Kategori Listeleme (Görsel yapı korunmuştur)
        function renderCategories() {
            switchLayer('layer-cats', 'KATEGORİLER');
            const cont = document.getElementById('cat-list');
            cont.innerHTML = categories.map(c => `
                <div class="cat-item">
                    <div class="item-header" onclick="toggleActions('cat-${c.id}')">
                        <span>${c.name.toUpperCase()}</span><i class="fas fa-chevron-down"></i>
                    </div>
                    <div id="cat-${c.id}" class="confirm-area">
                        <button class="menu-btn" style="background:var(--success); margin-bottom:5px;" onclick="alert('Şarkı Ekleme Fonksiyonu')">ŞARKI EKLE</button>
                        <button class="menu-btn" style="background:var(--danger)" onclick="toggleActions('conf-del-${c.id}')">KATEGORİYİ SİL</button>
                        <div id="conf-del-${c.id}" style="display:none; padding:10px; background:rgba(239, 68, 68, 0.1); border-radius:8px; margin-top:5px;">
                            <p style="font-size:0.8rem; margin-bottom:5px;">Emin misiniz? Şarkılar silinmez.</p>
                            <button class="menu-btn" style="background:var(--danger); font-size:0.7rem;" onclick="deleteCat(${c.id})">EVET, SİL</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function deleteCat(catId) {
            categories = categories.filter(c => c.id !== catId);
            allSongs = allSongs.map(s => (s.catId === catId ? { ...s, catId: null } : s));
            saveData(); // Değişikliği sunucuya işle
            renderCategories();
        }

        function toggleActions(id) {
            const el = document.getElementById(id);
            el.style.display = el.style.display === 'block' ? 'none' : 'block';
        }

        function updateAdminUI() {
            document.getElementById('btn-start').style.display = sceneActive ? 'none' : 'flex';
            document.getElementById('btn-stop').style.display = sceneActive ? 'flex' : 'none';
        }

    </script>
</body>
</html>
