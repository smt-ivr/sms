export default `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>פורטל ניהול מערכות</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    <style>
        :root { --primary: #1e293b; --secondary: #3b82f6; --bg: #f1f5f9; --card: #ffffff; --text: #334155; --border: #e2e8f0; --danger: #ef4444; --success: #22c55e;}
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
        
        /* Loader & Toast */
        .spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: var(--secondary); animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #global-loader { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(4px); transition: 0.3s; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; transition: 0.3s; opacity: 0; visibility: hidden; }
        .toast.show { opacity: 1; visibility: visible; bottom: 40px; }
        .toast.error { background: var(--danger); }
        .toast.success { background: var(--success); }

        /* Login Screen */
        #login-screen { position: absolute; inset: 0; background: var(--bg); display: flex; justify-content: center; align-items: center; z-index: 5000; }
        .login-box { background: var(--card); padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 400px; text-align: center; }
        .login-tabs { display: flex; gap: 10px; margin-bottom: 20px; background: var(--bg); padding: 5px; border-radius: 8px; }
        .login-tab { flex: 1; padding: 10px; cursor: pointer; border-radius: 6px; transition: 0.2s; font-weight: 500; }
        .login-tab.active { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: var(--secondary); }
        .login-input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid var(--border); border-radius: 8px; font-size: 16px; text-align: center; }
        .btn-full { width: 100%; padding: 12px; background: var(--secondary); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-full:hover { background: #2563eb; }

        /* App Layout */
        #app-layout { display: none; width: 100%; height: 100%; }
        #sidebar { width: 260px; background: var(--primary); color: white; display: flex; flex-direction: column; flex-shrink: 0;}
        .brand { padding: 20px; font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .menu-item { padding: 16px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .menu-item:hover, .menu-item.active { background: rgba(255,255,255,0.1); border-right: 4px solid var(--secondary); }
        .menu-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); }
        
        #main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { height: 70px; background: white; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 30px; }
        .topbar h2 { font-size: 20px; margin: 0; display: flex; align-items: center; gap: 10px;}
        .content-area { padding: 30px; overflow-y: auto; flex: 1; }
        
        /* Components */
        .card { background: var(--card); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid var(--border); margin-bottom: 24px; overflow: hidden; }
        .card-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .card-header h3 { margin: 0; font-size: 16px; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 15px 20px; text-align: right; border-bottom: 1px solid var(--border); }
        th { color: #64748b; font-weight: 500; font-size: 14px; background: white; position: sticky; top: 0;}
        tr:hover td { background: #f8fafc; }
        
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; transition: 0.2s; }
        .btn-primary { background: var(--secondary); color: white; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
        .btn-outline:hover { background: var(--bg); }
        
        .badge { padding: 4px 8px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge.green { background: #dcfce7; color: #166534; }
        .badge.red { background: #fee2e2; color: #991b1b; }

        /* Modals */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 6000; opacity: 0; visibility: hidden; transition: 0.2s; backdrop-filter: blur(2px);}
        .modal-overlay.show { opacity: 1; visibility: visible; }
        .modal { background: white; padding: 30px; border-radius: 12px; width: 100%; max-width: 450px; transform: translateY(20px); transition: 0.3s; }
        .modal-overlay.show .modal { transform: translateY(0); }
        .modal h3 { margin-top: 0; margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-size: 14px; color: #64748b; }
        .form-control { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 15px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
        
        .hidden { display: none !important; }
    </style>
</head>
<body>

    <div id="global-loader" class="hidden"><div class="spinner"></div><div style="margin-top:15px; font-weight:bold;">טוען נתונים...</div></div>
    <div id="toast" class="toast">הודעה</div>

    <div id="login-screen">
        <div class="login-box">
            <span class="material-symbols-rounded" style="font-size: 48px; color: var(--secondary);">admin_panel_settings</span>
            <h2 style="margin: 10px 0 25px;">ברוך הבא לפורטל</h2>
            
            <div class="login-tabs">
                <div class="login-tab active" onclick="switchLogin('user')" id="tab-user">לקוח / משתמש</div>
                <div class="login-tab" onclick="switchLogin('admin')" id="tab-admin">מנהל מערכת</div>
            </div>

            <div id="form-user">
                <input type="password" id="login-code" class="login-input" placeholder="הכנס קוד אישי כאן..." />
                <button class="btn-full" onclick="loginUser()">התחבר לחשבון</button>
            </div>

            <div id="form-admin" class="hidden">
                <input type="password" id="login-pass" class="login-input" placeholder="הכנס סיסמת מנהל..." />
                <button class="btn-full" onclick="loginAdmin()">התחבר לניהול</button>
            </div>
        </div>
    </div>

    <div id="app-layout">
        <div id="sidebar">
            <div class="brand"><span class="material-symbols-rounded">dns</span> <span id="brand-title">פורטל ניהול</span></div>
            <div id="menu-items"></div>
            <div class="menu-item menu-bottom" onclick="logout()"><span class="material-symbols-rounded">logout</span> יציאה מהחשבון</div>
        </div>
        
        <div id="main-content">
            <div class="topbar">
                <h2 id="topbar-title">לוח בקרה</h2>
                <button class="btn btn-outline" onclick="refreshCurrentData()"><span class="material-symbols-rounded">refresh</span> רענן נתונים</button>
            </div>
            <div class="content-area" id="view-container">
                </div>
        </div>
    </div>

    <div class="modal-overlay" id="generic-modal">
        <div class="modal">
            <h3 id="modal-title">כותרת מודאל</h3>
            <div id="modal-body"></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="closeModal()">ביטול</button>
                <button class="btn btn-primary" id="modal-save-btn">שמור שינויים</button>
            </div>
        </div>
    </div>

    <script>
        let currentRole = null; // 'admin' or 'user'
        let credentials = null; // pass or code
        let currentView = '';

        // --- UI Utilities ---
        function showLoader(show=true) { document.getElementById('global-loader').classList.toggle('hidden', !show); }
        function showToast(msg, type='success') {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.className = \`toast \${type} show\`;
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        function switchLogin(type) {
            document.getElementById('tab-user').classList.toggle('active', type==='user');
            document.getElementById('tab-admin').classList.toggle('active', type==='admin');
            document.getElementById('form-user').classList.toggle('hidden', type==='admin');
            document.getElementById('form-admin').classList.toggle('hidden', type==='user');
        }

        // --- Fetch Wrapper ---
        async function apiCall(endpoint, method='GET', body=null) {
            showLoader();
            const headers = { 'Content-Type': 'application/json' };
            if(currentRole === 'admin') headers['x-admin-password'] = credentials;
            if(currentRole === 'user') headers['x-user-code'] = credentials;

            try {
                const res = await fetch('/sms' + endpoint, { method, headers, body: body ? JSON.stringify(body) : null });
                const data = await res.json();
                showLoader(false);
                
                if(!res.ok) {
                    if(res.status === 401 || res.status === 403) logout(data.error || "גישה נדחתה");
                    throw new Error(data.error || 'שגיאת רשת');
                }
                return data;
            } catch(e) {
                showLoader(false);
                showToast(e.message, 'error');
                throw e;
            }
        }

        // --- Auth ---
        async function loginAdmin() {
            const pass = document.getElementById('login-pass').value;
            if(!pass) return showToast('הכנס סיסמה', 'error');
            credentials = pass; currentRole = 'admin';
            try {
                await apiCall('/api/admin/codes'); // Test auth
                initAdminApp();
            } catch(e) {}
        }

        async function loginUser() {
            const code = document.getElementById('login-code').value;
            if(!code) return showToast('הכנס קוד', 'error');
            credentials = code; currentRole = 'user';
            try {
                const data = await apiCall('/api/user/data');
                initUserApp(data.user);
            } catch(e) {}
        }

        function logout(msg=null) {
            currentRole = null; credentials = null;
            document.getElementById('app-layout').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('login-pass').value = '';
            document.getElementById('login-code').value = '';
            if(msg) showToast(msg, 'error');
        }

        // --- App Initialization ---
        function initAdminApp() {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-layout').style.display = 'flex';
            document.getElementById('brand-title').textContent = 'ניהול ראשי (Admin)';
            
            const menu = document.getElementById('menu-items');
            menu.innerHTML = \`
                <div class="menu-item" onclick="loadAdminView('users')"><span class="material-symbols-rounded">group</span> ניהול משתמשים</div>
                <div class="menu-item" onclick="loadAdminView('logs')"><span class="material-symbols-rounded">history</span> כל הלוגים</div>
                <div class="menu-item" onclick="loadAdminView('settings')"><span class="material-symbols-rounded">settings</span> הגדרות פורטל</div>
            \`;
            loadAdminView('users');
        }

        function initUserApp(user) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-layout').style.display = 'flex';
            document.getElementById('brand-title').textContent = 'שלום, ' + user.owner_name;
            
            const menu = document.getElementById('menu-items');
            menu.innerHTML = \`
                <div class="menu-item" onclick="loadUserView('systems')"><span class="material-symbols-rounded">dns</span> המערכות שלי</div>
                <div class="menu-item" onclick="loadUserView('logs')"><span class="material-symbols-rounded">manage_search</span> היסטוריית כניסות</div>
            \`;
            loadUserView('systems');
        }

        function refreshCurrentData() {
            if(currentRole === 'admin') loadAdminView(currentView);
            else loadUserView(currentView);
        }

        function setTopbar(title, icon) {
            document.getElementById('topbar-title').innerHTML = \`<span class="material-symbols-rounded" style="color:var(--secondary)">\${icon}</span> \${title}\`;
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            event && event.currentTarget && event.currentTarget.classList.add('active');
        }

        // =====================================
        // ADMIN VIEWS
        // =====================================
        async function loadAdminView(view) {
            currentView = view;
            const container = document.getElementById('view-container');
            
            if(view === 'users') {
                setTopbar('ניהול לקוחות וקודים', 'group');
                const users = await apiCall('/api/admin/codes');
                
                let html = \`
                    <div class="card">
                        <div class="card-header">
                            <h3>רשימת משתמשים</h3>
                            <button class="btn btn-primary" onclick="openAdminUserModal()"><span class="material-symbols-rounded">person_add</span> הוסף משתמש</button>
                        </div>
                        <table>
                            <tr><th>מזהה</th><th>שם</th><th>קוד סודי</th><th>מערכות / מקסימום</th><th>סטטוס</th><th>פעולות</th></tr>
                            \${users.map(u => \`
                                <tr>
                                    <td>#\${u.id}</td><td>\${u.owner_name}</td><td>\${u.code}</td>
                                    <td>\${u.current_systems} / \${u.max_systems}</td>
                                    <td><span class="badge \${u.is_blocked ? 'red' : 'green'}">\${u.is_blocked ? 'חסום' : 'פעיל'}</span></td>
                                    <td>
                                        <button class="btn btn-outline" style="padding:4px 8px" onclick="openAdminUserModal(\${u.id}, '\${u.code}', '\${u.owner_name}', \${u.max_systems}, \${u.is_blocked})">ערוך</button>
                                        <button class="btn btn-danger" style="padding:4px 8px" onclick="deleteUser(\${u.id})">מחק</button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </table>
                    </div>\`;
                container.innerHTML = html;
            }
            
            if(view === 'logs') {
                setTopbar('יומן פעולות גלובלי', 'history');
                const logs = await apiCall('/api/admin/logs');
                container.innerHTML = \`<div class="card"><table>
                    <tr><th>תאריך</th><th>משתמש</th><th>מערכת</th><th>IP</th></tr>
                    \${logs.map(l => \`<tr><td style="direction:ltr">\${new Date(l.timestamp).toLocaleString('he-IL')}</td><td>\${l.owner_name||'נמחק'}</td><td>\${l.description||'נמחק'}</td><td>\${l.ip_address}</td></tr>\`).join('')}
                </table></div>\`;
            }

            if(view === 'settings') {
                setTopbar('הגדרות אבטחה', 'settings');
                container.innerHTML = \`
                    <div class="card" style="max-width:500px">
                        <div class="card-header"><h3>שינוי סיסמת מנהל</h3></div>
                        <div style="padding:20px;">
                            <div class="form-group">
                                <label>סיסמה חדשה (תשמר במסד הנתונים)</label>
                                <input type="password" id="new-admin-pass" class="form-control" />
                            </div>
                            <button class="btn btn-primary" onclick="changeAdminPass()">עדכן סיסמה</button>
                        </div>
                    </div>\`;
            }
        }

        async function changeAdminPass() {
            const newPassword = document.getElementById('new-admin-pass').value;
            if(!newPassword) return;
            await apiCall('/api/admin/settings/password', 'POST', {newPassword});
            showToast('הסיסמה שונתה בהצלחה');
            credentials = newPassword;
            document.getElementById('new-admin-pass').value = '';
        }

        async function deleteUser(id) {
            if(!confirm('מחיקת משתמש תמחק גם את המערכות וההיסטוריה שלו. להמשיך?')) return;
            await apiCall(\`/api/admin/codes/\${id}\`, 'DELETE');
            showToast('משתמש נמחק');
            loadAdminView('users');
        }

        function openAdminUserModal(id=null, code='', name='', max=5, blocked=0) {
            document.getElementById('modal-title').textContent = id ? 'עריכת משתמש' : 'משתמש חדש';
            document.getElementById('modal-body').innerHTML = \`
                <div class="form-group"><label>שם המשתמש/לקוח</label><input type="text" id="m-name" class="form-control" value="\${name}"></div>
                <div class="form-group"><label>קוד סודי אישי</label><input type="text" id="m-code" class="form-control" value="\${code}"></div>
                <div class="form-group"><label>מקסימום מערכות מותרות</label><input type="number" id="m-max" class="form-control" value="\${max}"></div>
                <div class="form-group">
                    <label><input type="checkbox" id="m-block" \${blocked ? 'checked' : ''}> משתמש חסום לגישה</label>
                </div>
            \`;
            document.getElementById('modal-save-btn').onclick = async () => {
                const body = {
                    owner_name: document.getElementById('m-name').value,
                    code: document.getElementById('m-code').value,
                    max_systems: parseInt(document.getElementById('m-max').value),
                    is_blocked: document.getElementById('m-block').checked ? 1 : 0
                };
                if(id) await apiCall(\`/api/admin/codes/\${id}\`, 'PUT', body);
                else await apiCall('/api/admin/codes', 'POST', body);
                
                closeModal(); showToast('נשמר בהצלחה'); loadAdminView('users');
            };
            document.getElementById('generic-modal').classList.add('show');
        }


        // =====================================
        // USER VIEWS
        // =====================================
        async function loadUserView(view) {
            currentView = view;
            const container = document.getElementById('view-container');
            
            if(view === 'systems') {
                setTopbar('המערכות שלי', 'dns');
                const data = await apiCall('/api/user/data');
                
                let html = \`
                    <div style="margin-bottom: 20px; display:flex; gap:15px;">
                        <div class="card" style="margin:0; flex:1; padding:20px; border-left:4px solid var(--secondary)">
                            <div style="font-size:14px; color:#64748b">מערכות בשימוש</div>
                            <div style="font-size:24px; font-weight:bold;">\${data.systems.length} / \${data.user.max_systems}</div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3>רשימת המערכות</h3>
                            <button class="btn btn-primary" onclick="openUserSystemModal(null, '', '')"><span class="material-symbols-rounded">add</span> חיבור מערכת חדשה</button>
                        </div>
                        <table>
                            <tr><th>תיאור</th><th>טוקן חיבור</th><th>פעולות</th></tr>
                            \${data.systems.map(s => \`
                                <tr>
                                    <td>\${s.description}</td><td style="direction:ltr;text-align:left;">\${s.token}</td>
                                    <td>
                                        <button class="btn btn-outline" style="padding:4px 8px" onclick="openUserSystemModal(\${s.id}, '\${s.description}', '\${s.token}')">ערוך</button>
                                        <button class="btn btn-danger" style="padding:4px 8px" onclick="deleteSystem(\${s.id})">הסר</button>
                                    </td>
                                </tr>
                            \`).join('')}
                            \${data.systems.length === 0 ? '<tr><td colspan="3" style="text-align:center">לא חוברו מערכות עדיין</td></tr>' : ''}
                        </table>
                    </div>\`;
                container.innerHTML = html;
            }
            
            if(view === 'logs') {
                setTopbar('היסטוריית כניסות אישית', 'manage_search');
                const logs = await apiCall('/api/user/logs');
                container.innerHTML = \`<div class="card"><table>
                    <tr><th>תאריך וזמן</th><th>מערכת שנבחרה</th><th>כתובת IP שלך</th></tr>
                    \${logs.map(l => \`<tr><td style="direction:ltr">\${new Date(l.timestamp).toLocaleString('he-IL')}</td><td>\${l.description||'מערכת הוסרה'}</td><td>\${l.ip_address}</td></tr>\`).join('')}
                    \${logs.length === 0 ? '<tr><td colspan="3" style="text-align:center">טרם בוצעו כניסות</td></tr>' : ''}
                </table></div>\`;
            }
        }

        async function deleteSystem(id) {
            if(!confirm('להסיר מערכת זו?')) return;
            await apiCall(\`/api/user/systems/\${id}\`, 'DELETE');
            showToast('המערכת הוסרה');
            loadUserView('systems');
        }

        function openUserSystemModal(id, desc, token) {
            document.getElementById('modal-title').textContent = id ? 'עריכת מערכת' : 'הוספת מערכת';
            document.getElementById('modal-body').innerHTML = \`
                <div class="form-group"><label>שם תיאור למערכת (למשל: תמיכה)</label><input type="text" id="s-desc" class="form-control" value="\${desc}"></div>
                <div class="form-group"><label>טוקן ימות המשיח</label><input type="text" id="s-token" class="form-control" value="\${token}" style="direction:ltr"></div>
            \`;
            document.getElementById('modal-save-btn').onclick = async () => {
                const body = { description: document.getElementById('s-desc').value, token: document.getElementById('s-token').value };
                if(!body.description || !body.token) return showToast('מלא את כל השדות', 'error');
                
                try {
                    if(id) await apiCall(\`/api/user/systems/\${id}\`, 'PUT', body);
                    else await apiCall('/api/user/systems', 'POST', body);
                    closeModal(); showToast('נשמר בהצלחה'); loadUserView('systems');
                } catch(e) {} // Error handled in wrapper
            };
            document.getElementById('generic-modal').classList.add('show');
        }

        function closeModal() { document.getElementById('generic-modal').classList.remove('show'); }
    </script>
</body>
</html>`;
