export default `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>מערכת הודעות - ימות המשיח</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    <link rel="stylesheet" href="/sms/style.css">
</head>
<body>

    <div id="loader" class="loader-overlay hidden">
        <div>
            <div class="spinner"></div>
            <div class="loader-text" id="loader-text-main">מתחבר למערכת...</div>
        </div>
    </div>

    <div id="system-selector-modal" class="modal-overlay hidden">
        <div class="modal-box">
            <h3>בחר מערכת</h3>
            <p>מצאנו מספר מערכות המשויכות לקוד שלך, בחר לאיזו להיכנס:</p>
            <div id="system-buttons-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;"></div>
            <div class="modal-actions">
                <button id="cancel-system-selector" style="background:var(--bg-main); width:100%;">ביטול</button>
            </div>
        </div>
    </div>

    <div id="custom-modal" class="modal-overlay hidden">
        <div class="modal-box">
            <h3 id="modal-title">כותרת</h3>
            <p id="modal-text"></p>
            <input type="text" id="modal-input" class="hidden" placeholder="" autocomplete="off" />
            <div class="modal-actions">
                <button id="modal-cancel-btn" class="hidden">ביטול</button>
                <button id="modal-ok-btn">אישור</button>
            </div>
        </div>
    </div>

    <div id="mfa-modal" class="modal-overlay hidden">
        <div class="modal-box" style="text-align:center;">
            <span class="material-symbols-rounded" style="font-size:48px; color:var(--primary);">security</span>
            <h3>נדרש אימות דו שלבי</h3>
            <p>המערכת מזהה צורך באימות נוסף. לחץ כדי לאשר בחלון חדש.</p>
            <a id="mfa-link-btn" href="#" target="_blank" class="btn-primary" style="margin-bottom:15px; text-decoration:none;">מעבר לאימות</a>
            <div style="font-size:13px; color:var(--text-muted);"><div class="spinner-small" style="display:inline-block; border-top-color:var(--primary); width:12px; height:12px; margin-left:5px;"></div>ממתין לאישור...</div>
        </div>
    </div>

    <div id="login-screen" class="screen">
        <div class="login-box" style="position: relative;">
            
            <a href="/sms/manage-tokens" style="position: absolute; top: 20px; left: 20px; text-decoration: none; color: var(--text-muted); display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 500; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">
                <span class="material-symbols-rounded" style="font-size: 18px;">admin_panel_settings</span> לניהול
            </a>

            <div class="login-header" style="margin-top: 10px;">
                <span class="material-symbols-rounded" style="font-size:48px; color:var(--primary);">chat</span>
                <h2>הודעות SMS</h2>
                <p>התחברות מהירה למערכת שלך</p>
            </div>
            
            <div class="input-group">
                <input type="password" id="personal-code-input" placeholder="הכנס קוד אישי..." autofocus />
                <button id="login-personal-code-btn" class="btn-primary">
                    <span class="material-symbols-rounded">login</span> כניסה מאובטחת
                </button>
            </div>

            <div class="divider"><span>או התחברות טכנית</span></div>

            <div class="input-group" style="margin-bottom: 10px;">
                <input type="text" id="username" placeholder="מספר מערכת (לדוגמה: 077...)" />
                <input type="password" id="password" placeholder="סיסמה" />
                <button id="login-user-btn" class="btn-secondary" style="background-color: var(--text-main); color: white;">
                    <span class="material-symbols-rounded">account_circle</span> התחבר עם פרטים
                </button>
            </div>

            <div class="input-group">
                <input type="text" id="token-input" placeholder="הדבק Token ישירות כאן" />
                <button id="login-token-btn" class="btn-secondary">הכנס עם טוקן</button>
            </div>

            <div id="login-error" class="error-msg"></div>
        </div>
    </div>

    <div id="app-screen" class="screen hidden">
        
        <div id="sidebar">
            <div class="sidebar-header">
                <h2>הודעות</h2>
                <div class="sidebar-actions">
                    <div id="mfa-status-badge" class="mfa-badge hidden"><span class="material-symbols-rounded badge-icon">verified_user</span></div>
                    <button id="new-chat-btn" class="icon-btn" title="שיחה חדשה"><span class="material-symbols-rounded">edit_square</span></button>
                    <button id="logout-btn" class="icon-btn" title="התנתק" style="color:var(--danger);"><span class="material-symbols-rounded">logout</span></button>
                </div>
            </div>
            <div id="contacts-list"></div>
        </div>

        <div id="chat-area">
            <div class="chat-header">
                <div style="display:flex; align-items:center;">
                    <button id="back-btn" class="mobile-only icon-btn" style="margin-left:10px;">
                        <span class="material-symbols-rounded">arrow_forward</span>
                    </button>
                    <div class="chat-title-info">
                        <h2 id="chat-contact-name">בחר שיחה</h2>
                        <span id="chat-contact-phone" class="subtitle"></span>
                    </div>
                </div>
            </div>
            
            <div id="chat-messages">
                <div class="empty-state">
                    <span class="material-symbols-rounded empty-state-icon">forum</span>
                    <h3>ברוכים הבאים</h3>
                    <p>בחר איש קשר או התחל שיחה חדשה</p>
                </div>
            </div>
            
            <div id="chat-input-area" class="hidden">
                <textarea id="new-message-input" placeholder="הקלד הודעה..." rows="1"></textarea>
                <button id="send-btn" title="שלח"><span class="material-symbols-rounded">send</span></button>
            </div>
        </div>
    </div>

    <script src="/sms/mfa.js"></script>
    <script src="/sms/app.js"></script>
</body>
</html>`;
