export default `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S.M.T - פורטל ניהול מערכות</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/sms/admin-style.css">
</head>
<body>

    <div id="global-loader" class="hidden">
        <div class="loader-content">
            <div class="spinner"></div>
            <div id="loader-text">טוען נתונים...</div>
        </div>
    </div>
    <div id="toast" class="toast">הודעה</div>

    <div id="login-screen">
        <div class="login-box glass-panel">
            <div class="login-header">
                <div class="logo-icon">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </div>
                <h2>ברוך הבא לפורטל</h2>
                <p>התחבר או צור חשבון כדי לנהל את המערכות שלך</p>
            </div>
            
            <div id="login-sections">
                <div class="login-tabs">
                    <div class="login-tab active" onclick="switchLogin('user')" id="tab-user">לקוח מסוף</div>
                    <div class="login-tab" onclick="switchLogin('admin')" id="tab-admin">מנהל רשת</div>
                </div>

                <div id="form-user" class="fade-in">
                    <div class="input-wrapper">
                        <span class="material-symbols-rounded input-icon">password</span>
                        <input type="password" id="login-code" class="login-input" placeholder="הכנס קוד אישי..." />
                    </div>
                    <button class="btn-primary btn-full" onclick="loginUser()">התחבר לחשבון</button>
                    
                    <div class="divider"><span>או</span></div>
                    
                    <button class="btn-outline btn-full" onclick="toggleRegister(true)">
                        <span class="material-symbols-rounded" style="font-size:18px;">person_add</span>
                        אין לך חשבון? הירשם עכשיו
                    </button>
                </div>

                <div id="form-admin" class="hidden fade-in">
                    <div class="input-wrapper">
                        <span class="material-symbols-rounded input-icon">admin_panel_settings</span>
                        <input type="password" id="login-pass" class="login-input" placeholder="הכנס סיסמת מנהל..." />
                    </div>
                    <button class="btn-primary btn-full" onclick="loginAdmin()">התחבר למערכת</button>
                </div>
            </div>

            <div id="register-sections" class="hidden fade-in">
                <h3 class="register-title">יצירת חשבון לקוח חדש</h3>
                
                <div id="reg-init-section">
                    <div class="input-wrapper"><span class="material-symbols-rounded input-icon">badge</span><input type="text" id="reg-name" class="login-input" placeholder="שם מלא / שם העסק" /></div>
                    <div class="input-wrapper"><span class="material-symbols-rounded input-icon">mail</span><input type="email" id="reg-email" class="login-input ltr-input" placeholder="כתובת אימייל" /></div>
                    <div class="input-wrapper"><span class="material-symbols-rounded input-icon">mark_email_read</span><input type="email" id="reg-email-confirm" class="login-input ltr-input" placeholder="אימות כתובת אימייל" /></div>
                    <div class="input-wrapper"><span class="material-symbols-rounded input-icon">dialpad</span><input type="password" id="reg-code" class="login-input" placeholder="בחר קוד סודי (6-15 ספרות)" /></div>
                    
                    <button class="btn-success btn-full" onclick="registerInit()" style="margin-top: 10px;">שלח קוד אימות למייל</button>
                </div>

                <div id="reg-verify-section" class="hidden">
                    <div class="alert alert-info">
                        <span class="material-symbols-rounded">forward_to_inbox</span>
                        <div>קוד אימות בן 6 ספרות נשלח כעת לאימייל שלך.</div>
                    </div>
                    <div class="input-wrapper"><input type="text" id="reg-verify-code" class="login-input verify-input" placeholder="000000" maxlength="6" /></div>
                    <button class="btn-success btn-full" onclick="registerVerify()">אמת חשבון והיכנס</button>
                </div>

                <button class="btn-link" onclick="toggleRegister(false)" style="margin-top:20px;">חזרה למסך התחברות</button>
            </div>
            
        </div>
    </div>

    <div id="app-layout">
        <div id="sidebar">
            <div class="brand">
                <div class="brand-icon"><span class="material-symbols-rounded">cloud_done</span></div>
                <div class="brand-text">
                    <span class="brand-title">S.M.T Systems</span>
                    <span id="brand-subtitle" class="brand-subtitle">פורטל ניהול</span>
                </div>
            </div>
            <div id="menu-items" class="nav-menu"></div>
            <div class="menu-bottom nav-menu">
                <div class="menu-item text-danger" onclick="logout()"><span class="material-symbols-rounded">logout</span> יציאה מהחשבון</div>
            </div>
        </div>
        
        <div id="main-content">
            <div class="topbar">
                <h2 id="topbar-title">לוח בקרה</h2>
                <div class="topbar-actions">
                    <button class="btn-icon" onclick="refreshCurrentData()" title="רענן נתונים"><span class="material-symbols-rounded">refresh</span></button>
                </div>
            </div>
            <div class="content-area" id="view-container"></div>
        </div>
    </div>

    <div class="modal-overlay" id="generic-modal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modal-title">כותרת מודאל</h3>
                <button class="close-btn" onclick="closeModal()"><span class="material-symbols-rounded">close</span></button>
            </div>
            <div id="modal-body" class="modal-body"></div>
            <div class="modal-actions">
                <button class="btn-outline" onclick="closeModal()">ביטול</button>
                <button class="btn-primary" id="modal-save-btn">שמור שינויים</button>
            </div>
        </div>
    </div>

    <script src="/sms/admin-app.js"></script>
</body>
</html>`;
