export default `
:root {
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --secondary: #0f172a;
    --bg-main: #f8fafc;
    --card-bg: #ffffff;
    --text-main: #334155;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --danger: #ef4444;
    --success: #10b981;
    --warning: #f59e0b;
    --info-bg: #eff6ff;
    --info-text: #1e40af;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', sans-serif; }
body { background: var(--bg-main); color: var(--text-main); display: flex; height: 100vh; overflow: hidden; }

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* Loader & Toasts */
#global-loader { position: fixed; inset: 0; background: rgba(255,255,255,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); transition: opacity 0.3s; }
.loader-content { display: flex; flex-direction: column; align-items: center; background: white; padding: 30px; border-radius: 16px; box-shadow: var(--shadow-lg); }
.spinner { border: 4px solid var(--border); width: 40px; height: 40px; border-radius: 50%; border-left-color: var(--primary); animation: spin 1s linear infinite; margin-bottom: 15px; }
@keyframes spin { to { transform: rotate(360deg); } }
#loader-text { font-weight: 600; color: var(--text-main); }

.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); background: var(--secondary); color: white; padding: 14px 28px; border-radius: 10px; box-shadow: var(--shadow-lg); z-index: 10000; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0; font-weight: 500; display: flex; align-items: center; gap: 10px;}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); bottom: 40px; }
.toast.error { background: var(--danger); }
.toast.success { background: var(--success); }

/* Login */
#login-screen { position: absolute; inset: 0; background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%); display: flex; justify-content: center; align-items: center; z-index: 5000; overflow-y: auto; padding: 20px; }
.login-box { background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 24px; box-shadow: var(--shadow-lg); width: 100%; max-width: 440px; text-align: center; border: 1px solid rgba(255,255,255,0.5); }
.login-header h2 { font-weight: 800; font-size: 24px; color: var(--secondary); margin: 15px 0 5px; }
.login-header p { color: var(--text-muted); font-size: 14px; margin-bottom: 25px; }
.logo-icon { width: 70px; height: 70px; background: var(--primary); color: white; border-radius: 20px; display: inline-flex; justify-content: center; align-items: center; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3); }
.logo-icon span { font-size: 40px; }

.login-tabs { display: flex; background: var(--bg-main); padding: 6px; border-radius: 12px; margin-bottom: 25px; }
.login-tab { flex: 1; padding: 12px; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 14px; color: var(--text-muted); transition: 0.3s; }
.login-tab.active { background: white; box-shadow: var(--shadow-sm); color: var(--primary); }

.input-wrapper { position: relative; margin-bottom: 15px; }
.input-icon { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 20px; }
.login-input { width: 100%; padding: 14px 45px 14px 15px; border: 2px solid var(--border); border-radius: 12px; font-size: 15px; background: #fff; transition: 0.3s; font-family: inherit;}
.login-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
.ltr-input { direction: ltr; text-align: left; padding: 14px 15px 14px 45px; }
.ltr-input + .input-icon { right: auto; left: 15px; }
.verify-input { text-align: center; letter-spacing: 10px; font-size: 24px; font-weight: bold; padding-right: 15px;}

.btn-primary, .btn-success, .btn-outline, .btn-link { padding: 14px 20px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: 0.3s; display: inline-flex; justify-content: center; align-items: center; gap: 8px; border: none; }
.btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); }
.btn-success { background: var(--success); color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
.btn-success:hover { background: #059669; transform: translateY(-2px); }
.btn-outline { background: transparent; color: var(--text-main); border: 2px solid var(--border); }
.btn-outline:hover { border-color: var(--text-muted); background: var(--bg-main); }
.btn-link { background: transparent; color: var(--text-muted); font-weight: 500; }
.btn-link:hover { color: var(--primary); text-decoration: underline; }
.btn-full { width: 100%; }

.divider { display: flex; align-items: center; text-align: center; margin: 25px 0; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border); }
.divider span { padding: 0 15px; color: var(--text-muted); font-size: 14px; font-weight: 500; }
.alert { padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; margin-bottom: 20px; text-align: right; }
.alert-info { background: var(--info-bg); color: var(--info-text); border: 1px solid rgba(30, 64, 175, 0.1); }
.alert-warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
.alert span { font-size: 24px; }

/* Layout */
#app-layout { display: none; width: 100%; height: 100%; }
#sidebar { width: 280px; background: var(--secondary); color: white; display: flex; flex-direction: column; flex-shrink: 0; box-shadow: var(--shadow-lg); z-index: 10; }
.brand { padding: 25px 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.2); }
.brand-icon { background: var(--primary); width: 40px; height: 40px; border-radius: 10px; display: flex; justify-content: center; align-items: center; }
.brand-text { display: flex; flex-direction: column; }
.brand-title { font-weight: 800; font-size: 18px; letter-spacing: 1px; }
.brand-subtitle { font-size: 13px; color: #94a3b8; }

.nav-menu { padding: 15px 10px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
.menu-item { padding: 14px 20px; cursor: pointer; display: flex; align-items: center; gap: 15px; border-radius: 10px; transition: 0.2s; font-weight: 500; color: #cbd5e1; }
.menu-item:hover { background: rgba(255,255,255,0.05); color: white; }
.menu-item.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.menu-bottom { flex: none; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto; }
.text-danger:hover { background: rgba(239, 68, 68, 0.1) !important; color: #f87171 !important; }

#main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-main); }
.topbar { height: 80px; background: var(--card-bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
.topbar h2 { font-size: 22px; font-weight: 800; color: var(--secondary); display: flex; align-items: center; gap: 12px;}
.topbar-actions { display: flex; gap: 15px; }
.btn-icon { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--card-bg); display: flex; justify-content: center; align-items: center; cursor: pointer; color: var(--text-muted); transition: 0.2s; }
.btn-icon:hover { background: var(--bg-main); color: var(--primary); border-color: var(--primary); }

.content-area { padding: 40px; overflow-y: auto; flex: 1; }

/* Cards & Grid */
.card { background: var(--card-bg); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); margin-bottom: 30px; overflow: hidden; }
.card-header { padding: 25px 30px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--secondary); }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: var(--card-bg); border-radius: 16px; padding: 25px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 20px; border-right: 4px solid var(--primary); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; background: rgba(37,99,235,0.1); color: var(--primary); display: flex; justify-content: center; align-items: center; font-size: 24px; }
.stat-info div:first-child { color: var(--text-muted); font-size: 14px; font-weight: 500; margin-bottom: 5px; }
.stat-info div:last-child { font-size: 28px; font-weight: 800; color: var(--secondary); }

/* Tables */
table { width: 100%; border-collapse: collapse; }
th, td { padding: 18px 30px; text-align: right; border-bottom: 1px solid var(--border); }
th { color: var(--text-muted); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #f8fafc; }
td { font-weight: 500; font-size: 15px; }

.badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block; }
.badge.green { background: #d1fae5; color: #059669; }
.badge.red { background: #fee2e2; color: #dc2626; }
.badge.blue { background: #dbeafe; color: #2563eb; }
.badge.orange { background: #ffedd5; color: #ea580c; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 6000; opacity: 0; visibility: hidden; transition: 0.3s; backdrop-filter: blur(4px);}
.modal-overlay.show { opacity: 1; visibility: visible; }
.modal { background: var(--card-bg); border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; transform: scale(0.95) translateY(20px); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: var(--shadow-lg); overflow: hidden; }
.modal-large { max-width: 650px; }
.modal-overlay.show .modal { transform: scale(1) translateY(0); }
.modal-header { padding: 25px 30px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; flex-shrink: 0;}
.modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: var(--secondary); }
.close-btn { background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
.close-btn:hover { color: var(--danger); transform: rotate(90deg); }
.modal-body { padding: 30px; overflow-y: auto; flex: 1; }
.modal-actions { padding: 20px 30px; background: #f8fafc; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 15px; flex-shrink: 0;}

/* Forms inside modal */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--text-main); }
.form-control { width: 100%; padding: 12px 15px; border: 2px solid var(--border); border-radius: 10px; font-size: 15px; font-family: inherit; transition: 0.3s; background:#fff; }
.form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
textarea.form-control { resize: vertical; min-height: 100px; }
select.form-control { cursor: pointer; }

/* Grid Helper */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

/* Ticket Message View */
.ticket-message-box { background: #f8fafc; border: 1px solid var(--border); padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 15px; white-space: pre-wrap; color: var(--text-main); }
.ticket-response-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 10px; font-size: 15px; white-space: pre-wrap; color: #1e40af; margin-top: 10px; }

.hidden { display: none !important; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
