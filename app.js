export default `const API_BASE = "https://www.call2all.co.il/ym/api";
let token = localStorage.getItem("ym_token") || "";
let activeContact = null;
let conversations = {};

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
const refreshChatBtn = document.getElementById("refresh-chat-btn");
const mfaStatusBadge = document.getElementById("mfa-status-badge");

const modal = document.getElementById("custom-modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const modalInput = document.getElementById("modal-input");
const modalOkBtn = document.getElementById("modal-ok-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
let modalCallback = null;

window.addEventListener("DOMContentLoaded", () => {
    checkUrlParams();
    
    if (token) {
        loader.classList.remove("hidden");
        loaderTextMain.textContent = "מאמת סשן חיבור...";
        
        startMfaFlow(token, (reason) => {
            loader.classList.add("hidden");
            showApp();
            updateMfaReasonUi(reason);
            loadAllMessages();
        }, (err) => {
            loader.classList.add("hidden");
            logoutProcess();
            errorEl.textContent = err || "פג תוקף או שגיאת אימות";
        });
    } else {
        document.getElementById("username").focus();
    }
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUser = urlParams.get('username');
    const urlPass = urlParams.get('password');

    if (urlToken) {
        token = urlToken;
        localStorage.setItem("ym_token", token);
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

function updateMfaReasonUi(reasonStr) {
    if (mfaStatusBadge) {
        mfaStatusBadge.classList.remove("hidden");
        const translatedReason = translateMfaReason(reasonStr);
        mfaStatusBadge.innerHTML = \`
            <span class="material-symbols-rounded badge-icon">verified_user</span>
            <span>טוקן מאומת (\${translatedReason})</span>
        \`;
    }
}

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

function showSidebarLoader() {
    contactsListEl.innerHTML = \`
        <div class="sidebar-loader">
            <div class="spinner"></div>
            <div>מרענן נתונים...</div>
        </div>
    \`;
}

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
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const timeStr = date.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
        return \`היום, \${timeStr}\`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return \`אתמול, \${timeStr}\`;
    } else {
        const fullDate = date.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
        return \`\${fullDate}, \${timeStr}\`;
    }
}

function getStatusIconHtml(status) {
    if (!status) return "";
    switch(status) {
        case "DELIVRD": return \`<span class="material-symbols-rounded status-icon status-delivered" title="נמסר">done_all</span>\`;
        case "EXPIRED": return \`<span class="material-symbols-rounded status-icon status-expired" title="פג תוקף">history</span>\`;
        case "UNDELIV": 
        case "REJECTD": return \`<span class="material-symbols-rounded status-icon status-failed" title="נכשל">error</span>\`;
        default: return \`<span class="material-symbols-rounded status-icon status-pending" title="נשלח">check</span>\`;
    }
}

function linkify(text) {
    const urlRegex = /(https?:\\/\\/[^\\s]+|www\\.[^\\s]+)/g;
    return text.replace(urlRegex, function(url) {
        let href = url;
        if (!href.startsWith('http')) {
            href = 'http://' + href;
        }
        return \`<a href="\${href}" target="_blank" rel="noopener noreferrer">\${url}</a>\`;
    });
}

document.getElementById("username").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("password").focus();
    }
});

document.getElementById("password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("login-user-btn").click();
    }
});

document.getElementById("token-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("login-token-btn").click();
    }
});

document.getElementById("login-user-btn").addEventListener("click", () => {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    if (!user || !pass) {
        errorEl.textContent = "נא להזין מספר מערכת וסיסמה.";
        return;
    }
    loginWithCredentials(user, pass);
});

document.getElementById("login-token-btn").addEventListener("click", () => {
    const tokenInput = document.getElementById("token-input").value.trim();
    if (!tokenInput) {
        errorEl.textContent = "נא להזין Token תקין.";
        return;
    }
    handleSuccessfulLogin(tokenInput);
});

function logoutProcess() {
    localStorage.removeItem("ym_token");
    token = "";
    conversations = {};
    activeContact = null;
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    chatInputArea.classList.add("hidden");
    refreshChatBtn.classList.add("hidden");
    if(mfaStatusBadge) mfaStatusBadge.classList.add("hidden");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("token-input").value = "";
    document.getElementById("personal-code-input").value = "";
    errorEl.textContent = "";
    document.getElementById("username").focus();
}

document.getElementById("logout-btn").addEventListener("click", logoutProcess);

document.getElementById("back-btn").addEventListener("click", () => {
    chatArea.classList.add("hidden-mobile");
    sidebar.classList.remove("hidden-mobile");
    activeContact = null;
    chatInputArea.classList.add("hidden");
    refreshChatBtn.classList.add("hidden");
    renderContacts();
});

document.getElementById("refresh-all-btn").addEventListener("click", loadAllMessages);
refreshChatBtn.addEventListener("click", loadAllMessages);

document.getElementById("new-chat-btn").addEventListener("click", () => {
    showCustomPrompt("שיחה חדשה", "לאיזה מספר תרצה לשלוח הודעה?", "לדוגמה: 0501234567", (phone) => {
        if (phone && phone.trim() !== "") {
            const normalizedPhone = normalizePhone(phone.trim());
            activeContact = normalizedPhone;
            
            if (conversations[activeContact]) {
                renderChat(activeContact);
            } else {
                chatTitleEl.textContent = activeContact;
                chatPhoneEl.textContent = "שיחה חדשה";
                chatMessagesEl.innerHTML = \`<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>שיחה חדשה</h3><p>שלח הודעה כדי להתחיל</p></div>\`;
                chatInputArea.classList.remove("hidden");
                refreshChatBtn.classList.remove("hidden");
            }
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add("hidden-mobile");
                chatArea.classList.remove("hidden-mobile");
            }
            newMessageInput.focus();
        }
    });
});

sendBtn.addEventListener("click", sendSmsMessage);

newMessageInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight < 120 ? this.scrollHeight : 120) + "px";
});

newMessageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        sendSmsMessage();
    }
});

async function loginWithCredentials(user, pass) {
    errorEl.textContent = "מתחבר...";
    loaderTextMain.textContent = "מתחבר...";
    loader.classList.remove("hidden");
    try {
        const res = await fetch(\`\${API_BASE}/Login?username=\${user}&password=\${pass}\`);
        const data = await res.json();
        
        if (data.responseStatus === "OK" && data.token) {
            handleSuccessfulLogin(data.token);
        } else {
            errorEl.textContent = "שגיאה: פרטים שגויים או שהמערכת חסומה.";
            loader.classList.add("hidden");
        }
    } catch (e) {
        errorEl.textContent = "שגיאת רשת / CORS.";
        console.error(e);
        loader.classList.add("hidden");
    }
}

function handleSuccessfulLogin(newToken) {
    token = newToken;
    localStorage.setItem("ym_token", token);
    errorEl.textContent = "";
    
    loader.classList.remove("hidden");
    loaderTextMain.textContent = "מבצע אימות אבטחה...";

    startMfaFlow(token, (reason) => {
        loader.classList.add("hidden");
        showApp();
        updateMfaReasonUi(reason);
        loadAllMessages();
    }, (err) => {
        loader.classList.add("hidden");
        errorEl.textContent = err || "שגיאת אימות";
        logoutProcess();
    });
}

function showApp() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
}

async function loadAllMessages() {
    showSidebarLoader();
    try {
        const resIn = await fetch(\`\${API_BASE}/GetIncomingSms?token=\${token}&limit=3000\`);
        const dataIn = await resIn.json();
        
        const resOut = await fetch(\`\${API_BASE}/GetSmsOutLog?token=\${token}&limit=3000\`);
        const dataOut = await resOut.json();

        if (dataIn.responseStatus !== "OK" || dataOut.responseStatus !== "OK") {
            throw new Error("Token invalid");
        }

        processMessages(dataIn.rows || [], dataOut.rows || []);
    } catch (e) {
        console.error("Error fetching messages", e);
        if (e.message.includes("Token invalid") || e.message.includes("Token expired")) {
            showCustomAlert("התנתקות", "החיבור פג תוקף או שגוי. אנא התחבר מחדש.");
            document.getElementById("logout-btn").click();
        } else {
            contactsListEl.innerHTML = \`<div style="padding: 20px; color: red; text-align: center;">שגיאה בטעינת הנתונים</div>\`;
        }
    }
}

function processMessages(inboxRows, outboxRows) {
    conversations = {};

    inboxRows.forEach(row => {
        const contact = normalizePhone(row.source);
        addMessageToConversation(contact, {
            text: row.message,
            time: row.receive_date,
            isOut: false
        });
    });

    outboxRows.forEach(row => {
        const contact = normalizePhone(row.To);
        addMessageToConversation(contact, {
            text: row.Message,
            time: row.Time,
            isOut: true,
            status: row.DeliveryReport
        });
    });

    for (let contact in conversations) {
        conversations[contact].sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    renderContacts();
    
    if (activeContact) {
        if (conversations[activeContact]) {
            renderChat(activeContact);
        }
    }
}

function addMessageToConversation(contact, msgObj) {
    if (!contact) return;
    if (!conversations[contact]) {
        conversations[contact] = [];
    }
    const exists = conversations[contact].some(m => m.time === msgObj.time && m.text === msgObj.text);
    if (!exists) {
        conversations[contact].push(msgObj);
    }
}

async function sendSmsMessage() {
    const text = newMessageInput.value.trim();
    if (!text || !activeContact) return;

    const originalBtnContent = sendBtn.innerHTML;
    sendBtn.innerHTML = '<div class="spinner-small"></div>';
    sendBtn.disabled = true;
    newMessageInput.disabled = true;
    
    try {
        const url = \`\${API_BASE}/SendSms?token=\${token}&phones=\${activeContact}&message=\${encodeURIComponent(text)}\`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.responseStatus === "OK") {
            newMessageInput.value = "";
            newMessageInput.style.height = "auto";
            await loadAllMessages(); 
        } else {
            showCustomAlert("שגיאה בשליחה", "ההודעה לא נשלחה. בדוק אם יש לך יחידות בחשבון: " + (data.message || ""));
        }
    } catch (e) {
        console.error(e);
        showCustomAlert("שגיאה", "שגיאת רשת בעת שליחת ההודעה.");
    } finally {
        sendBtn.innerHTML = originalBtnContent;
        sendBtn.disabled = false;
        newMessageInput.disabled = false;
        newMessageInput.focus();
    }
}

function renderContacts() {
    contactsListEl.innerHTML = "";
    
    const sortedContacts = Object.keys(conversations).map(contact => {
        const msgs = conversations[contact];
        const lastMsg = msgs[msgs.length - 1];
        return { contact, lastMsg };
    }).sort((a, b) => new Date(b.lastMsg.time) - new Date(a.lastMsg.time));

    sortedContacts.forEach(item => {
        const div = document.createElement("div");
        div.className = "contact-item" + (activeContact === item.contact ? " active" : "");
        
        const timeStr = formatMessageDate(item.lastMsg.time);
        const statusIcon = item.lastMsg.isOut ? getStatusIconHtml(item.lastMsg.status) : "";
        
        div.innerHTML = \`
            <div class="contact-top">
                <span class="contact-name">\${item.contact}</span>
                <span class="contact-time">\${timeStr}</span>
            </div>
            <div class="contact-last-msg">\${statusIcon} \${item.lastMsg.text}</div>
        \`;
        
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

function renderChat(contact) {
    chatTitleEl.textContent = contact;
    chatPhoneEl.textContent = "הודעות SMS";
    chatMessagesEl.innerHTML = "";
    
    chatInputArea.classList.remove("hidden");
    refreshChatBtn.classList.remove("hidden");
    
    const msgs = conversations[contact] || [];
    
    if (msgs.length === 0) {
        chatMessagesEl.innerHTML = \`<div class="empty-state"><span class="material-symbols-rounded empty-state-icon">chat</span><h3>שיחה חדשה</h3><p>שלח הודעה כדי להתחיל</p></div>\`;
        return;
    }

    msgs.forEach(msg => {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message " + (msg.isOut ? "msg-out" : "msg-in");
        
        const timeStr = formatMessageDate(msg.time);
        const statusIcon = msg.isOut ? getStatusIconHtml(msg.status) : "";
        
        const safeText = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let formattedText = linkify(safeText);
        formattedText = formattedText.replace(/\\n/g, "<br>");

        msgDiv.innerHTML = \`
            <div>\${formattedText}</div>
            <div class="msg-footer">
                <span class="msg-time">\${timeStr}</span>
                \${statusIcon}
            </div>
        \`;
        
        chatMessagesEl.appendChild(msgDiv);
    });
    
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    newMessageInput.focus();
}

/* =========================================
   מנגנון ההתחברות החדש מבוסס הקוד האישי 
========================================= */

document.getElementById("personal-code-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("login-personal-code-btn").click();
    }
});

document.getElementById("cancel-system-selector").addEventListener("click", () => {
    document.getElementById("system-selector-modal").classList.add("hidden");
});

document.getElementById("login-personal-code-btn").addEventListener("click", async () => {
    const code = document.getElementById("personal-code-input").value.trim();
    if (!code) {
        errorEl.textContent = "נא להזין קוד אישי.";
        return;
    }

    errorEl.textContent = "בודק הרשאות...";
    loaderTextMain.textContent = "מזהה משתמש...";
    loader.classList.remove("hidden");

    try {
        const res = await fetch('/api/auth/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const data = await res.json();
        loader.classList.add("hidden");

        if (!res.ok) {
            errorEl.textContent = data.error || "שגיאה בבדיקת הקוד";
            return;
        }

        if (!data.systems || data.systems.length === 0) {
            errorEl.textContent = "לא נמצאו מערכות משויכות לקוד זה.";
            return;
        }

        // אם יש רק מערכת אחת, מתחברים אוטומטית אליה
        if (data.systems.length === 1) {
            fetchTokenAndLogin(code, data.systems[0].id);
        } else {
            // אם יש כמה, מציגים מודאל לבחירה
            showSystemSelector(code, data.systems);
        }
    } catch (e) {
        loader.classList.add("hidden");
        errorEl.textContent = "שגיאת תקשורת מול השרת.";
        console.error(e);
    }
});

function showSystemSelector(code, systems) {
    const container = document.getElementById("system-buttons-container");
    container.innerHTML = ""; // ניקוי
    
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
        const res = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, systemId })
        });
        
        const data = await res.json();

        if (!res.ok) {
            loader.classList.add("hidden");
            errorEl.textContent = data.error || "שגיאה במשיכת הטוקן";
            return;
        }

        // ברגע שקיבלנו את הטוקן, שולחים אותו לפונקציית ההתחברות הקיימת
        handleSuccessfulLogin(data.token);

    } catch (e) {
        loader.classList.add("hidden");
        errorEl.textContent = "שגיאת תקשורת במשיכת הטוקן.";
        console.error(e);
    }
}`;
