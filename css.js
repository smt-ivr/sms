export default `:root {
    --primary-color: #008069;
    --primary-hover: #006653;
    --bg-main: #eae6df;
    --bg-sidebar: #ffffff;
    --msg-in: #ffffff;
    --msg-out: #d9fdd3;
    --text-dark: #111b21;
    --text-muted: #667781;
    --border-color: #e9edef;
    --header-bg: #f0f2f5;
    --shadow-sm: 0 1px 3px rgba(11,20,26,.08);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
    background-color: var(--bg-main);
    color: var(--text-dark);
    height: 100vh;
    overflow: hidden;
}

.screen { width: 100vw; height: 100vh; display: flex; }
.hidden { display: none !important; }

/* --- Loaders & Modals --- */
.loader-overlay, .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 10000;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
}

.modal-box {
    background: white; padding: 25px 30px; border-radius: 12px; width: 90%; max-width: 360px;
    text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    animation: popIn 0.3s ease-out;
}

@keyframes popIn {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.modal-box h3 { margin-bottom: 10px; color: var(--text-dark); font-size: 20px;}
.modal-box p { margin-bottom: 20px; color: var(--text-muted); font-size: 15px;}
.modal-box input {
    width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;
    font-size: 15px; margin-bottom: 20px; outline: none; text-align: center; direction: ltr;
}
.modal-box input:focus { border-color: var(--primary-color); }

.modal-actions { display: flex; justify-content: center; gap: 10px; }
.modal-actions button { flex: 1; }

.sidebar-loader {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--text-muted);
}

.spinner {
    width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
    border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;
}
/* ספינר קטן לכפתור שליחה והמתנה MFA */
.spinner-small {
    width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white;
    border-radius: 50%; animation: spin 1s linear infinite;
}
.mfa-spinner {
    border: 3px solid rgba(0, 128, 105, 0.2);
    border-top: 3px solid var(--primary-color);
}

.loader-text { font-size: 16px; color: white; font-weight: 500; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* --- MFA Layouts --- */
.mfa-box { position: relative; padding-top: 40px; }
.mfa-icon { font-size: 40px; color: var(--primary-color); margin-bottom: 10px; }
.mfa-close-btn {
    position: absolute; top: 12px; left: 12px;
    background: transparent; border: none; font-size: 26px;
    cursor: pointer; color: var(--text-muted); line-height: 1; transition: color 0.2s;
}
.mfa-close-btn:hover { color: #e74c3c; }
.mfa-action-btn { display: inline-flex; margin-bottom: 25px; text-decoration: none; width: 100%; }
.mfa-polling { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); font-size: 14px;}

.mfa-badge {
    display: flex; align-items: center; gap: 4px;
    background: #e6f4ea; color: #137333;
    padding: 6px 10px; border-radius: 20px;
    font-size: 12px; font-weight: bold; margin-left: 5px;
    border: 1px solid #ceead6; cursor: default;
}
.mfa-badge .badge-icon { font-size: 16px; }

/* --- Login Screen --- */
#login-screen {
    justify-content: center; align-items: center;
    background: linear-gradient(135deg, #f5f7fb 0%, #e5e9f0 100%);
}

.login-box {
    background: white; padding: 40px; border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08); width: 90%; max-width: 420px;
}

.login-header { text-align: center; margin-bottom: 30px; }
.login-header h2 { color: var(--text-dark); font-size: 24px; margin-bottom: 5px; }
.login-header p { color: var(--text-muted); font-size: 14px; }

.input-group { display: flex; flex-direction: column; gap: 12px; }

.login-box input {
    width: 100%; padding: 14px; border: 1px solid var(--border-color);
    border-radius: 8px; font-size: 15px; transition: border-color 0.3s; background: #f9f9f9;
}
.login-box input:focus { border-color: var(--primary-color); outline: none; background: white; }

.btn-primary, .btn-secondary {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 20px; border: none; border-radius: 8px; font-size: 16px;
    font-weight: bold; cursor: pointer; transition: background 0.2s, transform 0.1s;
}

.btn-primary { background-color: var(--primary-color); color: white; }
.btn-primary:hover { background-color: var(--primary-hover); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-secondary { background-color: #e9edef; color: var(--text-dark); }
.btn-secondary:hover { background-color: #d1d7db; }

.icon-only { border-radius: 50%; width: 45px; height: 45px; padding: 0; flex-shrink: 0; }

.divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: var(--text-muted); font-size: 14px; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border-color); }
.divider span { padding: 0 10px; }

.error-msg { color: #e74c3c; text-align: center; margin-top: 15px; font-size: 14px; min-height: 20px; }

/* --- App Layout --- */
#sidebar {
    width: 35%; min-width: 320px; max-width: 450px;
    background: var(--bg-sidebar); border-left: 1px solid var(--border-color);
    display: flex; flex-direction: column;
}

#chat-area {
    flex: 1; display: flex; flex-direction: column; background-color: var(--bg-main); position: relative;
}

#chat-area::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="none"/><circle cx="50" cy="50" r="2" fill="%23000" fill-opacity="0.05"/></svg>');
    opacity: 0.6; z-index: 0;
}

.header {
    background: var(--header-bg); padding: 10px 20px; display: flex; align-items: center;
    justify-content: space-between; height: 65px; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.sidebar-header h2 { font-size: 18px; color: var(--text-dark); }
.sidebar-actions { display: flex; gap: 5px; align-items: center; }

.chat-title-info { display: flex; flex-direction: column; margin-right: 10px;}
.chat-title-info h2 { font-size: 16px; margin: 0; }
.subtitle { font-size: 13px; color: var(--text-muted); }

.icon-btn {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
}
.icon-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-dark); }

/* --- Sidebar Contacts --- */
#contacts-list { flex: 1; overflow-y: auto; background: white; }

.contact-item {
    padding: 12px 15px; border-bottom: 1px solid var(--border-color);
    cursor: pointer; display: flex; flex-direction: column; transition: background 0.2s;
}
.contact-item:hover { background: var(--header-bg); }
.contact-item.active { background: #f0f2f5; }

.contact-top { display: flex; justify-content: space-between; margin-bottom: 4px; align-items: baseline;}
.contact-name { font-weight: 600; font-size: 16px; color: var(--text-dark); direction: ltr; text-align: right;}
.contact-time { font-size: 12px; color: var(--text-muted); }
.contact-last-msg { 
    font-size: 14px; color: var(--text-muted); white-space: nowrap; 
    overflow: hidden; text-overflow: ellipsis; direction: rtl; display: flex; align-items: center; gap: 4px;
}

.status-icon { font-size: 14px !important; vertical-align: middle; }
.status-delivered { color: #53bdeb; } 
.status-expired { color: #f39c12; }
.status-failed { color: #e74c3c; }
.status-pending { color: var(--text-muted); }

/* --- Chat Area --- */
#chat-messages {
    flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; z-index: 1;
}

.empty-state { margin: auto; text-align: center; color: var(--text-muted); }
.empty-state-icon { font-size: 60px !important; margin-bottom: 15px; opacity: 0.5;}

.message {
    max-width: 80%; padding: 8px 12px 6px 12px; margin-bottom: 12px;
    border-radius: 8px; font-size: 15px; line-height: 1.5; position: relative;
    word-wrap: break-word; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;
}

.msg-in { align-self: flex-start; background-color: var(--msg-in); border-top-left-radius: 0; }
.msg-out { align-self: flex-end; background-color: var(--msg-out); border-top-right-radius: 0; }

.message a { color: #0366d6; text-decoration: none; }
.message a:hover { text-decoration: underline; }
.msg-out a { color: #0050a8; }

.msg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 5px; margin-top: 4px; }
.msg-time { font-size: 11px; color: rgba(0,0,0,0.45); }

/* --- Chat Input --- */
#chat-input-area {
    background: var(--header-bg); padding: 12px 20px; display: flex; gap: 12px; z-index: 2; align-items: flex-end;
}
#chat-input-area textarea {
    flex: 1; padding: 12px 20px; border-radius: 24px; border: none; outline: none; font-size: 15px; 
    background: white; resize: none; font-family: inherit; min-height: 45px; max-height: 120px; 
    overflow-y: auto; line-height: 1.4;
}
#chat-input-area textarea:disabled { background: #f0f0f0; }

/* --- Mobile Responsiveness --- */
.mobile-only { display: none; }
@media (max-width: 768px) {
    #sidebar { width: 100%; min-width: 100%; max-width: 100%; border: none;}
    #chat-area { width: 100%; position: absolute; top: 0; left: 0; height: 100%; z-index: 10; }
    .hidden-mobile { display: none !important; }
    .mobile-only { display: flex;}
    .chat-title-info { margin-right: 0; }
    .mfa-badge { display: none !important; }
}`;
