export default `const API_BASE = "https://www.call2all.co.il/ym/api";
let token = localStorage.getItem("ym_token") || "";
let activeContact = null;
let conversations = {};
let lastDataHash = ""; // מזהה שינויים בשביל רענון שקט
let pollInterval = null; // שומר את הטיימר של הרענון האוטומטי

const loader = document.getElementById("loader");
const loaderTextMain = document.getElementById("loader-text-main");
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const errorEl = document.getElementById("login-error");

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

// ==========================================
// איתחול מערכת
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    // בברירת מחדל בנייד מראים את רשימת השיחות ומסתירים את הצ'אט
    if (window.innerWidth <= 768) {
        chatArea.classList.add("hidden-mobile");
    }

    if (token) {
        verifyAndLoad();
    } else {
        document.getElementById("personal-code-input").focus();
    }
});

function verifyAndLoad() {
    loader.classList.remove("hidden");
    loaderTextMain.textContent = "מאמת נתונים...";
    
    startMfaFlow(token, (reason) => {
        loader.classList.add("hidden");
        showApp();
        if(mfaStatusBadge) mfaStatusBadge.classList.remove("hidden");
        
        loadAllMessages();
        // הפעלת רענון אוטומטי שקט כל 10 שניות
        pollInterval = setInterval(() => loadAllMessages(true), 10000);
        
    }, (err) => {
        loader.classList.add("hidden");
        errorEl.textContent = err || "פג תוקף או שגיאת אימות";
        logoutProcess();
    });
}

function showApp() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
}

// ==========================================
// התנתקות וניקוי מוחלט מהזיכרון
// ==========================================
function logoutProcess() {
    // עצירת רענון אוטומטי
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    // מחיקת טוקנים ומשתנים
    localStorage.removeItem("ym_token");
    token = "";
    lastDataHash = "";
    conversations = {};
    activeContact = null;

    // ניקוי טוטאלי של ה-DOM (כדי שמי שפותח את המחשב לא יראה שאריות)
    contactsListEl.innerHTML = "";
    chatMessagesEl.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">forum</span><h3>התנתקת מהמערכת</h3></div>';
    
    // איפוס ממשק לאיפוס ראשוני
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    chatInputArea.classList.add("hidden");
    if(mfaStatusBadge) mfaStatusBadge.classList.add("hidden");
    
    document.getElementById("token-input").value = "";
    document.getElementById("personal-code-input").value = "";
    errorEl.textContent = "";
    document.getElementById("personal-code-input").focus();

    if (window.innerWidth <= 768) {
        chatArea.classList.add("hidden-mobile");
        sidebar.classList.remove("hidden-mobile");
    }
}

document.getElementById("logout-btn").addEventListener("click", logoutProcess);

// ==========================================
// ממשק משתמש כללי
// ==========================================
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

// בנייד: חזרה מרשימת שיחות
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

// ==========================================
// לוגיקת טעינת הודעות מ-API
// ==========================================
async function loadAllMessages(isSilent = false) {
    if (!isSilent) loader.classList.remove("hidden");
    
    try {
        const resIn = await fetch(\`\${API_BASE}/GetIncomingSms?token=\${token}&limit=3000\`);
        const dataIn = await resIn.json();
        
        const resOut = await fetch(\`\${API_BASE}/GetSmsOutLog?token=\${token}&limit=3000\`);
        const dataOut = await resOut.json();

        if (dataIn.responseStatus !== "OK" || dataOut.responseStatus !== "OK") throw new Error("Token invalid");

        // יצירת חותמת (Hash) לבדיקה אם משהו השתנה. אם לא, מונעים רינדור מחדש שקוטע הקלדה.
        const currentHash = JSON.stringify(dataIn.rows) + JSON.stringify(dataOut.rows);
        if (isSilent && currentHash === lastDataHash) return; // לא השתנה כלום
        lastDataHash = currentHash;

        processMessages(dataIn.rows || [], dataOut.rows || []);
    } catch (e) {
        if (!isSilent) {
            console.error(e);
            if (e.message.includes("Token invalid")) logoutProcess();
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
        conversations[contact].sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    renderContacts();
    
    if (activeContact && conversations[activeContact]) {
        renderChat(activeContact, true); // True = render without losing scroll position if typed
    }
}

function addMessageToConversation(contact, msgObj) {
    if (!contact) return;
    if (!conversations[contact]) conversations[contact] = [];
    const exists = conversations[contact].some(m => m.time === msgObj.time && m.text === msgObj.text);
    if (!exists) conversations[contact].push(msgObj);
}

// ==========================================
// רינדור (HTML)
// ==========================================
function renderContacts() {
    contactsListEl.innerHTML = "";
    
    const sortedContacts = Object.keys(conversations).map(contact => {
        const msgs = conversations[contact];
        return { contact, lastMsg: msgs[msgs.length - 1] };
    }).sort((a, b) => new Date(b.lastMsg.time) - new Date(a.lastMsg.time));

    sortedContacts.forEach(item => {
        const div = document.createElement("div");
        div.className = "contact-item" + (activeContact === item.contact ? " active" : "");
        
        const timeStr = formatMessageDate(item.lastMsg.time);
        const statusIcon = item.lastMsg.isOut ? getStatusIconHtml(item.lastMsg.status) : "";
        
        div.innerHTML = \`
            <div class="contact-top"><span class="contact-name">\${item.contact}</span><span class="contact-time">\${timeStr}</span></div>
            <div class="contact-last-msg">\${statusIcon} \${item.lastMsg.text}</div>\`;
        
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
    chatPhoneEl.textContent = "הודעות SMS";
    
    chatInputArea.classList.remove("hidden");
    const msgs = conversations[contact] || [];
    
    // בדיקה האם המשתמש נמצא כרגע למטה (כדי לגלול אוטומטית בהודעה חדשה)
    const isAtBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop <= chatMessagesEl.clientHeight + 50;

    if (msgs.length === 0) {
        chatMessagesEl.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>שיחה חדשה</h3><p>שלח הודעה כדי להתחיל</p></div>';
        return;
    }

    let newHTML = "";
    msgs.forEach(msg => {
        const timeStr = new Date(msg.time).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
        const statusIcon = msg.isOut ? getStatusIconHtml(msg.status) : "";
        let safeText = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, "<br>");
        
        newHTML += \`<div class="message \${msg.isOut ? 'msg-out' : 'msg-in'}">
            <div>\${safeText}</div>
            <div class="msg-footer"><span class="msg-time">\${timeStr}</span> \${statusIcon}</div>
        </div>\`;
    });
    
    chatMessagesEl.innerHTML = newHTML;
    
    if (!preserveScroll || isAtBottom) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
}

// ==========================================
// שליחת הודעה
// ==========================================
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
        const url = \`\${API_BASE}/SendSms?token=\${token}&phones=\${activeContact}&message=\${encodeURIComponent(text)}\`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.responseStatus === "OK") {
            newMessageInput.value = "";
            await loadAllMessages(true); // רענון שקט כדי לראות את ההודעה מיד
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; // גלילה למטה
        } else {
            showCustomAlert("שגיאה", "ההודעה לא נשלחה: " + (data.message || ""));
        }
    } catch (e) {
        showCustomAlert("שגיאה", "שגיאת רשת בשליחה.");
    } finally {
        sendBtn.innerHTML = originalBtn;
        sendBtn.disabled = false;
        newMessageInput.disabled = false;
        newMessageInput.focus();
    }
}

// ==========================================
// התחברות לחשבון
// ==========================================
document.getElementById("personal-code-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("login-personal-code-btn").click();
});
document.getElementById("cancel-system-selector").addEventListener("click", () => {
    document.getElementById("system-selector-modal").classList.add("hidden");
});
document.getElementById("token-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("login-token-btn").click();
});

document.getElementById("login-token-btn").addEventListener("click", () => {
    const t = document.getElementById("token-input").value.trim();
    if (t) { token = t; localStorage.setItem("ym_token", token); verifyAndLoad(); }
});

document.getElementById("login-personal-code-btn").addEventListener("click", async () => {
    const code = document.getElementById("personal-code-input").value.trim();
    if (!code) return (errorEl.textContent = "נא להזין קוד אישי.");

    errorEl.textContent = "";
    loaderTextMain.textContent = "מזהה משתמש...";
    loader.classList.remove("hidden");

    try {
        const res = await fetch('/sms/api/auth/systems', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        const data = await res.json();
        loader.classList.add("hidden");

        if (!res.ok) return (errorEl.textContent = data.error || "שגיאה בבדיקת הקוד");
        if (!data.systems || data.systems.length === 0) return (errorEl.textContent = "אין מערכות לקוד זה.");

        if (data.systems.length === 1) fetchTokenAndLogin(code, data.systems[0].id);
        else showSystemSelector(code, data.systems);
    } catch (e) {
        loader.classList.add("hidden");
        errorEl.textContent = "שגיאת תקשורת.";
    }
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
            return (errorEl.textContent = data.error || "שגיאה במשיכת הטוקן");
        }
        token = data.token;
        localStorage.setItem("ym_token", token);
        verifyAndLoad();
    } catch (e) {
        loader.classList.add("hidden");
        errorEl.textContent = "שגיאת תקשורת.";
    }
}

// עזרי עיצוב נתונים
function normalizePhone(phone) {
    if (!phone) return "לא ידוע";
    if (/[a-zA-Zא-ת]/.test(phone)) return phone;
    let cleaned = phone.replace(/[^\\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('972')) return '0' + cleaned.substring(3);
    return cleaned || phone;
}
function formatMessageDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const timeStr = date.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === today.toDateString()) return \`היום, \${timeStr}\`;
    if (date.toDateString() === yesterday.toDateString()) return \`אתמול, \${timeStr}\`;
    return \`\${date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}, \${timeStr}\`;
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
