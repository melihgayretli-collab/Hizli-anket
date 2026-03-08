<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hızlı Anket - Canlı</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        /* CSS kodları ilettiğin index.js içeriğiyle aynıdır */
        :root { --primary: #4f46e5; --danger: #ef4444; --info: #3b82f6; --success: #10b981; --warning: #f59e0b; --dark: #0f172a; --input-bg: #1e293b; --main-font: 'Segoe UI', sans-serif; }
        body { font-family: var(--main-font); margin: 0; background: url('image1.png') no-repeat center center fixed; background-size: cover; color: white; height: 100vh; overflow: hidden; position: relative; background-color: #000; }
        body::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: -1; pointer-events: none; }
        #waiting-display { position: fixed; top: 60px; left: 80px; width: calc(50% - 80px); text-align: left; z-index: 5; pointer-events: none; }
        .display-line { min-height: 1.5rem; font-size: 1.2rem; font-weight: 700; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.9); margin-bottom: 6px; letter-spacing: -0.2px; line-height: 1.2; width: 100%; }
        .container { position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center; }
        h2#status { font-size: 2rem; text-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-bottom: 30px; display: none; }
        .admin-trigger { position: fixed; top: 20px; right: 20px; font-size: 1.8rem; opacity: 0.1; cursor: pointer; z-index: 9999; color: white; transition: opacity 0.3s; padding: 10px; }
        #admin-panel { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--dark); z-index: 10000; padding: 25px; box-sizing: border-box; overflow-y: auto; color: white; }
        .admin-layer { display: none; max-width: 600px; margin: 0 auto; width: 100%; padding-bottom: 120px; }
        .active-layer { display: block; }
        .menu-grid { display: grid; gap: 12px; margin-top: 20px; }
        .menu-btn { padding: 16px; font-size: 0.9rem; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; text-transform: uppercase; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
        .cat-item { background: #1e293b; border-radius: 12px; margin-bottom: 10px; border: 1px solid #334155; overflow: hidden; }
        .item-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .confirm-area { display: none; background: rgba(30, 41, 59, 0.9); padding: 15px; border-top: 1px solid #334155; text-align: center; }
        .poll-btn { background: rgba(79, 70, 229, 0.2); border: 2px solid var(--primary); color: white; padding: 20px; border-radius: 15px; font-size: 1.2rem; font-weight: 700; cursor: pointer; width: 300px; margin-bottom: 15px; position: relative; overflow: hidden; }
        .poll-btn .progress-bg { position: absolute; left: 0; top: 0; height: 100%; background: rgba(79, 70, 229, 0.4); z-index: -1; transition: width 0.3s ease; }
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
                <button id="btn-start-scene" class="menu-btn" style="background:var(--success);" onclick="startScene()">SAHNE BAŞLAT</button>
                <button id="btn-create-poll" class="menu-btn" style="background:var(--primary); display:none;" onclick="openPollCategories()">ANKET OLUŞTUR</button>
                <button id="btn-results" class="menu-btn" style="background:var(--info); display:none;" onclick="renderResults()">SONUÇLAR</button>
                <button id="btn-rep-edit" class="menu-btn" style="background:var(--warning);" onclick="switchLayer('layer-repertoire', ' / REPERTUAR')">REPERTUAR DÜZENLE</button>
                <button class="menu-btn" style="background:var(--info);" onclick="openWaitingLayer()">BEKLEME EKRANI DÜZENLE</button>
            </div>
            <div id="btn-stop-scene-container" style="display:none; margin-top:15px;">
                <button class="menu-btn" style="background:var(--danger);" onclick="stopScene()">SAHNEYİ BİTİR</button>
            </div>
        </div>

        <div id="layer-repertoire" class="admin-layer">
            <div class="menu-grid">
                <button class="menu-btn" style="background:var(--warning);" onclick="renderCategories()">KATEGORİLER</button>
                <button class="menu-btn" style="background:var(--info);" onclick="renderSongs()">ŞARKILAR</button>
                <button class="menu-btn" style="background:#334155;" onclick="switchLayer('layer-menu', '')">GERİ</button>
            </div>
        </div>

        <div id="layer-categories" class="admin-layer">
            <div id="category-list"></div>
            <button class="menu-btn" style="background:#334155; margin-top:10px;" onclick="switchLayer('layer-repertoire', '')">GERİ</button>
        </div>

        <div id="layer-songs" class="admin-layer">
            <div id="songs-list-container"></div>
            <button class="menu-btn" style="background:#334155; margin-top:15px;" onclick="switchLayer('layer-repertoire', '')">GERİ</button>
        </div>

        <div id="layer-waiting" class="admin-layer">
            <div id="waiting-inputs"></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                <button class="menu-btn" style="background:#334155;" onclick="switchLayer('layer-menu', '')">İPTAL</button>
                <button class="menu-btn" style="background:var(--success);" onclick="saveWaiting()">KAYDET</button>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let categories = JSON.parse(localStorage.getItem('rep_cats') || '[]');
        let allSongs = JSON.parse(localStorage.getItem('rep_songs') || '[]');
        let sceneActive = false;
        let activePoll = null;
        let hasVoted = false;

        // --- SOCKET EVENTLERI ---

        socket.on('sahne_durumu_guncelle', (isActive) => {
            sceneActive = isActive;
            const statusEl = document.getElementById('status');
            statusEl.style.display = isActive ? 'block' : 'none';
            statusEl.innerText = "Bir sonraki oylama gelene kadar müziğin keyfini çıkar";
            updateAdminUI();
        });

        socket.on('bekleme_guncelle', (data) => {
            localStorage.setItem('waiting_texts', JSON.stringify(data));
            renderWaitingDisplay(); //
        });

        socket.on('yeni_anket_geldi', (poll) => {
            activePoll = poll;
            hasVoted = false;
            renderUserUI();
        });

        socket.on('oy_guncellendi', (poll) => {
            activePoll = poll;
            if(hasVoted) renderUserUI();
        });

        socket.on('anket_temizle', (winner) => {
            activePoll = null;
            const statusEl = document.getElementById('status');
            document.getElementById('options').innerHTML = '';
            if(winner) {
                statusEl.innerHTML = `<span style="color:var(--success)">KAZANAN</span><br><div style="font-size:2.5rem">${winner}</div>`;
                setTimeout(() => { if(sceneActive) statusEl.innerText = "Bir sonraki oylama gelene kadar müziğin keyfini çıkar"; }, 10000);
            } else {
                statusEl.innerText = "Bir sonraki oylama gelene kadar müziğin keyfini çıkar";
            }
        });

        // --- ANA FONKSİYONLAR ---

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

        function deleteCategory(catId) {
            // Şarkıları koruyarak kategoriyi siler
            categories = categories.filter(c => c.id !== catId);
            allSongs = allSongs.map(s => s.catId === catId ? { ...s, catId: null } : s);
            saveData();
            renderCategories();
        }

        function saveWaiting() {
            const data = [];
            for(let i=1; i<=10; i++) {
                const inp = document.getElementById(`w-row-${i}`);
                if(inp) data.push({text: inp.value, align: inp.dataset.align});
            }
            socket.emit('bekleme_yayinla', data); // Sunucuya gönderir, sunucu herkese yayar
            switchLayer('layer-menu', '');
        }

        // --- UI GÜNCELLEMELERİ ---

        function renderUserUI() {
            const cont = document.getElementById('options');
            const statusEl = document.getElementById('status');
            if(!activePoll) return;

            statusEl.innerText = "SIRADAKİ ŞARKI ?";
            cont.innerHTML = '';
            let total = Object.values(activePoll.votes).reduce((a,b)=>a+b, 0);

            activePoll.options.forEach(o => {
                const v = activePoll.votes[o.id] || 0;
                const p = total > 0 ? Math.round((v/total)*100) : 0;
                const btn = document.createElement('button');
                btn.className = 'poll-btn';
                if(!hasVoted) {
                    btn.innerText = o.name;
                    btn.onclick = () => { hasVoted = true; socket.emit('oy_ver', o.id); };
                } else {
                    btn.innerHTML = `<div class="progress-bg" style="width:${p}%"></div>
                                   <div style="display:flex; justify-content:space-between; width:100%; position:relative; z-index:2">
                                   <span>${o.name}</span><span>%${p}</span></div>`;
                }
                cont.appendChild(btn);
            });
        }

        function renderCategories() {
            switchLayer('layer-categories', ' / KATEGORİLER');
            const list = document.getElementById('category-list');
            list.innerHTML = categories.map(c => `
                <div class="cat-item">
                    <div class="item-header" onclick="toggleActions('cat-act-${c.id}')">
                        <span>${c.name.toUpperCase()}</span><i class="fas fa-chevron-down"></i>
                    </div>
                    <div id="cat-act-${c.id}" class="confirm-area">
                        <button class="menu-btn" style="background:var(--danger);" onclick="toggleActions('conf-del-${c.id}')">KATEGORİYİ SİL</button>
                        <div id="conf-del-${c.id}" style="display:none; padding:10px; margin-top:10px;">
                            <p>Emin misiniz? Şarkılar silinmez.</p>
                            <button class="menu-btn" style="background:var(--danger); font-size:0.7rem;" onclick="deleteCategory(${c.id})">EVET, SİL</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function openWaitingLayer() {
            switchLayer('layer-waiting', ' / BEKLEME EKRANI');
            const cont = document.getElementById('waiting-inputs');
            cont.innerHTML = '';
            const saved = JSON.parse(localStorage.getItem('waiting_texts') || '[]');
            for(let i=1; i<=10; i++) {
                const item = saved[i-1] || {text:'', align:'left'};
                cont.innerHTML += `
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="text" id="w-row-${i}" value="${item.text}" data-align="${item.align}" style="flex:1; padding:10px; background:#0f172a; color:white; border:none; border-radius:8px;">
                        <button onclick="setAlign(${i},'left')" class="menu-btn" style="width:40px; padding:5px; background:${item.align==='left'?'var(--info)':'#334155'}">L</button>
                        <button onclick="setAlign(${i},'center')" class="menu-btn" style="width:40px; padding:5px; background:${item.align==='center'?'var(--info)':'#334155'}">C</button>
                    </div>`;
            }
        }

        function setAlign(idx, align) {
            const inp = document.getElementById(`w-row-${idx}`);
            inp.dataset.align = align;
            openWaitingLayer(); // UI Tazele
        }

        function renderWaitingDisplay() {
            const cont = document.getElementById('waiting-display');
            cont.innerHTML = '';
            const saved = JSON.parse(localStorage.getItem('waiting_texts') || '[]');
            saved.forEach(item => { if(item.text.trim()) cont.innerHTML += `<div class="display-line" style="text-align:${item.align}">${item.text}</div>`; });
        }

        function updateAdminUI() {
            document.getElementById('scene-active-status').style.display = sceneActive ? 'block' : 'none';
            document.getElementById('btn-start-scene').style.display = sceneActive ? 'none' : 'flex';
            document.getElementById('btn-stop-scene-container').style.display = sceneActive ? 'block' : 'none';
            document.getElementById('btn-create-poll').style.display = sceneActive ? 'flex' : 'none';
            document.getElementById('btn-results').style.display = sceneActive ? 'flex' : 'none';
            document.getElementById('btn-rep-edit').style.display = sceneActive ? 'none' : 'flex';
        }

        function switchLayer(id, sub) {
            document.querySelectorAll('.admin-layer').forEach(l => l.classList.remove('active-layer'));
            document.getElementById(id).classList.add('active-layer');
            document.getElementById('admin-header-subtitle').innerText = sub;
        }

        function toggleActions(id) {
            const el = document.getElementById(id);
            el.style.display = el.style.display === 'block' ? 'none' : 'block';
        }

        function openAdmin() { document.getElementById('admin-panel').style.display = 'block'; updateAdminUI(); }
        function closeAdmin() { document.getElementById('admin-panel').style.display = 'none'; }
        function handleGlobalClick(e) { if (!e.target.closest('.cat-item, .admin-trigger, .menu-btn, input')) { document.querySelectorAll('.confirm-area').forEach(a => a.style.display = 'none'); } }
        function saveData() { localStorage.setItem('rep_cats', JSON.stringify(categories)); localStorage.setItem('rep_songs', JSON.stringify(allSongs)); }
        window.onload = renderWaitingDisplay;
    </script>
</body>
</html>
