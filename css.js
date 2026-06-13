export default `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');

:root {
    --primary: #007aff;
    --primary-dark: #005bb5;
    --bg-main: #f4f5f7;
    --bg-chat: #ffffff;
    --text-main: #1c1c1e;
    --text-muted: #8e8e93;
    --border: #e5e5ea;
    --msg-in: #e5e5ea;
    --msg-out: #007aff;
    --msg-in-text: #000000;
    --msg-out-text: #ffffff;
    --danger: #ff3b30;
    --success: #34c759;
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', system-ui, sans-serif; }
body { background-color: var(--bg-main); color: var(--text-main); height: 100vh; overflow: hidden; direction: rtl; display: flex; flex-direction: column; }

/* Scrollbar חינני */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }

/* --- מסכי מערכת --- */
.screen { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; position: absolute; inset: 0; transition: opacity 0.3s ease; background-color: var(--bg-main); }
.hidden { display: none !important; }

/* --- התחברות מסודרת למחלקות --- */
#login-screen { background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }
.login-box { background: #fff; width: 90%; max-width: 420px; padding: 35px 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); position: relative; display: flex; flex-direction: column; max-height: 90vh; overflow-y: auto;}

.admin-link { position: absolute; top: 20px; left: 20px; text-decoration: none; color: var(--text-muted); display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 500; transition: 0.2s; }
.admin-link:hover { color: var(--primary); }

.login-header { text-align: center; margin-bottom: 25px; margin-top: 15px; }
.login-header h2 { font-size: 24px; font-weight: 700; margin-bottom: 5px; color: var(--text-main); }
.login-header p { color: var(--text-muted); font-size: 14px; }

.login-section { background: #f9f9f9; border: 1px solid var(--border); border-radius: 14px; padding: 15px; margin-bottom: 15px; transition: 0.2s; }
.login-section:hover { border-color: #d1d1d6; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.login-section h4 { font-size: 14px; color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }

.input-group { display: flex; flex-direction: column; gap: 10px; }
input[type="text"], input[type="password"] { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 15px; text-align: center; background: #fff; transition: 0.2s; }
input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,122,255,0.1); }

.btn-primary, .btn-secondary { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: 0.2s; color: #fff; }
.btn-primary { background-color: var(--primary); }
.btn-primary:hover { background-color: var(--primary-dark); }
.btn-secondary { background-color: #6c757d; }
.btn-secondary:hover { background-color: #5a6268; }

.error-msg { color: var(--danger); font-size: 14px; text-align: center; font-weight: 500; min-height: 20px; }

/* --- מבנה אפליקציה ראשית - מתוקן לגלילה מושלמת --- */
#app-screen { 
    display: flex; 
    align-items: stretch; /* ביטול המרכוז האנכי מההתחברות! זה מה שתוקן */
    justify-content: flex-start;
    width: 100%; 
    height: 100%; 
    max-width: 1400px; 
    margin: 0 auto; 
    background: var(--bg-chat); 
    box-shadow: 0 0 20px rgba(0,0,0,0.05); 
}

/* סרגל צד (אנשי קשר) */
#sidebar { 
    width: 350px; 
    height: 100%; /* גובה מוחלט */
    background: #fff; 
    border-left: 1px solid var(--border); 
    display: flex; 
    flex-direction: column; 
    z-index: 10; 
    flex-shrink: 0; 
}

.sidebar-header { padding: 0 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); background: #fdfdfd; height: 70px; flex-shrink: 0; }
.sidebar-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.sidebar-actions { display: flex; gap: 5px; align-items: center; }

/* אזור הגלילה של השיחות - min-height: 0 חובה כדי שייווצר פס גלילה */
#contacts-list { flex: 1; overflow-y: auto; min-height: 0; }

.contact-item { padding: 15px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s; display: flex; flex-direction: column;}
.contact-item:hover { background: var(--bg-main); }
.contact-item.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.contact-item.active .contact-last-msg, .contact-item.active .contact-time { color: rgba(255,255,255,0.8); }
.contact-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; width: 100%; }
.contact-name { font-weight: 600; font-size: 16px; direction: ltr; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}
.contact-time { font-size: 12px; color: var(--text-muted); flex-shrink: 0; margin-right: 10px;}
.contact-last-msg { font-size: 14px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 5px; width: 100%; direction: rtl;}

/* אזור צ'אט */
#chat-area { 
    flex: 1; 
    height: 100%; /* גובה מוחלט */
    display: flex; 
    flex-direction: column; 
    background: var(--bg-main); 
    min-width: 0; 
}

.chat-header { padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); height: 70px; flex-shrink: 0; }
.chat-title-info { display: flex; flex-direction: column;}
.chat-title-info h2 { font-size: 18px; font-weight: 700; margin: 0; direction: ltr; text-align: right; }
.chat-title-info .subtitle { font-size: 13px; color: var(--text-muted); }

/* אזור ההודעות עצמו */
#chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }

.message { max-width: 75%; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; position: relative; word-wrap: break-word; display: flex; flex-direction: column; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);}
.msg-in { background: var(--msg-in); color: var(--msg-in-text); align-self: flex-start; border-bottom-right-radius: 4px; margin-right: auto; }
.msg-out { background: var(--msg-out); color: var(--msg-out-text); align-self: flex-end; border-bottom-left-radius: 4px; margin-left: auto; }
.msg-footer { display: flex; align-items: center; gap: 5px; font-size: 11px; margin-top: 4px; justify-content: flex-end; opacity: 0.8; }
.msg-out .msg-footer { color: rgba(255,255,255,0.8); }
.msg-in .msg-footer { color: rgba(0,0,0,0.5); }
.status-icon { font-size: 14px !important; }

/* עיצוב קישורים בתוך הודעות */
.chat-link { color: inherit; text-decoration: underline; text-underline-offset: 3px; font-weight: 500; word-break: break-all; }
.chat-link:hover { opacity: 0.8; }

/* שורת כתיבת הודעה */
#chat-input-area { padding: 12px 20px; background: #fff; border-top: 1px solid var(--border); display: flex; gap: 10px; align-items: flex-end; flex-shrink: 0; min-height: 65px; }
#new-message-input { flex: 1; border: 1px solid var(--border); border-radius: 20px; padding: 10px 15px; font-size: 15px; resize: none; max-height: 120px; background: var(--bg-main); outline: none; transition: 0.2s; overflow-y: auto;}
#new-message-input:focus { border-color: var(--primary); background: #fff; }
#send-btn { background: var(--primary); color: #fff; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; margin-bottom: 2px;}
#send-btn:hover { background: var(--primary-dark); transform: scale(1.05); }

/* מצבים ריקים / Loaders */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; margin: auto; }
.empty-state-icon { font-size: 64px !important; margin-bottom: 15px; opacity: 0.3; }
.empty-state h3 { font-size: 20px; color: var(--text-main); margin-bottom: 5px; }

/* כפתורים וכלים */
.icon-btn { background: transparent; border: none; color: var(--primary); cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; transition: 0.2s; }
.icon-btn:hover { background: rgba(0,122,255,0.1); }
.mfa-badge { display: flex; align-items: center; gap: 6px; background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.mfa-badge .badge-icon { font-size: 16px !important; }

/* --- Mobile Responsiveness --- */
.mobile-only { display: none; }
@media (max-width: 768px) {
    .mobile-only { display: flex; }
    #app-screen { flex-direction: column; }
    #sidebar { width: 100%; height: 100%; border-left: none; position: absolute; z-index: 20; transition: transform 0.3s ease; }
    #chat-area { width: 100%; height: 100%; position: absolute; z-index: 10; }
    
    .hidden-mobile { transform: translateX(100%); } 
    #sidebar.hidden-mobile { transform: translateX(100%); pointer-events: none; }
    #chat-area { transform: translateX(0); transition: transform 0.3s ease; }
    
    .chat-header { padding-right: 10px; }
    .chat-title-info { margin-right: 5px; }
}

/* Modals & Loaders Overlay */
.loader-overlay, .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 9999; display: flex; justify-content: center; align-items: center; }
.spinner { border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
.spinner-small { border: 3px solid rgba(0,0,0,0.1); border-top: 3px solid #fff; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.loader-text { color: #fff; font-size: 16px; font-weight: 500; text-align: center; }

.modal-box { background: #fff; padding: 25px; border-radius: 16px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-box h3 { margin-bottom: 10px; color: var(--text-main); }
.modal-box p { margin-bottom: 20px; font-size: 14px; color: var(--text-muted); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-actions button { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 500; cursor: pointer; }
#modal-ok-btn { background: var(--primary); color: #fff; }
#modal-cancel-btn { background: var(--bg-main); color: var(--text-main); }
#modal-input { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-top: 10px; font-size: 15px; }
`;
