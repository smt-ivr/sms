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
        <div class="spinner"></div>
        <div class="loader-text" id="loader-text-main">מתחבר למערכת...</div>
    </div>

    <div id="system-selector-modal" class="modal-overlay hidden">
        <div class="modal-box">
            <h3>בחר מערכת להתחברות</h3>
            <p>נמצאו מספר מערכות המשויכות לקוד זה</p>
            <div id="system-buttons-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                </div>
            <button id="cancel-system-selector" class="btn-secondary">ביטול</button>
        </div>
    </div>

    <div id="mfa-modal" class="modal-overlay hidden">
        <div class="modal-box mfa-box">
            <button id="mfa-close-btn" class="mfa-close-btn" title="סגור">&times;</button>
            <span class="material-symbols-rounded mfa-icon">security</span>
            <h3>נדרש אימות דו שלבי</h3>
            <p>המערכת מזהה צורך באימות נוסף. לחץ על הכפתור כדי לאשר את החיבור בחלון חדש.</p>
            <a id="mfa-link-btn" href="#" target="_blank" class="btn-primary mfa-action-btn">
                <span class="material-symbols-rounded">open_in_new</span> מעבר לאימות חיבור
            </a>
            <div class="mfa-polling">
                <div class="spinner-small mfa-spinner"></div>
                <span>ממתין שתאשר את החיבור...</span>
            </div>
        </div>
    </div>

    <div id="custom-modal" class="modal-overlay hidden">
        <div class="modal-box">
            <h3 id="modal-title">כותרת</h3>
            <p id="modal-text"></p>
            <input type="text" id="modal-input" class="hidden" placeholder="הזן מספר טלפון..." />
            <div class="modal-actions">
                <button id="modal-cancel-btn" class="btn-secondary hidden">ביטול</button>
                <button id="modal-ok-btn" class="btn-primary">אישור</button>
            </div>
        </div>
    </div>

    <div id="login-screen" class="screen">
        <div class="login-box">
            <div class="login-header">
                <h2>התחברות למערכת</h2>
                <p>נהל את הודעות ה-SMS שלך בקלות</p>
            </div>
            
            <div class="input-group">
                <input type="text" id="username" placeholder="מספר מערכת (לדוגמה: 077...)" autofocus />
                <input type="password" id="password" placeholder="סיסמה" />
                <button id="login-user-btn" class="btn-primary">
                    <span class="material-symbols-rounded">login</span> התחבר עם פרטים
                </button>
            </div>

            <div class="divider">
                <span>או השתמש בקוד</span>
            </div>

            <div class="input-group">
                <input type="password" id="personal-code-input" placeholder="הכנס קוד התחברות אישי..." />
                <button id="login-personal-code-btn" class="btn-primary" style="background-color: #2c3e50;">
                    <span class="material-symbols-rounded">dialpad</span> התחבר עם קוד אישי
                </button>
            </div>

            <div class="divider">
                <span>או Token ישיר</span>
            </div>

            <div class="input-group">
                <input type="text" id="token-input" placeholder="הדבק Token ישירות כאן" />
                <button id="login-token-btn" class="btn-secondary">
                    <span class="material-symbols-rounded">key</span> הכנס עם Token
                </button>
            </div>

            <div id="login-error" class="error-msg"></div>
        </div>
    </div>

    <div id="app-screen" class="screen hidden">
        
        <div id="sidebar">
            <div class="header sidebar-header">
                <h2>השיחות שלי</h2>
                <div class="sidebar-actions">
                    <div id="mfa-status-badge" class="mfa-badge hidden">
                        <span class="material-symbols-rounded badge-icon">verified_user</span>
                        <span>טוקן מאומת</span>
                    </div>
                    <button id="refresh-all-btn" class="icon-btn" title="רענן הכל">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                    <button id="new-chat-btn" class="icon-btn" title="שיחה חדשה">
                        <span class="material-symbols-rounded">edit_square</span>
                    </button>
                    <button id="logout-btn" class="icon-btn" title="התנתק">
                        <span class="material-symbols-rounded">logout</span>
                    </button>
                </div>
            </div>
            <div id="contacts-list"></div>
        </div>

        <div id="chat-area" class="hidden-mobile">
            <div class="header chat-header">
                <div style="display:flex; align-items:center;">
                    <button id="back-btn" class="mobile-only icon-btn">
                        <span class="material-symbols-rounded">arrow_forward</span>
                    </button>
                    <div class="chat-title-info">
                        <h2 id="chat-contact-name">בחר שיחה</h2>
                        <span id="chat-contact-phone" class="subtitle"></span>
                    </div>
                </div>
                <button id="refresh-chat-btn" class="icon-btn hidden" title="רענן שיחה זו">
                    <span class="material-symbols-rounded">refresh</span>
                </button>
            </div>
            
            <div id="chat-messages">
                <div class="empty-state">
                    <span class="material-symbols-rounded empty-state-icon">forum</span>
                    <h3>ברוכים הבאים</h3>
                    <p>בחר איש קשר מהרשימה או התחל שיחה חדשה</p>
                </div>
            </div>
            
            <div id="chat-input-area" class="hidden">
                <textarea id="new-message-input" placeholder="הקלד הודעה... (Ctrl+Enter לשליחה)" rows="1"></textarea>
                <button id="send-btn" class="btn-primary icon-only" title="שלח (Ctrl+Enter)">
                    <span class="material-symbols-rounded">send</span>
                </button>
            </div>
        </div>
    </div>

    <script src="/sms/mfa.js"></script>
    <script src="/sms/app.js"></script>
</body>
</html>`;
