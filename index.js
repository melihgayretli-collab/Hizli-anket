<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hızlı Anket - Yönetim</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        :root {
            --primary: #4f46e5; --danger: #ef4444; --info: #3b82f6;
            --success: #10b981; --warning: #f59e0b; --dark: #0f172a;
            --input-bg: #1e293b; --main-font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body { font-family: var(--main-font); margin: 0; background: url('image1.png') no-repeat center center fixed; background-size: cover; color: white; height: 100vh; overflow: hidden; position: relative; background-color: #000; }
        body::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: -1; pointer-events: none; }
        
        #waiting-display { position: fixed; top: 60px; left: 80px; width: calc(50% - 80px); text-align: left; z-index: 5; pointer-events: none; }
        .display-line { min-height: 1.5rem; font-size: 1.2rem; font-weight: 700; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.9); margin-bottom: 6px; letter-spacing: -0.2px; line-height: 1.2; width: 100%; }
        
        .container { position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center; }
        h2#status { font-size: 2rem; text-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-bottom: 30px; display: block; }
        
        .admin-trigger { position: fixed; top: 20px; right: 20px; font-size: 1.8rem; opacity: 0.1; cursor: pointer; z-index: 9999; color: white; transition: opacity 0.3s; padding: 10px; }
        .admin-trigger:hover { opacity: 0.8; }
        
        #admin-panel { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--dark); z-index: 10000; padding: 25px; box-sizing: border-box; overflow-y: auto; color: white; }
        .admin-layer { display: none; opacity: 0; transform: translateY(20px); transition: all 0.3s ease-out; max-width: 600px; margin: 0 auto; width: 100%; padding-bottom: 120px; }
        .active-layer { display: block; opacity: 1; transform: translateY(0); }
        
        .menu-grid { display: grid; gap: 12px; margin-top: 20px; }
        .menu-btn { padding: 16px; font-size: 0.9rem; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; text-transform: uppercase; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
        
        .cat-item, .mekan-card { background: #1e293b; border-radius: 12px; margin-bottom: 10px; border: 1px solid #334155; overflow: hidden; }
        .item-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        
        .confirm-area { display: none; background: rgba(30, 41, 59, 0.9); padding: 15px; border-top: 1px solid #334155; text-align: center; }
        
        .poll-btn { background: rgba(79, 70, 229, 0.2); border: 2px solid var(--primary); color: white; padding: 20px; border-radius: 15px; font-size: 1.2rem; font-weight: 700; cursor: pointer; width: 300px; margin-bottom: 15px; position: relative; overflow: hidden; }
        .poll-btn .progress-bg { position: absolute; left: 0; top: 0; height: 100%; background: rgba(79, 70, 229, 0.4); z-index: -1; transition: width 0.3s ease; }
        .sticky-bottom-btn { position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); width: calc(100% - 50px); max-width: 550px; }
        .song-cat-select { background: #0f172a; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; padding: 4px; }
    </style>
</head>
<body onclick="handleGlobalClick(event)">

    <div id="waiting-display"></div>

    <div class="container">
        <h2 id="status">Bir sonraki oylama gelene kadar müziğin keyfini çıkar</h2>
        <div id="options"></div>
        <i class="fas fa-cog admin-trigger" onclick="openAdmin(); event.stopPropagation();"></i>
    </div>

    <div id="admin-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #334155; padding-bottom:15px;">
            <div style="font-weight:800; color:#818cf8;">YÖNETİCİ <span id="admin-header-subtitle"></span></div>
            <i class="fas fa-times-circle" style="font-size: 2rem; cursor:pointer; color: #64748b;" onclick="closeAdmin()"></i>
        </div>

        <div id="layer-menu" class="admin-layer active-layer">
            <div id="scene-active-status" style="background:rgba(16, 185, 129, 0.1); padding:10px; border-radius:8px; border:1px solid var(--success); text-align:center; display:none; margin-bottom:15px; color:var(--success); font-weight:800;">SAHNE AKTİF</div>
            <div class="menu-grid">
                <button id="btn-start-scene" class="menu-btn" style="background:var(--success);" onclick="renderStartMekanSelect()">SAHNE BAŞLAT</button>
                <button id="btn-create-poll" class="menu-btn" style="background:var(--primary); display:none;" onclick="openPollCategories()">ANKET OLUŞTUR</button>
                <button id="btn-results" class="menu-btn" style="background:var(--info); display:none;" onclick="renderResults()">SONUÇLAR</button>
                <button id="btn-rep-edit" class="menu-btn" style="background:var(--warning);" onclick="switchLayer('layer-repertoire', ' / REPERTUAR')">REPERTUAR DÜZENLE</button>
                <button class="menu-btn" style="background:var(--info);" onclick="openWaitingLayer()">BEKLEME EKRANI DÜZENLE</button>
            </div>
            <div id="btn-stop-scene-container" class="sticky-bottom-btn" style="display:none;">
                <button class="menu-btn" style="background:var(--danger);" onclick="stopScene()">SAHNEYİ BİTİR</button>
            </div>
        </div>

        <div id="layer-repertoire" class="admin-layer">
            <div class="menu-grid">
                <button class="menu-btn" style="background:var(--success);" onclick="renderMekanList()">MEKAN ŞABLONLARI</button>
                <button class="menu-btn" style="background:var(--warning);" onclick="renderCategories()">KATEGORİLER</button>
                <button class="menu-btn" style="background:var(--info);" onclick="renderSongs()">ŞARKILAR</button>
                <button class="menu-btn" style="background:#334155;" onclick="switchLayer('layer-menu', '')">GERİ</button>
            </div>
        </div>

        <div id="layer-categories" class="admin-layer">
            <div id="category-list"></div>
            <button class="menu-btn" style="background:var(--success); margin-top:15px;" onclick="toggleForm('add-cat-form')">+ YENİ KATEGORİ</button>
            <div id="add-cat-form" style="display:none; padding:15px; background:#1e293b; border-radius:12px; margin-top:10px;">
                <input type="text" id="new-cat-name" placeholder="Kategori Adı" style="width:100%; padding:12px; margin-bottom:10px; border-radius:8px; border:none; background:#0f172a; color:white;">
                <button class="menu-btn" style="background:var(--success); width:100%;" onclick="saveNewCategory()">KAYDET</button>
            </div>
            <button class="menu-btn" style="background:#334155; margin-top:10px;" onclick="switchLayer('layer-repertoire', '')">GERİ</button>
        </div>

        <div id="layer-songs" class="admin-layer">
            <button class="menu-btn" style="background:var(--success); margin-bottom:15px;" onclick="toggleForm('add-song-form')">+ YENİ ŞARKI</button>
            <div id="add-song-form" style="display:none; padding:15px; background:#1e293b; border-radius:12px; margin-bottom:15px;">
                <input type="text" id="new-song-name" placeholder="Şarkı Adı" style="width:100%; padding:12px; margin-bottom:10px; border-radius:8px; border:none; background:#0f172a; color:white;">
                <select id="new-song-cat" class="song-cat-select" style="width:100%; padding:12px; margin-bottom:10px;"></select>
                <button class="menu-btn" style="background:var(--success); width:100%;" onclick="saveNewSong()">KAYDET</button>
            </div>
            <div id="songs-list-container"></div>
            <button class="menu-btn" style="background:#334155; margin-top:15px;" onclick="switchLayer('layer-repertoire', '')">GERİ</button>
        </div>

        <div id="layer-mekan-list" class="admin-layer">
            <div id="mekan-items"></div>
            <button class="menu-btn" style="background:#334155; margin-top:10px;" onclick="switchLayer('layer-repertoire', '')">GERİ</button>
        </div>
        <div id="layer-waiting" class="admin-layer"><div id="waiting-inputs"></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;"><button class="menu-btn" style="background:#334155;" onclick="switchLayer('layer-menu', '')">İPTAL</button><button class="menu-btn" style="background:var(--success);" onclick="saveWaiting()">KAYDET</button></div></div>
        <div id="layer-poll-cats" class="admin-layer"><div id="poll-cat-list" class="menu-grid"></div><button class="menu-btn" style="background:#334155; margin-top:20px;" onclick="switchLayer('layer-menu', '')">GERİ</button></div>
        <div id="layer-poll-create" class="admin-layer"><h3 id="poll-cat-title"></h3><div id="poll-options-container" class="check-list-container"></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;"><button class="menu-btn" style="background:#334155;" onclick="switchLayer('layer-poll-cats', '')">GERI</button><button class="menu-btn" style="background:var(--primary);" onclick="publishPoll()">ANKETİ YAYINLA</button></div></div>
        <div id="layer-results" class="admin-layer"><div id="active-poll-results"></div><button id="btn-end-poll" class="menu-btn" style="background:var(--danger); margin-top:20px; display:none;" onclick="endPoll()">ANKETİ BİTİR</button><button class="menu-btn" style="background:#334155; margin-top:20px;" onclick="switchLayer('layer-menu', '')">GERİ</button></div>
    </div>

    <script>
        const socket = io();
        let categories = JSON.parse(localStorage.getItem('rep_cats') || '[]');
        let allSongs = JSON.parse(localStorage.getItem('rep_songs') || '[]');
        let mekanlar = JSON.parse(localStorage.getItem('mekan_sablonlari') || '[]');
        let sceneState = { active: false, currentExCats: [], currentExSongs: [], playedSongIds: [], activePoll: null, hasVoted: false };

        // --- SOCKET EVENTLERI ---
        
        socket.on('yeni_anket_geldi', (poll) => {
            sceneState.activePoll = poll;
            sceneState.hasVoted = false; // Her yeni ankette oyu sıfırla
            renderPollUserUI();
        });

        socket.on('oy_guncellendi', (poll) => {
            sceneState.activePoll = poll;
            renderPollUserUI(); // Canlı sonuçları güncelle
        });

        socket.on('anket_temizle', (winner) => {
            sceneState.activePoll = null;
            const statusEl = document.getElementById('status');
            const optionsEl = document.getElementById('options');
            optionsEl.innerHTML = '';
            
            if(winner) {
                statusEl.innerHTML = `<span style="color:var(--success); font-size:1.4rem;">KAZANAN</span><br><div style="font-size:2.5rem; margin-top:10px;">${winner}</div>`;
                setTimeout(() => {
                    statusEl.innerText = "Bir sonraki oylama gelene kadar müziğin keyfini çıkar";
                }, 10000);
            } else {
                statusEl.innerText = "Bir sonraki oylama gelene kadar müziğin keyfini çıkar";
            }
        });

        socket.on('bekleme_guncelle', (data) => {
            localStorage.setItem('waiting_texts', JSON.stringify(data));
            renderWaitingDisplay();
        });

        // --- ANA FONKSİYONLAR ---

        function renderPollUserUI() {
            const poll = sceneState.activePoll;
            const cont = document.getElementById('options');
            const statusEl = document.getElementById('status');
            
            if(!poll) {
                cont.innerHTML = '';
                return;
            }

            statusEl.innerText = "SIRADAKİ ŞARKI ?";
            cont.innerHTML = '';
            let total = Object.values(poll.votes).reduce((a,b)=>a+b, 0);

            poll.options.forEach(o => {
                const v = poll.votes[o.id] || 0;
                const p = total > 0 ? Math.round((v/total)*100) : 0;
                const b = document.createElement('button');
                b.className = 'poll-btn';

                if(!sceneState.hasVoted) {
                    b.innerText = o.name;
                    b.onclick = () => {
                        sceneState.hasVoted = true;
                        socket.emit('oy_ver', o.id);
                    };
                } else {
                    b.innerHTML = `<div class="progress-bg" style="width:${p}%"></div>
                                   <div style="display:flex; justify-content:space-between; width:100%; position:relative; z-index:2;">
                                   <span>${o.name}</span><span>%${p}</span></div>`;
                    b.style.cursor = 'default';
                }
                cont.appendChild(b);
            });
        }

        function saveWaiting() {
            const data = [];
            for(let i=1; i<=10; i++) {
                const inp = document.getElementById(`w-row-${i}`);
                data.push({text: inp.value, align: inp.dataset.align});
            }
            socket.emit('bekleme_yayinla', data); // Tüm cihazlara gönder
            switchLayer('layer-menu', '');
        }

        function stopScene() {
            if(confirm("Sahneyi bitir?")) {
                sceneState.active = false;
                socket.emit('anketi_bitir_sinyali', null); // Anketi temizle (kazanansız)
                updateMenuUI();
                switchLayer('layer-menu', '');
            }
        }

        // --- YÖNETİM & DÜZENLEME (TALİMATLARINIZA GÖRE AYNI KALDI) ---

        function renderCategories() {
            switchLayer('layer-categories', ' / KATEGORİLER');
            const list = document.getElementById('category-list');
            list.innerHTML = categories.map(c => `
                <div class="cat-item">
                    <div class="item-header" onclick="toggleCatActions(${c.id})">
                        <span>${c.name.toUpperCase()}</span><i class="fas fa-chevron-down"></i>
                    </div>
                    <div id="cat-actions-${c.id}" class="confirm-area">
                        <button class="menu-btn" style="background:var(--success); margin-bottom:10px;" onclick="openAddSongToCat(${c.id})">+ ŞARKI EKLE</button>
                        <button class="menu-btn" style="background:var(--danger);" onclick="deleteCategory(${c.id})">KATEGORİYİ SİL</button>
                    </div>
                    <div id="cat-song-adder-${c.id}" class="confirm-area" style="background:var(--dark);">
                        <div id="unassigned-songs-${c.id}" class="check-list-container"></div>
                        <button class="menu-btn" style="background:#334155; margin-top:10px;" onclick="renderCategories()">KAPAT</button>
                    </div>
                </div>
            `).join('');
        }

        function openAddSongToCat(catId) {
            document.querySelectorAll('.confirm-area').forEach(a => a.style.display = 'none');
            document.getElementById(`cat-song-adder-${catId}`).style.display = 'block';
            const list = document.getElementById(`unassigned-songs-${catId}`);
            const unassigned = allSongs.filter(s => s.catId === null);
            list.innerHTML = unassigned.map(s => `<div class="check-item" onclick="assignSongToCat(${s.id}, ${catId})"><i class="fas fa-plus"></i> ${s.name}</div>`).join('') || 'Kategorisiz şarkı yok.';
        }

        function assignSongToCat(songId, catId) {
            const song = allSongs.find(s => s.id === songId);
            if(song) song.catId = catId;
            saveData(); openAddSongToCat(catId);
        }

        function renderSongs() {
            switchLayer('layer-songs', ' / ŞARKILAR');
            const cont = document.getElementById('songs-list-container');
            cont.innerHTML = allSongs.map(s => `
                <div class="cat-item" style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${s.name}</span>
                    <select class="song-cat-select" onchange="updateSongCat(${s.id}, this.value)">
                        <option value="null" ${s.catId===null?'selected':''}>-</option>
                        ${categories.map(c => `<option value="${c.id}" ${s.catId===c.id?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                    <i class="fas fa-trash" style="color:var(--danger)" onclick="showConfirm('s-del-${s.id}')"></i>
                    <div id="s-del-${s.id}" class="confirm-area"><button class="menu-btn" style="background:var(--danger)" onclick="allSongs=allSongs.filter(x=>x.id!==${s.id});saveData();renderSongs();">SİLİNSİN Mİ?</button></div>
                </div>
            `).join('');
        }

        function updateSongCat(sId, cId) { 
            const s = allSongs.find(x => x.id === sId); 
            s.catId = cId === 'null' ? null : parseInt(cId); 
            saveData(); 
        }

        // Yardımcı UI Fonksiyonları
        function toggleForm(id) { const f = document.getElementById(id); f.style.display = f.style.display === 'block' ? 'none' : 'block'; if(id === 'add-song-form') fillCatSelect(); }
        function toggleCatActions(id) { const el = document.getElementById(`cat-actions-${id}`); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
        function showConfirm(id) { document.querySelectorAll('.confirm-area').forEach(a => a.style.display = 'none'); document.getElementById(id).style.display = 'block'; }
        function switchLayer(id, sub) { 
            document.getElementById('admin-header-subtitle').innerText = sub;
            document.querySelectorAll('.admin-layer').forEach(l => { l.classList.remove('active-layer'); l.style.display = 'none'; });
            const target = document.getElementById(id);
            if(target) { target.style.display = 'block'; setTimeout(() => target.classList.add('active-layer'), 10); }
        }
        function renderWaitingDisplay() {
            const cont = document.getElementById('waiting-display');
            cont.innerHTML = '';
            const saved = JSON.parse(localStorage.getItem('waiting_texts') || '[]');
            saved.forEach(item => { if(item.text.trim()) cont.innerHTML += `<div class="display-line" style="text-align:${item.align}">${item.text}</div>`; });
        }
        function handleGlobalClick(e) { if (!e.target.closest('.cat-item, .admin-trigger, .menu-btn, input, select')) { document.querySelectorAll('.confirm-area').forEach(a => a.style.display = 'none'); } }
        function openAdmin() { document.getElementById('admin-panel').style.display = 'block'; switchLayer('layer-menu', ''); updateMenuUI(); }
        function closeAdmin() { document.getElementById('admin-panel').style.display = 'none'; }
        function saveData() { localStorage.setItem('rep_cats', JSON.stringify(categories)); localStorage.setItem('rep_songs', JSON.stringify(allSongs)); localStorage.setItem('mekan_sablonlari', JSON.stringify(mekanlar)); }
        function updateMenuUI() {
            const active = sceneState.active;
            document.getElementById('scene-active-status').style.display = active ? 'block' : 'none';
            document.getElementById('btn-start-scene').style.display = active ? 'none' : 'flex';
            document.getElementById('btn-stop-scene-container').style.display = active ? 'block' : 'none';
            document.getElementById('btn-create-poll').style.display = active ? 'flex' : 'none';
            document.getElementById('btn-results').style.display = active ? 'flex' : 'none';
            document.getElementById('btn-rep-edit').style.display = active ? 'none' : 'flex';
        }
        
        window.onload = () => { renderWaitingDisplay(); };
    </script>
</body>
</html>
