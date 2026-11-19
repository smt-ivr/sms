export default `const API_BASE = "https://www.call2all.co.il/ym/api";
let token = localStorage.getItem("ym_token") || "";
let activeContact = null;
let conversations = {};
let lastDataHash = ""; 
let pollInterval = null; 
let isTempMode = localStorage.getItem("ym_is_temp") === "true";

const loader = document.getElementById("loader");
const loaderTextMain = document.getElementById("loader-text-main");
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");

const contactsListEl = document.getElementById("contacts-list");
const chatMessagesEl = document.getElementById("chat-messages");
const chatTitleEl = document.getElementById("chat-contact-name");
const chatPhoneEl = document.getElementById("chat-contact-phone");
const sidebar = document.getElementById("sidebar");
const chatArea = document.getElementById("chat-area");
const chatInputArea = document.getElementById("chat-input-area");
const newMessageInput = document.getElementById("new-message-input");
const sendBtn = document.getElementById("send-btn");
const mfaStatusBadge = document.getElementById("mfa-status-badge");

const modal = document.getElementById("custom-modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const modalInput = document.getElementById("modal-input");
const modalOkBtn = document.getElementById("modal-ok-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
let modalCallback = null;

// הרשאות הקוד הזמני (מתקבל מ-/api/proxy/info)
let tempInfo = null;
// קודי שגיאה מהפרוקסי שמחייבים התנתקות
const TEMP_AUTH_ERRORS = ["MISSING_TEMP_CODE", "INVALID_TEMP_CODE", "TEMP_CODE_DISABLED", "TEMP_CODE_EXPIRED", "OWNER_BLOCKED", "IP_NOT_ALLOWED"];

class ApiError extends Error {
    constructor(code, message, status) {
        super(message || code);
        this.code = code;
        this.status = status;
    }
}

async function proxyRequest(endpoint, paramsStr = "") {
    let res, data;
    try {
        res = await fetch(\`/sms/api/proxy/\${endpoint}\${paramsStr ? "?" + paramsStr : ""}\`, { headers: { 'x-temp-code': token } });
    } catch (e) {
        throw new ApiError("NETWORK_ERROR", "שגיאת רשת מול השרת", 0);
    }
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || data.ok === false) {
        throw new ApiError(data?.code || "UNKNOWN_ERROR", data?.error || "שגיאה לא צפויה", res.status);
    }
    return data;
}

// פונקציית fetch מאוחדת התומכת בפרוקסי - מחזירה תמיד אובייקט JSON
async function apiFetch(endpoint, paramsStr) {
    if (isTempMode) return proxyRequest(endpoint, paramsStr);
    const res = await fetch(\`\${API_BASE}/\${endpoint}?token=\${token}&\${paramsStr}\`);
    return res.json();
}

function canTemp(perm) {
    return !isTempMode || !tempInfo || !!tempInfo.permissions[perm];
}

// ניהול הודעות שגיאה במסך התחברות
function showError(msg) {
    document.getElementById("login-error-text").textContent = msg;
    document.getElementById("login-error").classList.remove("hidden");
}
function hideError() {
    document.getElementById("login-error").classList.add("hidden");
}

window.addEventListener("DOMContentLoaded", () => {
    if (window.innerWidth <= 768) chatArea.classList.add("hidden-mobile");
    checkUrlParams();
    if (token) {
        verifyAndLoad();
    } else {
        const pInput = document.getElementById("personal-code-input");
        if(pInput) pInput.focus();
    }
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUser = urlParams.get('username');
    const urlPass = urlParams.get('password');
    const urlCode = (urlParams.get('code') || '').trim();

    if (urlCode) {
        // קישור עם קוד גובר על חיבור שמור קודם
        localStorage.removeItem("ym_token");
        localStorage.removeItem("ym_is_temp");
        token = "";
        isTempMode = false;
        document.getElementById("personal-code-input").value = urlCode;
        cleanUrl();
        loginWithCode(urlCode);
    } else if (urlToken) {
        token = urlToken;
        localStorage.setItem("ym_token", token);
        isTempMode = false;
        localStorage.setItem("ym_is_temp", "false");
        cleanUrl();
    } else if (urlUser && urlPass) {
        loginWithCredentials(urlUser, urlPass);
        cleanUrl();
    }
}

function cleanUrl() {
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({path: newUrl}, '', newUrl);
}

async function verifyAndLoad() {
    if (isTempMode) {
        loader.classList.remove("hidden");
        loaderTextMain.textContent = "מאמת קוד זמני...";
        try {
            const data = await proxyRequest("info");
            tempInfo = data.tempCode;
        } catch (e) {
            loader.classList.add("hidden");
            logoutProcess();
            showError(e.message);
            return;
        }
        loader.classList.add("hidden");
        showApp();
        applyTempRestrictions();
        loadAllMessages();
        pollInterval = setInterval(() => loadAllMessages(true), 10000);
        return;
    }
    tempInfo = null;
    document.getElementById("new-chat-btn").classList.remove("hidden");

    loader.classList.remove("hidden");
    loaderTextMain.textContent = "מאמת נתונים...";
    
    startMfaFlow(token, (reason) => {
        loader.classList.add("hidden");
        showApp();
        if(mfaStatusBadge) {
            mfaStatusBadge.classList.remove("hidden");
            const reasonText = typeof translateMfaReason === 'function' ? translateMfaReason(reason) : reason || "";
            mfaStatusBadge.innerHTML = \`<span class="material-symbols-rounded badge-icon">verified_user</span>
            <div style="display:flex; flex-direction:column; line-height:1.1;">
                <span>טוקן מאומת</span>
                <span style="font-size:9px; opacity:0.8; font-weight:normal;">\${reasonText}</span>
            </div>\`;
        }
        loadAllMessages();
        pollInterval = setInterval(() => loadAllMessages(true), 10000);
        
    }, (err) => {
        loader.classList.add("hidden");
        showError(err || "פג תוקף או שגיאת אימות");
        logoutProcess();
    });
}

// התאמת הממשק להרשאות של הקוד הזמני
function applyTempRestrictions() {
    const phonesText = tempInfo.restricted ? tempInfo.phones.join(", ") : "כל המספרים";
    const expires = tempInfo.permanent
        ? "ללא הגבלת זמן"
        : "עד " + new Date(tempInfo.expiresAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    if (mfaStatusBadge) {
        mfaStatusBadge.classList.remove("hidden");
        mfaStatusBadge.title = \`מספרים: \${phonesText}\\nתוקף: \${expires}\`;
        mfaStatusBadge.innerHTML = \`<span class="material-symbols-rounded badge-icon">\${tempInfo.restricted ? 'lock_person' : 'timer'}</span>
        <div style="display:flex; flex-direction:column; line-height:1.1;">
            <span>\${tempInfo.restricted ? 'גישה מוגבלת' : 'חיבור מאובטח'}</span>
            <span style="font-size:9px; opacity:0.8; font-weight:normal;">\${expires}</span>
        </div>\`;
    }

    // שיחה חדשה מותרת רק אם יש הרשאת שליחה ואין הגבלת מספרים
    const allowNewChat = tempInfo.permissions.send && !tempInfo.restricted;
    document.getElementById("new-chat-btn").classList.toggle("hidden", !allowNewChat);
}

function showApp() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
}

function logoutProcess() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    localStorage.removeItem("ym_token");
    localStorage.removeItem("ym_is_temp");
    token = "";
    isTempMode = false;
    tempInfo = null;
    document.getElementById("new-chat-btn").classList.remove("hidden");
    lastDataHash = "";
    conversations = {};
    activeContact = null;

    contactsListEl.innerHTML = "";
    chatMessagesEl.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">forum</span><h3>התנתקת מהמערכת</h3></div>';
    
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    chatInputArea.classList.add("hidden");
    if(mfaStatusBadge) mfaStatusBadge.classList.add("hidden");
    
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("token-input").value = "";
    document.getElementById("personal-code-input").value = "";
    hideError();
    document.getElementById("personal-code-input").focus();

    if (window.innerWidth <= 768) {
        chatArea.classList.add("hidden-mobile");
        sidebar.classList.remove("hidden-mobile");
    }
}

document.getElementById("logout-btn").addEventListener("click", logoutProcess);
document.getElementById("refresh-btn").addEventListener("click", () => loadAllMessages(false));

function showCustomAlert(title, text) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalInput.classList.add("hidden");
    modalCancelBtn.classList.add("hidden");
    modal.classList.remove("hidden");
    modalCallback = null;
    modalOkBtn.focus();
}

function showCustomPrompt(title, text, placeholder, callback) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalInput.value = "";
    modalInput.placeholder = placeholder;
    modalInput.classList.remove("hidden");
    modalCancelBtn.classList.remove("hidden");
    modal.classList.remove("hidden");
    modalCallback = callback;
    modalInput.focus();
}

modalOkBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    if (modalCallback) modalCallback(modalInput.value);
});

modalCancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    modalCallback = null;
});

modalInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") modalOkBtn.click();
});

document.getElementById("back-btn").addEventListener("click", () => {
    chatArea.classList.add("hidden-mobile");
    sidebar.classList.remove("hidden-mobile");
    activeContact = null;
    chatInputArea.classList.add("hidden");
    renderContacts();
});

document.getElementById("new-chat-btn").addEventListener("click", () => {
    showCustomPrompt("שיחה חדשה", "הזן מספר טלפון להודעה:", "לדוגמה: 0501234567", (phone) => {
        if (phone && phone.trim() !== "") {
            const normalizedPhone = normalizePhone(phone.trim());
            activeContact = normalizedPhone;
            
            if (conversations[activeContact]) {
                renderChat(activeContact);
            } else {
                chatTitleEl.textContent = activeContact;
                chatPhoneEl.textContent = "שיחה חדשה";
                chatMessagesEl.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>שיחה חדשה</h3><p>שלח הודעה כדי להתחיל</p></div>';
                chatInputArea.classList.remove("hidden");
            }
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add("hidden-mobile");
                chatArea.classList.remove("hidden-mobile");
            }
            newMessageInput.focus();
        }
    });
});

async function loadAllMessages(isSilent = false) {
    if (!isSilent) loader.classList.remove("hidden");
    
    try {
        const empty = { responseStatus: "OK", rows: [] };
        const [dataIn, dataOut] = await Promise.all([
            canTemp("incoming") ? apiFetch('GetIncomingSms', 'limit=3000') : empty,
            canTemp("outgoing") ? apiFetch('GetSmsOutLog', 'limit=3000') : empty,
        ]);

        if (dataIn.responseStatus !== "OK" || dataOut.responseStatus !== "OK") throw new Error("Token invalid");

        const currentHash = JSON.stringify(dataIn.rows) + JSON.stringify(dataOut.rows);
        if (isSilent && currentHash === lastDataHash) return;
        lastDataHash = currentHash;

        processMessages(dataIn.rows || [], dataOut.rows || []);
    } catch (e) {
        // שגיאת הרשאה של קוד זמני (פג תוקף / הושבת) - התנתקות גם בריענון שקט
        if (e instanceof ApiError && TEMP_AUTH_ERRORS.includes(e.code)) {
            logoutProcess();
            showError(e.message);
            return;
        }
        if (!isSilent) {
            console.error(e);
            if (e instanceof ApiError) {
                showCustomAlert("שגיאה", e.message);
            } else if (e.message && (e.message.includes("Token invalid") || e.message.includes("Token expired"))) {
                logoutProcess();
            }
        }
    } finally {
        if (!isSilent) loader.classList.add("hidden");
    }
}

function processMessages(inboxRows, outboxRows) {
    conversations = {};
    inboxRows.forEach(row => {
        const contact = normalizePhone(row.source);
        addMessageToConversation(contact, { text: row.message, time: row.receive_date, isOut: false });
    });
    outboxRows.forEach(row => {
        const contact = normalizePhone(row.To);
        addMessageToConversation(contact, { text: row.Message, time: row.Time, isOut: true, status: row.DeliveryReport });
    });
    for (let contact in conversations) {
        conversations[contact].sort((a, b) => new Date(a.time.replace(" ", "T")) - new Date(b.time.replace(" ", "T")));
    }
    // קוד זמני המוגבל לכמה מספרים - מציגים אותם תמיד ברשימה גם בלי הודעות
    // (השוואה ללא תלות באותיות גדולות/קטנות - למשל GOVil / govil)
    const findContact = (p) => Object.keys(conversations).find(k => k.toLowerCase() === normalizePhone(p).toLowerCase());
    if (isTempMode && tempInfo && tempInfo.restricted) {
        tempInfo.phones.forEach(p => { if (!findContact(p)) conversations[normalizePhone(p)] = []; });
    }
    renderContacts();
    if (activeContact && conversations[activeContact]) {
        renderChat(activeContact, true);
    } else if (!activeContact && isTempMode && tempInfo && tempInfo.restricted && tempInfo.phones.length === 1) {
        // מספר יחיד - פותחים את השיחה ישירות
        activeContact = findContact(tempInfo.phones[0]) || normalizePhone(tempInfo.phones[0]);
        renderContacts();
        renderChat(activeContact);
        if (window.innerWidth <= 768) {
            sidebar.classList.add("hidden-mobile");
            chatArea.classList.remove("hidden-mobile");
        }
    }
}

function addMessageToConversation(contact, msgObj) {
    if (!contact) return;
    if (!conversations[contact]) conversations[contact] = [];
    const exists = conversations[contact].some(m => m.time === msgObj.time && m.text === msgObj.text);
    if (!exists) conversations[contact].push(msgObj);
}

function renderContacts() {
    contactsListEl.innerHTML = "";
    const sortedContacts = Object.keys(conversations).map(contact => {
        const msgs = conversations[contact];
        return { contact, lastMsg: msgs[msgs.length - 1] || null };
    }).sort((a, b) => {
        const ta = a.lastMsg ? new Date(a.lastMsg.time.replace(" ", "T")).getTime() : 0;
        const tb = b.lastMsg ? new Date(b.lastMsg.time.replace(" ", "T")).getTime() : 0;
        return tb - ta;
    });

    sortedContacts.forEach(item => {
        const div = document.createElement("div");
        div.className = "contact-item" + (activeContact === item.contact ? " active" : "");
        const timeStr = item.lastMsg ? formatMessageDate(item.lastMsg.time) : "";
        const statusIcon = item.lastMsg && item.lastMsg.isOut ? getStatusIconHtml(item.lastMsg.status) : "";
        const lastText = item.lastMsg ? item.lastMsg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "אין הודעות עדיין";
        div.innerHTML = \`<div class="contact-top"><span class="contact-name">\${item.contact}</span><span class="contact-time">\${timeStr}</span></div>
            <div class="contact-last-msg">\${statusIcon} \${lastText}</div>\`;
        
        div.addEventListener("click", () => {
            activeContact = item.contact;
            renderContacts(); 
            renderChat(item.contact);
            if (window.innerWidth <= 768) {
                sidebar.classList.add("hidden-mobile");
                chatArea.classList.remove("hidden-mobile");
            }
        });
        contactsListEl.appendChild(div);
    });
}

function renderChat(contact, preserveScroll = false) {
    chatTitleEl.textContent = contact;
    // לשולח בשם (למשל GOVil) אי אפשר להשיב
    const canReply = canTemp("send") && !/[a-zA-Zא-ת]/.test(contact);
    chatPhoneEl.textContent = canReply ? "הודעות SMS" : "הודעות SMS · צפייה בלבד";
    chatInputArea.classList.toggle("hidden", !canReply);
    const msgs = conversations[contact] || [];
    const isAtBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;

    if (msgs.length === 0) {
        chatMessagesEl.innerHTML = canTemp("send")
            ? '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>שיחה חדשה</h3><p>שלח הודעה כדי להתחיל</p></div>'
            : '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>אין הודעות</h3><p>עדיין אין הודעות עם מספר זה</p></div>';
        return;
    }

    let newHTML = "";
    msgs.forEach(msg => {
        const timeStr = formatMessageDate(msg.time);
        const statusIcon = msg.isOut ? getStatusIconHtml(msg.status) : "";
        let safeText = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
        safeText = safeText.replace(urlRegex, function(url) {
            return \`<a href="\${url}" target="_blank" rel="noopener noreferrer" class="chat-link">\${url}</a>\`;
        });
        safeText = safeText.replace(/\\n/g, "<br>");
        newHTML += \`<div class="message \${msg.isOut ? 'msg-out' : 'msg-in'}">
            <div>\${safeText}</div><div class="msg-footer"><span class="msg-time" style="direction:ltr; display:inline-block;">\${timeStr}</span> \${statusIcon}</div>
        </div>\`;
    });
    
    chatMessagesEl.innerHTML = newHTML;
    if (!preserveScroll || isAtBottom) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

sendBtn.addEventListener("click", sendSmsMessage);
newMessageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendSmsMessage();
    }
});

async function sendSmsMessage() {
    const text = newMessageInput.value.trim();
    if (!text || !activeContact) return;

    const originalBtn = sendBtn.innerHTML;
    sendBtn.innerHTML = '<div class="spinner-small"></div>';
    sendBtn.disabled = true;
    newMessageInput.disabled = true;
    
    try {
        const data = await apiFetch('SendSms', \`phones=\${encodeURIComponent(activeContact)}&message=\${encodeURIComponent(text)}\`);
        if (data.responseStatus === "OK") {
            newMessageInput.value = "";
            await loadAllMessages(true);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        } else {
            showCustomAlert("שגיאה", "ההודעה לא נשלחה: " + (data.message || ""));
        }
    } catch (e) {
        if (e instanceof ApiError && TEMP_AUTH_ERRORS.includes(e.code)) {
            logoutProcess();
            showError(e.message);
        } else {
            showCustomAlert("שגיאה", e instanceof ApiError ? "ההודעה לא נשלחה: " + e.message : "שגיאת רשת בשליחה.");
        }
    } finally {
        sendBtn.innerHTML = originalBtn;
        sendBtn.disabled = false;
        newMessageInput.disabled = false;
        newMessageInput.focus();
    }
}


document.getElementById("username").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("password").focus(); });
document.getElementById("password").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("login-user-btn").click(); });
document.getElementById("token-input").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("login-token-btn").click(); });
document.getElementById("personal-code-input").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("login-personal-code-btn").click(); });

document.getElementById("login-user-btn").addEventListener("click", () => {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    if (!user || !pass) return showError("נא להזין מספר מערכת וסיסמה.");
    loginWithCredentials(user, pass);
});

async function loginWithCredentials(user, pass) {
    hideError();
    loaderTextMain.textContent = "מתחבר למערכת...";
    loader.classList.remove("hidden");
    try {
        const res = await fetch(\`\${API_BASE}/Login?username=\${user}&password=\${pass}\`);
        const data = await res.json();
        if (data.responseStatus === "OK" && data.token) {
            token = data.token;
            localStorage.setItem("ym_token", token);
            isTempMode = false;
            localStorage.setItem("ym_is_temp", "false");
            verifyAndLoad();
        } else {
            showError("פרטים שגויים או שהמערכת חסומה.");
            loader.classList.add("hidden");
        }
    } catch (e) {
        showError("שגיאת רשת מול ימות המשיח.");
        loader.classList.add("hidden");
    }
}

document.getElementById("login-token-btn").addEventListener("click", () => {
    const t = document.getElementById("token-input").value.trim();
    if (t) { 
        token = t; 
        localStorage.setItem("ym_token", token); 
        isTempMode = false;
        localStorage.setItem("ym_is_temp", "false");
        verifyAndLoad(); 
    }
});

document.getElementById("login-personal-code-btn").addEventListener("click", () => {
    loginWithCode(document.getElementById("personal-code-input").value.trim());
});

// כניסה עם קוד אישי או קוד זמני (מהכפתור או מהקישור ?code=)
async function loginWithCode(code) {
    if (!code) return showError("נא להזין קוד התחברות.");

    hideError();
    loaderTextMain.textContent = "מאמת קוד התחברות...";
    loader.classList.remove("hidden");

    try {
        const res = await fetch('/sms/api/auth/systems', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.systems && data.systems.length > 0) {
                loader.classList.add("hidden");
                if (data.systems.length === 1) fetchTokenAndLogin(code, data.systems[0].id);
                else showSystemSelector(code, data.systems);
                return;
            }
        }

        // ניסיון כקוד זמני - הפרוקסי מחזיר קוד שגיאה מדויק
        const tempRes = await fetch('/sms/api/proxy/info', { headers: { 'x-temp-code': code } });
        let tempData = null;
        try { tempData = await tempRes.json(); } catch (e) {}

        if (tempRes.ok && tempData && tempData.ok) {
            token = code;
            isTempMode = true;
            localStorage.setItem("ym_token", token);
            localStorage.setItem("ym_is_temp", "true");
            verifyAndLoad();
            return;
        }

        loader.classList.add("hidden");
        // קוד שלא קיים בכלל - הודעה כללית; קוד שקיים אבל לא תקף - הסיבה המדויקת
        if (tempData && tempData.code && tempData.code !== "INVALID_TEMP_CODE") showError(tempData.error);
        else showError("הקוד שהוזן שגוי או לא קיים.");

    } catch (e) {
        loader.classList.add("hidden");
        showError("שגיאת תקשורת מול השרת.");
    }
}

document.getElementById("cancel-system-selector").addEventListener("click", () => {
    document.getElementById("system-selector-modal").classList.add("hidden");
});

function showSystemSelector(code, systems) {
    const container = document.getElementById("system-buttons-container");
    container.innerHTML = ""; 
    systems.forEach(sys => {
        const btn = document.createElement("button");
        btn.className = "btn-primary";
        btn.innerHTML = \`<span class="material-symbols-rounded">dns</span> \${sys.description}\`;
        btn.onclick = () => {
            document.getElementById("system-selector-modal").classList.add("hidden");
            fetchTokenAndLogin(code, sys.id);
        };
        container.appendChild(btn);
    });
    document.getElementById("system-selector-modal").classList.remove("hidden");
}

async function fetchTokenAndLogin(code, systemId) {
    loaderTextMain.textContent = "מושך מפתח מערכת...";
    loader.classList.remove("hidden");
    try {
        const res = await fetch('/sms/api/auth/token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, systemId })
        });
        const data = await res.json();
        if (!res.ok) {
            loader.classList.add("hidden");
            return showError(data.error || "שגיאה במשיכת הטוקן");
        }
        token = data.token;
        localStorage.setItem("ym_token", token);
        isTempMode = false;
        localStorage.setItem("ym_is_temp", "false");
        verifyAndLoad();
    } catch (e) {
        loader.classList.add("hidden");
        showError("שגיאת תקשורת.");
    }
}

function normalizePhone(phone) {
    if (!phone) return "לא ידוע";
    if (/[a-zA-Zא-ת]/.test(phone)) return phone;
    let cleaned = phone.replace(/[^\\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('972')) return '0' + cleaned.substring(3);
    return cleaned || phone;
}

// פונקציית התאריכים החכמה והמדויקת
function formatMessageDate(dateString) {
    if (!dateString) return "";
    
    // מניעת שגיאות בדפדפנים כמו ספארי (החלפת רווח ב-T)
    const safeDateStr = dateString.includes("T") ? dateString : dateString.replace(" ", "T");
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return dateString; // למקרה שמבנה התאריך שגוי

    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    
    // חישוב ימים שעברו במדויק
    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const fullDateStr = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    let relativeStr = "";
    if (diffDays === 0) relativeStr = "היום";
    else if (diffDays === 1) relativeStr = "אתמול";
    else if (diffDays === 2) relativeStr = "שלשום";
    else if (diffDays < 7) relativeStr = \`לפני \${diffDays} ימים\`;
    else if (diffDays === 7) relativeStr = "לפני שבוע";
    else if (diffDays > 7 && diffDays < 14) relativeStr = \`לפני שבוע ו-\${diffDays - 7} ימים\`;
    else if (diffDays >= 14 && diffDays < 21) relativeStr = "לפני שבועיים";
    else if (diffDays >= 21 && diffDays < 30) relativeStr = \`לפני \${Math.floor(diffDays / 7)} שבועות\`;
    else if (diffDays >= 30 && diffDays < 60) relativeStr = "לפני חודש";
    else if (diffDays >= 60 && diffDays < 90) relativeStr = "לפני חודשיים";
    else if (diffDays >= 90 && diffDays < 365) relativeStr = \`לפני \${Math.floor(diffDays / 30)} חודשים\`;
    else if (diffDays >= 365 && diffDays < 730) relativeStr = "לפני שנה";
    else relativeStr = \`לפני \${Math.floor(diffDays / 365)} שנים\`;

    return \`\${relativeStr}, \${fullDateStr} | \${timeStr}\`;
}

function getStatusIconHtml(status) {
    if (!status) return "";
    switch(status) {
        case "DELIVRD": return '<span class="material-symbols-rounded status-icon" style="color:var(--success)" title="נמסר">done_all</span>';
        case "EXPIRED": return '<span class="material-symbols-rounded status-icon" title="פג תוקף">history</span>';
        case "UNDELIV": 
        case "REJECTD": return '<span class="material-symbols-rounded status-icon" style="color:var(--danger)" title="נכשל">error</span>';
        default: return '<span class="material-symbols-rounded status-icon" title="נשלח">check</span>';
    }
}
`;
