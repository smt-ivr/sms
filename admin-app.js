export default `let currentRole = null;
let credentials = null;
let currentView = '';

function showLoader(show=true, text="טוען נתונים...") { 
    document.getElementById('loader-text').textContent = text;
    document.getElementById('global-loader').classList.toggle('hidden', !show); 
}

function showToast(msg, type='success') {
    const toast = document.getElementById('toast');
    toast.innerHTML = \`<span class="material-symbols-rounded">\${type === 'success' ? 'check_circle' : 'error'}</span> \${msg}\`;
    toast.className = \`toast \${type} show\`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function switchLogin(type) {
    document.getElementById('tab-user').classList.toggle('active', type==='user');
    document.getElementById('tab-admin').classList.toggle('active', type==='admin');
    document.getElementById('form-user').classList.toggle('hidden', type==='admin');
    document.getElementById('form-admin').classList.toggle('hidden', type==='user');
}

async function apiCall(endpoint, method='GET', body=null) {
    const headers = { 'Content-Type': 'application/json' };
    if(currentRole === 'admin') headers['x-admin-password'] = credentials;
    if(currentRole === 'user') headers['x-user-code'] = credentials;

    try {
        const res = await fetch('/sms' + endpoint, { method, headers, body: body ? JSON.stringify(body) : null });
        const data = await res.json();
        
        if(!res.ok) {
            if(res.status === 401 || res.status === 403) logout(data.error || "הגישה נדחתה, נא להתחבר מחדש");
            throw new Error(data.error || 'שגיאת רשת בלתי צפויה');
        }
        return data;
    } catch(e) {
        showLoader(false);
        showToast(e.message, 'error');
        throw e;
    }
}

function toggleRegister(show) {
    document.getElementById('login-sections').classList.toggle('hidden', show);
    document.getElementById('register-sections').classList.toggle('hidden', !show);
    document.getElementById('reg-init-section').classList.remove('hidden');
    document.getElementById('reg-verify-section').classList.add('hidden');
}

function isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

async function registerInit() {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const emailConfirm = document.getElementById("reg-email-confirm").value.trim().toLowerCase();
    const code = document.getElementById("reg-code").value.trim();

    if (!name || !email || !emailConfirm || !code) return showToast('נא למלא את כל השדות בצורה תקינה', 'error');
    if (email !== emailConfirm) return showToast('כתובות האימייל שהוזנו אינן תואמות', 'error');
    if (!isValidEmail(email)) return showToast('כתובת האימייל אינה בפורמט חוקי (לדוגמה: name@gmail.com)', 'error');
    if (code.length < 6 || code.length > 15 || !/^\\d+$/.test(code)) return showToast('הקוד הסודי חייב להכיל 6 עד 15 ספרות בלבד', 'error');

    showLoader(true, "מכין חשבון ושולח קוד אימות...");
    try {
        await apiCall('/api/auth/register/init', 'POST', { email, name, personalCode: code });
        showLoader(false);
        document.getElementById('reg-init-section').classList.add('hidden');
        document.getElementById('reg-verify-section').classList.remove('hidden');
        showToast("קוד אימות נשלח בהצלחה למייל!", "success");
    } catch (e) {}
}

async function registerVerify() {
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const name = document.getElementById("reg-name").value.trim();
    const personalCode = document.getElementById("reg-code").value.trim();
    const verifyCode = document.getElementById("reg-verify-code").value.trim();

    if (!verifyCode || verifyCode.length !== 6) return showToast("יש להזין קוד אימות חוקי בעל 6 ספרות", "error");

    showLoader(true, "מאמת ויוצר חשבון...");
    try {
        await apiCall('/api/auth/register/verify', 'POST', { email, verifyCode, name, personalCode });
        showLoader(false);
        showToast("החשבון נוצר בהצלחה! מתחבר...", "success");
        
        toggleRegister(false);
        document.getElementById('login-code').value = personalCode;
        setTimeout(() => { loginUser(); }, 800);
    } catch (e) {}
}

async function loginAdmin() {
    const pass = document.getElementById('login-pass').value;
    if(!pass) return showToast('נא להזין סיסמת מנהל', 'error');
    credentials = pass; currentRole = 'admin';
    showLoader(true, "מאמת הרשאות...");
    try {
        await apiCall('/api/admin/codes'); 
        showLoader(false);
        initAdminApp();
    } catch(e) {}
}

async function loginUser() {
    const code = document.getElementById('login-code').value;
    if(!code) return showToast('נא להזין קוד אישי', 'error');
    credentials = code; currentRole = 'user';
    showLoader(true, "טוען נתוני משתמש...");
    try {
        const data = await apiCall('/api/user/data');
        showLoader(false);
        initUserApp(data.user);
    } catch(e) {}
}

function logout(msg=null) {
    currentRole = null; credentials = null;
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-code').value = '';
    toggleRegister(false);
    if(msg) showToast(msg, 'error');
}

function initAdminApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
    document.getElementById('brand-subtitle').textContent = 'מנהל רשת עליון';
    
    const menu = document.getElementById('menu-items');
    menu.innerHTML = \`
        <div class="menu-item" onclick="loadAdminView('users')"><span class="material-symbols-rounded">group</span> ניהול משתמשים (לקוחות)</div>
        <div class="menu-item" onclick="loadAdminView('logs')"><span class="material-symbols-rounded">manage_search</span> יומן פעולות (Logs)</div>
        <div class="menu-item" onclick="loadAdminView('settings')"><span class="material-symbols-rounded">admin_panel_settings</span> הגדרות פורטל</div>
    \`;
    loadAdminView('users');
}

function initUserApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
    document.getElementById('brand-subtitle').textContent = 'שלום, ' + user.owner_name;
    
    const menu = document.getElementById('menu-items');
    menu.innerHTML = \`
        <div class="menu-item" onclick="loadUserView('systems')"><span class="material-symbols-rounded">dns</span> המערכות שלי</div>
        <div class="menu-item" onclick="loadUserView('logs')"><span class="material-symbols-rounded">history</span> היסטוריית כניסות</div>
        \${user.allow_temp_codes ? \`<div class="menu-item" onclick="loadUserView('temp_codes')"><span class="material-symbols-rounded">timer</span> קודים זמניים (Proxy)</div>\` : ''}
    \`;
    loadUserView('systems');
}

function refreshCurrentData() {
    if(currentRole === 'admin') loadAdminView(currentView);
    else loadUserView(currentView);
}

function setTopbar(title, icon) {
    document.getElementById('topbar-title').innerHTML = \`<span class="material-symbols-rounded" style="color:var(--primary); font-size:28px;">\${icon}</span> \${title}\`;
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
}

async function loadAdminView(view) {
    currentView = view;
    const container = document.getElementById('view-container');
    showLoader();
    
    if(view === 'users') {
        setTopbar('ניהול לקוחות וקודים', 'group');
        const users = await apiCall('/api/admin/codes');
        
        let html = \`
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-rounded">group</span></div>
                    <div class="stat-info"><div>סה"כ לקוחות</div><div>\${users.length}</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-rounded">dns</span></div>
                    <div class="stat-info"><div>מערכות מחוברות</div><div>\${users.reduce((sum, u) => sum + u.current_systems, 0)}</div></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>רשימת משתמשים</h3>
                    <button class="btn-primary" onclick="openAdminUserModal()"><span class="material-symbols-rounded">person_add</span> הוסף משתמש</button>
                </div>
                <table>
                    <tr><th>מזהה</th><th>שם / חברה</th><th>קוד סודי</th><th>ניצול מערכות</th><th>סטטוס</th><th>הרשאת Proxy</th><th>פעולות</th></tr>
                    \${users.map(u => \`
                        <tr>
                            <td>#\${u.id}</td><td style="font-weight:bold;">\${u.owner_name}</td><td>\${u.code}</td>
                            <td>\${u.current_systems} / \${u.max_systems}</td>
                            <td><span class="badge \${u.is_blocked ? 'red' : 'green'}">\${u.is_blocked ? 'חסום' : 'פעיל'}</span></td>
                            <td>\${u.allow_temp_codes ? '<span class="badge green">כן</span>' : '<span class="badge red">לא</span>'}</td>
                            <td>
                                <button class="btn-outline" style="padding:6px 12px; border-radius:8px;" onclick="openAdminUserModal(\${u.id}, '\${u.code}', '\${u.owner_name}', \${u.max_systems}, \${u.is_blocked}, \${u.allow_temp_codes})">ערוך</button>
                                <button class="btn-outline" style="padding:6px 12px; border-radius:8px; border-color:var(--danger); color:var(--danger);" onclick="deleteUser(\${u.id})">מחק</button>
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
            <tr><th>תאריך וזמן</th><th>משתמש</th><th>מערכת</th><th>IP</th></tr>
            \${logs.map(l => \`<tr><td style="direction:ltr">\${new Date(l.timestamp).toLocaleString('he-IL')}</td><td><span class="badge" style="background:#f1f5f9; color:#334155">\${l.owner_name||'נמחק'}</span></td><td>\${l.description||'נמחק'}</td><td style="font-family:monospace">\${l.ip_address}</td></tr>\`).join('')}
        </table></div>\`;
    }

    if(view === 'settings') {
        setTopbar('הגדרות אבטחה', 'admin_panel_settings');
        container.innerHTML = \`
            <div class="card" style="max-width:500px">
                <div class="card-header"><h3>שינוי סיסמת מנהל עליון</h3></div>
                <div style="padding:30px;">
                    <div class="form-group">
                        <label>סיסמה חדשה</label>
                        <input type="password" id="new-admin-pass" class="form-control" placeholder="הקש סיסמה חדשה..." />
                    </div>
                    <button class="btn-primary" onclick="changeAdminPass()" style="width:100%">עדכן סיסמה</button>
                </div>
            </div>\`;
    }
    showLoader(false);
}

async function changeAdminPass() {
    const newPassword = document.getElementById('new-admin-pass').value;
    if(!newPassword) return;
    showLoader();
    await apiCall('/api/admin/settings/password', 'POST', {newPassword});
    showLoader(false);
    showToast('הסיסמה שונתה בהצלחה');
    credentials = newPassword;
    document.getElementById('new-admin-pass').value = '';
}

async function deleteUser(id) {
    if(!confirm('אזהרה: מחיקת משתמש תמחק גם את כל המערכות וההיסטוריה שלו. להמשיך?')) return;
    showLoader();
    await apiCall(\`/api/admin/codes/\${id}\`, 'DELETE');
    showLoader(false);
    showToast('המשתמש הוסר לצמיתות');
    loadAdminView('users');
}

window.openAdminUserModal = function(id=null, code='', name='', max=5, blocked=0, allowTemp=0) {
    document.getElementById('modal-title').textContent = id ? 'עריכת פרטי לקוח' : 'הוספת לקוח חדש';
    document.getElementById('modal-body').innerHTML = \`
        <div class="form-group"><label>שם הלקוח / העסק</label><input type="text" id="m-name" class="form-control" value="\${name}"></div>
        <div class="form-group"><label>קוד התחברות סודי</label><input type="text" id="m-code" class="form-control" value="\${code}"></div>
        <div class="form-group"><label>מכסת מערכות מקסימלית</label><input type="number" id="m-max" class="form-control" value="\${max}"></div>
        <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:20px;">
            <input type="checkbox" id="m-block" \${blocked ? 'checked' : ''} style="width:18px; height:18px;">
            <label style="margin:0; font-size:15px; color:var(--danger)">משתמש חסום לגישה</label>
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:10px;">
            <input type="checkbox" id="m-temp-codes" \${allowTemp ? 'checked' : ''} style="width:18px; height:18px;">
            <label style="margin:0; font-size:15px; color:var(--success)">הרשאה להנפקת קודים זמניים (Proxy)</label>
        </div>
    \`;
    document.getElementById('modal-save-btn').onclick = async () => {
        const body = {
            owner_name: document.getElementById('m-name').value,
            code: document.getElementById('m-code').value,
            max_systems: parseInt(document.getElementById('m-max').value),
            is_blocked: document.getElementById('m-block').checked ? 1 : 0,
            allow_temp_codes: document.getElementById('m-temp-codes').checked ? 1 : 0
        };
        showLoader();
        if(id) await apiCall(\`/api/admin/codes/\${id}\`, 'PUT', body);
        else await apiCall('/api/admin/codes', 'POST', body);
        
        closeModal(); showToast('הפרטים נשמרו בהצלחה'); loadAdminView('users');
    };
    document.getElementById('generic-modal').classList.add('show');
}

async function loadUserView(view) {
    currentView = view;
    const container = document.getElementById('view-container');
    showLoader();
    
    if(view === 'systems') {
        setTopbar('ניהול המערכות שלי', 'dns');
        const data = await apiCall('/api/user/data');
        
        let html = \`
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-rounded">memory</span></div>
                    <div class="stat-info"><div>מערכות בשימוש (מתוך \${data.user.max_systems})</div><div>\${data.systems.length}</div></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>רשימת מערכות מקושרות</h3>
                    <button class="btn-primary" onclick="openUserSystemModal(null, '', '')"><span class="material-symbols-rounded">add</span> חיבור מערכת חדשה</button>
                </div>
                <table>
                    <tr><th>תיאור מערכת</th><th>טוקן חיבור (Token)</th><th>פעולות</th></tr>
                    \${data.systems.map(s => \`
                        <tr>
                            <td style="font-weight:bold;">\${s.description}</td><td style="direction:ltr; font-family:monospace; color:var(--text-muted)">\${s.token}</td>
                            <td>
                                <button class="btn-outline" style="padding:6px 12px; border-radius:8px;" onclick="openUserSystemModal(\${s.id}, '\${s.description}', '\${s.token}')">ערוך</button>
                                <button class="btn-outline" style="padding:6px 12px; border-radius:8px; border-color:var(--danger); color:var(--danger);" onclick="deleteSystem(\${s.id})">הסר</button>
                            </td>
                        </tr>
                    \`).join('')}
                    \${data.systems.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--text-muted)">לא נמצאו מערכות מקושרות לחשבון זה</td></tr>' : ''}
                </table>
            </div>\`;
        container.innerHTML = html;
    }
    
    if(view === 'logs') {
        setTopbar('היסטוריית כניסות לאפליקציה', 'manage_search');
        const logs = await apiCall('/api/user/logs');
        container.innerHTML = \`<div class="card"><table>
            <tr><th>תאריך וזמן</th><th>מערכת שנבחרה</th><th>כתובת IP</th></tr>
            \${logs.map(l => \`<tr><td style="direction:ltr">\${new Date(l.timestamp).toLocaleString('he-IL')}</td><td><span class="badge" style="background:#f1f5f9; color:#334155">\${l.description||'מערכת הוסרה'}</span></td><td style="font-family:monospace">\${l.ip_address}</td></tr>\`).join('')}
            \${logs.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--text-muted)">טרם בוצעו כניסות למערכות</td></tr>' : ''}
        </table></div>\`;
    }

    if(view === 'temp_codes') {
        setTopbar('ניהול קודים זמניים', 'timer');
        const codes = await apiCall('/api/user/temp_codes');
        const { systems } = await apiCall('/api/user/data');
        
        container.innerHTML = \`
            <div class="card">
                <div class="card-header">
                    <h3>קודים פעילים</h3>
                    <button class="btn-primary" onclick="openTempCodeModal('\${encodeURIComponent(JSON.stringify(systems))}')"><span class="material-symbols-rounded">add</span> הנפק קוד</button>
                </div>
                <table>
                    <tr><th>קוד זמני</th><th>מערכת מקושרת</th><th>תפוגה</th><th>שימושים</th><th>סטטוס</th><th>פעולות</th></tr>
                    \${codes.map(c => {
                        const isExpired = Date.now() > c.expires_at;
                        const timeStr = new Date(c.expires_at).toLocaleString('he-IL', {timeZone: 'Asia/Jerusalem'});
                        return \`<tr>
                            <td style="font-family:monospace; font-weight:bold; font-size:16px;">\${c.temp_code}</td>
                            <td>\${c.system_desc}</td>
                            <td style="direction:ltr">\${timeStr}</td>
                            <td>\${c.usage_count}</td>
                            <td><span class="badge \${c.is_active && !isExpired ? 'green' : 'red'}">\${c.is_active ? (isExpired ? 'פג תוקף' : 'פעיל') : 'מושבת'}</span></td>
                            <td>
                                <button class="btn-outline" style="padding:6px; border-radius:8px;" onclick="manageTempCode(\${c.id}, 'extend')">הארך ב-10 דק'</button>
                                <button class="btn-outline" style="padding:6px; border-radius:8px;" onclick="manageTempCode(\${c.id}, 'toggle')">\${c.is_active ? 'השבת' : 'הפעל'}</button>
                                <button class="btn-outline" style="padding:6px; border-radius:8px; border-color:var(--danger); color:var(--danger);" onclick="manageTempCode(\${c.id}, 'delete')">מחק</button>
                            </td>
                        </tr>\`;
                    }).join('')}
                </table>
            </div>\`;
    }

    showLoader(false);
}

async function deleteSystem(id) {
    if(!confirm('להסיר מערכת זו מהחשבון שלך?')) return;
    showLoader();
    await apiCall(\`/api/user/systems/\${id}\`, 'DELETE');
    showLoader(false);
    showToast('המערכת הוסרה בהצלחה');
    loadUserView('systems');
}

window.openUserSystemModal = function(id, desc, token) {
    document.getElementById('modal-title').textContent = id ? 'עריכת פרטי מערכת' : 'הוספת מערכת לחיבור';
    document.getElementById('modal-body').innerHTML = \`
        <div class="form-group"><label>תיאור / שם למערכת (למשל: תמיכה טכנית)</label><input type="text" id="s-desc" class="form-control" value="\${desc}"></div>
        <div class="form-group"><label>טוקן ימות המשיח (Token)</label><input type="text" id="s-token" class="form-control ltr-input" value="\${token}" style="direction:ltr; font-family:monospace;"></div>
    \`;
    document.getElementById('modal-save-btn').onclick = async () => {
        const body = { description: document.getElementById('s-desc').value, token: document.getElementById('s-token').value };
        if(!body.description || !body.token) return showToast('יש למלא את כל השדות', 'error');
        
        showLoader();
        try {
            if(id) await apiCall(\`/api/user/systems/\${id}\`, 'PUT', body);
            else await apiCall('/api/user/systems', 'POST', body);
            closeModal(); showToast('נשמר בהצלחה'); loadUserView('systems');
        } catch(e) { showLoader(false); }
    };
    document.getElementById('generic-modal').classList.add('show');
}

window.openTempCodeModal = function(systemsJson) {
    const systems = JSON.parse(decodeURIComponent(systemsJson));
    if(systems.length === 0) return showToast('אין מערכות מקושרות לחשבון', 'error');
    
    document.getElementById('modal-title').textContent = 'הנפקת קוד זמני חדש';
    document.getElementById('modal-body').innerHTML = \`
        <div class="form-group"><label>בחר מערכת</label>
        <select id="t-system" class="form-control">\${systems.map(s => \`<option value="\${s.id}">\${s.description}</option>\`).join('')}</select></div>
        
        <div class="form-group"><label>זמן פעילות (בדקות)</label>
        <input type="number" id="t-mins" class="form-control" value="10"></div>
        
        <div class="form-group"><label>קוד מותאם אישית (אופציונלי)</label>
        <input type="text" id="t-custom" class="form-control" placeholder="השאר ריק להגרלה אוטומטית"></div>
        
        <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:10px;">
            <input type="checkbox" id="t-numeric" style="width:18px; height:18px;">
            <label style="margin:0; font-size:15px; cursor:pointer;" for="t-numeric">הגרל קוד של ספרות בלבד</label>
        </div>
    \`;
    document.getElementById('modal-save-btn').onclick = async () => {
        const body = { 
            systemId: document.getElementById('t-system').value, 
            durationMinutes: parseInt(document.getElementById('t-mins').value),
            customCode: document.getElementById('t-custom').value,
            isNumeric: document.getElementById('t-numeric').checked
        };
        showLoader();
        try {
            await apiCall('/api/user/temp_codes', 'POST', body);
            closeModal(); showToast('קוד הונפק בהצלחה'); loadUserView('temp_codes');
        } catch(e) { showLoader(false); }
    };
    document.getElementById('generic-modal').classList.add('show');
};

window.manageTempCode = async function(id, action) {
    if(action === 'delete' && !confirm('למחוק את הקוד?')) return;
    showLoader();
    if(action === 'delete') await apiCall(\`/api/user/temp_codes/\${id}\`, 'DELETE');
    else await apiCall(\`/api/user/temp_codes/\${id}\`, 'PUT', {action});
    showLoader(false); loadUserView('temp_codes');
};

function closeModal() { document.getElementById('generic-modal').classList.remove('show'); }

window.loginAdmin = loginAdmin;
window.loginUser = loginUser;
window.logout = logout;
window.switchLogin = switchLogin;
window.toggleRegister = toggleRegister;
window.registerInit = registerInit;
window.registerVerify = registerVerify;
window.refreshCurrentData = refreshCurrentData;
window.loadAdminView = loadAdminView;
window.loadUserView = loadUserView;
window.changeAdminPass = changeAdminPass;
window.deleteUser = deleteUser;
window.deleteSystem = deleteSystem;
window.closeModal = closeModal;
`;
