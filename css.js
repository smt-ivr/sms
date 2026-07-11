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

/* --- מסך התחברות מקצועי --- */
#login-screen { background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%); }
.login-box { 
    background: rgba(255, 255, 255, 0.98); 
    width: 90%; max-width: 440px; 
    padding: 45px 35px; 
    border-radius: 24px; 
    box-shadow: 0 20px 50px rgba(0,0,0,0.1); 
    position: relative; display: flex; flex-direction: column; 
    max-height: 95vh; overflow-y: auto;
    border: 1px solid rgba(255,255,255,0.8);
}

.admin-link { position: absolute; top: 20px; left: 20px; text-decoration: none; color: var(--text-muted); display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 500; transition: 0.2s; background: var(--bg-main); padding: 6px 12px; border-radius: 20px;}
.admin-link:hover { color: var(--primary); background: #e0eafc; }

.login-header { text-align: center; margin-bottom: 30px; margin-top: 15px; }
.login-logo-circle {
    width: 70px; height: 70px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    border-radius: 50%; display: flex; justify-content: center; align-items: center;
    margin: 0 auto 15px; color: white; box-shadow: 0 10px 20px rgba(0,122,255,0.2);
}
.login-logo-circle span { font-size: 34px; }
.login-header h2 { font-size: 26px; font-weight: 800; margin-bottom: 5px; color: var(--text-main); }
.login-header p { color: var(--text-muted); font-size: 15px; }

.login-section { border-radius: 16px; padding: 20px; margin-bottom: 15px; transition: 0.3s; }
.primary-login { background: rgba(0, 122, 255, 0.04); border: 2px solid rgba(0, 122, 255, 0.15); box-shadow: 0 4px 15px rgba(0,122,255,0.05); }
.primary-login:hover { border-color: rgba(0, 122, 255, 0.4); box-shadow: 0 6px 20px rgba(0,122,255,0.1); }
.primary-login h4 { color: var(--primary); font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-weight: 700;}
.primary-login p { font-size: 13px; color: var(--text-muted); margin-bottom: 15px; line-height: 1.4; }
.primary-login #personal-code-input { font-size: 18px; font-weight: bold; letter-spacing: 2px; padding: 14px; }
.primary-login .btn-primary { padding: 14px; font-size: 16px; border-radius: 12px; }

.divider-text { display: flex; align-items: center; text-align: center; margin: 25px 0; color: var(--text-muted); font-size: 14px; font-weight: 500;}
.divider-text::before, .divider-text::after { content: ''; flex: 1; border-bottom: 1px solid var(--border); }
.divider-text::before { margin-left: 15px; }
.divider-text::after { margin-right: 15px; }

.secondary-login { background: #f9f9fb; border: 1px solid var(--border); }
.secondary-login h4 { font-size: 14px; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }

.input-group { display: flex; flex-direction: column; gap: 12px; }
input[type="text"], input[type="password"] { width: 100%; padding: 12px 15px; border: 1px solid var(--border); border-radius: 10px; font-size: 15px; text-align: center; background: #fff; transition: 0.3s; font-family: inherit;}
input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }

.btn-primary, .btn-secondary { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: 0.3s; color: #fff; }
.btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); box-shadow: 0 4px 12px rgba(0,122,255,0.2); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,122,255,0.3); }
.btn-secondary { background-color: var(--text-main); }
.btn-secondary:hover { background-color: #333; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

/* --- מבנה אפליקציה ראשית --- */
#app-screen { 
    display: flex; 
    align-items: stretch;
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
    height: 100%;
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

#contacts-list { flex: 1; overflow-y: auto; min-height: 0; }

.contact-item { padding: 15px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s; display: flex; flex-direction: column;}
.contact-item:hover { background: var(--bg-main); }
.contact-item.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.contact-item.active .contact-last-msg, .contact-item.active .contact-time { color: rgba(255,255,255,0.8); }
.contact-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; width: 100%; }
.contact-name { font-weight: 600; font-size: 16px; direction: ltr; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}
.contact-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; margin-right: 10px;}
.contact-last-msg { font-size: 14px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 5px; width: 100%; direction: rtl;}

/* אזור צ'אט */
#chat-area { 
    flex: 1; 
    height: 100%;
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

.message { max-width: 75%; padding: 12px 16px; border-radius: 18px; font-size: 15px; line-height: 1.4; position: relative; word-wrap: break-word; display: flex; flex-direction: column; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);}
.msg-in { background: var(--msg-in); color: var(--msg-in-text); align-self: flex-start; border-bottom-right-radius: 4px; margin-right: auto; }
.msg-out { background: var(--msg-out); color: var(--msg-out-text); align-self: flex-end; border-bottom-left-radius: 4px; margin-left: auto; }
.msg-footer { display: flex; align-items: center; gap: 5px; font-size: 11px; margin-top: 6px; justify-content: flex-end; opacity: 0.8; border-top: 1px solid rgba(128,128,128,0.2); padding-top: 4px;}
.msg-out .msg-footer { color: rgba(255,255,255,0.9); border-top-color: rgba(255,255,255,0.2);}
.msg-in .msg-footer { color: rgba(0,0,0,0.6); }
.status-icon { font-size: 14px !important; }

/* עיצוב קישורים בתוך הודעות */
.chat-link { color: inherit; text-decoration: underline; text-underline-offset: 3px; font-weight: 500; word-break: break-all; }
.chat-link:hover { opacity: 0.8; }

/* שורת כתיבת הודעה */
#chat-input-area { padding: 15px 20px; background: #fff; border-top: 1px solid var(--border); display: flex; gap: 10px; align-items: flex-end; flex-shrink: 0; min-height: 70px; }
#new-message-input { flex: 1; border: 1px solid var(--border); border-radius: 24px; padding: 12px 18px; font-size: 15px; resize: none; max-height: 120px; background: var(--bg-main); outline: none; transition: 0.3s; overflow-y: auto;}
#new-message-input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px rgba(0,122,255,0.1);}
#send-btn { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; margin-bottom: 1px; box-shadow: 0 4px 10px rgba(0,122,255,0.2);}
#send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 14px rgba(0,122,255,0.3);}

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
.loader-overlay, .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 9999; display: flex; justify-content: center; align-items: center; }
.spinner { border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid var(--primary); border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
.spinner-small { border: 3px solid rgba(0,0,0,0.1); border-top: 3px solid #fff; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.loader-text { color: #fff; font-size: 16px; font-weight: 600; text-align: center; }

.modal-box { background: #fff; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); }
.modal-box h3 { margin-bottom: 10px; color: var(--text-main); font-size: 20px;}
.modal-box p { margin-bottom: 25px; font-size: 15px; color: var(--text-muted); line-height: 1.5;}
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.modal-actions button { padding: 10px 20px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s;}
#modal-ok-btn { background: var(--primary); color: #fff; }
#modal-ok-btn:hover { background: var(--primary-dark); }
#modal-cancel-btn { background: var(--bg-main); color: var(--text-main); }
#modal-cancel-btn:hover { background: #e2e8f0; }
#modal-input { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 10px; margin-top: 10px; font-size: 15px; outline: none; transition: 0.3s;}
#modal-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,122,255,0.1); }
`;
