export default `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ניהול טוקנים ומערכות</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    <style>
        :root { --primary: #2c3e50; --secondary: #18bc9c; --bg: #ecf0f1; --card: #ffffff; --text: #34495e; --border: #bdc3c7;}
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; height: 100vh; }
        #sidebar { width: 280px; background: var(--primary); color: white; display: flex; flex-direction: column; }
        .brand { padding: 20px; font-size: 22px; font-weight: bold; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .menu-item { padding: 15px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .menu-item:hover, .menu-item.active { background: var(--secondary); }
        #main { flex: 1; padding: 30px; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: right; border-bottom: 1px solid var(--border); }
        th { color: var(--primary); }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; color: white; display: inline-flex; align-items: center; gap: 5px; font-weight: bold;}
        .btn-add { background: var(--secondary); }
        .btn-del { background: #e74c3c; padding: 5px 10px; font-size: 12px; }
        .btn-view { background: #3498db; padding: 5px 10px; font-size: 12px; }
        input[type="text"] { padding: 10px; border: 1px solid var(--border); border-radius: 6px; width: 200px; margin-left: 10px;}
        .flex-form { display: flex; gap: 10px; align-items: center; margin-bottom: 20px;}
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div id="sidebar">
        <div class="brand"><span class="material-symbols-rounded">admin_panel_settings</span> פאנל ניהול</div>
        <div class="menu-item active" onclick="switchTab('codes')"><span class="material-symbols-rounded">group</span> משתמשים וקודים</div>
        <div class="menu-item" onclick="switchTab('logs')"><span class="material-symbols-rounded">history</span> היסטוריית התחברויות</div>
    </div>
    <div id="main">
        <div class="header">
            <h1 id="page-title">ניהול קודי התחברות</h1>
            <button class="btn btn-add hidden" id="back-btn" onclick="switchTab('codes')">חזור למשתמשים</button>
        </div>

        <div id="tab-codes" class="card">
            <div class="flex-form">
                <input type="text" id="new-code" placeholder="הקש קוד גישה (למשל 8899)" />
                <input type="text" id="new-owner" placeholder="שם הבעלים (למשל 'מנהל')" />
                <button class="btn btn-add" onclick="addCode()"><span class="material-symbols-rounded">add</span> הוסף קוד</button>
            </div>
            <table>
                <thead><tr><th>מזהה</th><th>שם הבעלים</th><th>קוד סודי</th><th>פעולות</th></tr></thead>
                <tbody id="codes-table-body"></tbody>
            </table>
        </div>

        <div id="tab-systems" class="card hidden">
            <h3 style="margin-bottom: 15px;">מערכות המשויכות לקוד: <span id="current-owner-name" style="color:var(--secondary)"></span></h3>
            <div class="flex-form">
                <input type="text" id="new-sys-desc" placeholder="תיאור המערכת" />
                <input type="text" id="new-sys-token" placeholder="טוקן מימות המשיח" style="width:300px;" />
                <button class="btn btn-add" onclick="addSystem()"><span class="material-symbols-rounded">add</span> חבר מערכת</button>
            </div>
            <table>
                <thead><tr><th>מזהה</th><th>תיאור מערכת</th><th>טוקן</th><th>פעולות</th></tr></thead>
                <tbody id="systems-table-body"></tbody>
            </table>
        </div>

        <div id="tab-logs" class="card hidden">
            <table>
                <thead><tr><th>תאריך וזמן</th><th>שם משתמש</th><th>מערכת שנבחרה</th><th>כתובת IP</th></tr></thead>
                <tbody id="logs-table-body"></tbody>
            </table>
        </div>
    </div>

    <script>
        let adminPass = prompt("אנא הכנס סיסמת מנהל (ברירת מחדל: admin1234):");
        if (!adminPass) document.body.innerHTML = '<h1 style="margin:50px auto;">גישה נדחתה</h1>';
        
        const headers = { 'Content-Type': 'application/json', 'x-admin-password': adminPass };
        let activeCodeId = null;

        function switchTab(tab) {
            document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            document.getElementById('back-btn').classList.add('hidden');
            
            if (tab === 'codes') {
                document.getElementById('tab-codes').classList.remove('hidden');
                document.getElementById('page-title').innerText = 'ניהול קודי התחברות';
                document.querySelectorAll('.menu-item')[0].classList.add('active');
                loadCodes();
            } else if (tab === 'systems') {
                document.getElementById('tab-systems').classList.remove('hidden');
                document.getElementById('page-title').innerText = 'ניהול מערכות';
                document.getElementById('back-btn').classList.remove('hidden');
            } else if (tab === 'logs') {
                document.getElementById('tab-logs').classList.remove('hidden');
                document.getElementById('page-title').innerText = 'היסטוריית התחברויות';
                document.querySelectorAll('.menu-item')[1].classList.add('active');
                loadLogs();
            }
        }

        async function loadCodes() {
            const res = await fetch('/sms/api/admin/codes', { headers });
            if(res.status === 401) { alert("סיסמה שגויה!"); return; }
            const data = await res.json();
            const tbody = document.getElementById('codes-table-body');
            tbody.innerHTML = '';
            data.forEach(c => {
                tbody.innerHTML += \`<tr>
                    <td>#\${c.id}</td><td>\${c.owner_name}</td><td>\${c.code}</td>
                    <td>
                        <button class="btn btn-view" onclick="viewSystems(\${c.id}, '\${c.owner_name}')">מערכות</button>
                        <button class="btn btn-del" onclick="deleteCode(\${c.id})">מחק</button>
                    </td>
                </tr>\`;
            });
        }

        async function addCode() {
            const code = document.getElementById('new-code').value;
            const owner_name = document.getElementById('new-owner').value;
            if(!code || !owner_name) return alert("השלם את כל השדות");
            await fetch('/sms/api/admin/codes', { method: 'POST', headers, body: JSON.stringify({ code, owner_name }) });
            document.getElementById('new-code').value = '';
            document.getElementById('new-owner').value = '';
            loadCodes();
        }

        async function deleteCode(id) {
            if(!confirm("האם אתה בטוח? פעולה זו תמחק גם את כל המערכות המשויכות!")) return;
            await fetch(\`/sms/api/admin/codes/\${id}\`, { method: 'DELETE', headers });
            loadCodes();
        }

        async function viewSystems(codeId, ownerName) {
            activeCodeId = codeId;
            document.getElementById('current-owner-name').innerText = ownerName;
            switchTab('systems');
            loadSystems();
        }

        async function loadSystems() {
            const res = await fetch(\`/sms/api/admin/systems/\${activeCodeId}\`, { headers });
            const data = await res.json();
            const tbody = document.getElementById('systems-table-body');
            tbody.innerHTML = '';
            data.forEach(s => {
                tbody.innerHTML += \`<tr>
                    <td>#\${s.id}</td><td>\${s.description}</td><td style="direction:ltr; text-align:left;">\${s.token}</td>
                    <td><button class="btn btn-del" onclick="deleteSystem(\${s.id})">מחק</button></td>
                </tr>\`;
            });
        }

        async function addSystem() {
            const description = document.getElementById('new-sys-desc').value;
            const token = document.getElementById('new-sys-token').value;
            if(!description || !token) return alert("השלם את כל השדות");
            await fetch('/sms/api/admin/systems', { method: 'POST', headers, body: JSON.stringify({ code_id: activeCodeId, description, token }) });
            document.getElementById('new-sys-desc').value = '';
            document.getElementById('new-sys-token').value = '';
            loadSystems();
        }

        async function deleteSystem(id) {
            if(!confirm("האם למחוק מערכת זו?")) return;
            await fetch(\`/sms/api/admin/systems/\${id}\`, { method: 'DELETE', headers });
            loadSystems();
        }

        async function loadLogs() {
            const res = await fetch('/sms/api/admin/logs', { headers });
            const data = await res.json();
            const tbody = document.getElementById('logs-table-body');
            tbody.innerHTML = '';
            data.forEach(l => {
                const date = new Date(l.timestamp).toLocaleString('he-IL');
                tbody.innerHTML += \`<tr>
                    <td style="direction:ltr;">\${date}</td>
                    <td>\${l.owner_name || 'נמחק'}</td>
                    <td>\${l.description || 'נמחק'}</td>
                    <td>\${l.ip_address}</td>
                </tr>\`;
            });
        }

        // טעינה ראשונית
        if(adminPass) switchTab('codes');
    </script>
</body>
</html>`;
