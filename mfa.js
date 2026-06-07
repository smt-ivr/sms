export default `const MFA_BASE = "https://www.call2all.co.il/ym/api/MFASession";

const MFA_REASONS_HE = {
    "INACTIVE_SYSTEM": "מנוע האימות הדו שלבי לא פעיל או לא זמין",
    "WAIT_TO_BLOCK_DATE": "תאריך אכיפת השירות לא הגיע",
    "INIT_WHITELIST_IPS": "כתובת IP ברשימה לבנה",
    "INIT_MASTER_LOGIN_WHITELIST_IPS": "כתובת IP ברשימה לבנה בהתחברות מאסטר",
    "HAVE_ACTIVE_TRUST_TOKEN": "בוצע מעבר על ידי אסימון ״זכור אותי״",
    "INHERITED_FROM_ORIGINAL_SESSION": "ירושה מסשן קודם כל שהוא",
    "MFA_PASSED": "בוצע אימות בפועל בחיבור הנוכחי",
    "SPECIAL_VALID_TOKEN": "טוקן שנוצר עם פטור מאימות מסיבה מיוחדת",
    "FOR_FIREWALL_TOKEN": "טוקן עבר חומת אש",
    "IS_CUSTOMER_AUTH_TOKEN": "מפתח גישה קבוע",
    "API_SKIP_FOR_MFA": "דילוג על אימות בAPI"
};

let mfaPollingInterval = null;

async function checkMfaStatus(token) {
    const res = await fetch(\`\${MFA_BASE}?token=\${token}&action=isPass\`);
    const data = await res.json();
    
    if (data.responseStatus !== "OK") {
        throw new Error(data.message || "שגיאת טוקן או סשן לא תקין");
    }
    
    return data;
}

async function startMfaFlow(token, onSuccess, onError) {
    try {
        let status = await checkMfaStatus(token);
        
        if (status.isPass) {
            return onSuccess(status.passReason);
        }

        const tryRes = await fetch(\`\${MFA_BASE}?token=\${token}&action=try\`);
        const tryData = await tryRes.json();
        
        if (tryData.responseStatus !== "OK") {
            throw new Error(tryData.message || "שגיאה בניסיון אימות ראשוני");
        }

        status = await checkMfaStatus(token);
        
        if (status.isPass) {
            return onSuccess(status.passReason);
        }

        showMfaModal(token, onSuccess, onError);

    } catch (err) {
        console.error("MFA Error:", err);
        if (onError) onError("שגיאת אימות: " + err.message);
    }
}

function showMfaModal(token, onSuccess, onError) {
    const modal = document.getElementById("mfa-modal");
    const linkBtn = document.getElementById("mfa-link-btn");
    const closeBtn = document.getElementById("mfa-close-btn");

    const ssoUrl = \`https://call2all.co.il/ym/mfa.php?mode=SSO&ymapitoken=\${token}&callback=https://call2all.co.il\`;
    linkBtn.href = ssoUrl;
    
    modal.classList.remove("hidden");

    if (mfaPollingInterval) clearInterval(mfaPollingInterval);

    mfaPollingInterval = setInterval(async () => {
        try {
            const status = await checkMfaStatus(token);
            if (status.isPass) {
                clearInterval(mfaPollingInterval);
                modal.classList.add("hidden");
                onSuccess(status.passReason);
            }
        } catch(e) {
            console.error("MFA Polling Error", e);
            clearInterval(mfaPollingInterval);
            modal.classList.add("hidden");
            if (onError) onError("החיבור נותק: " + e.message);
        }
    }, 1000);

    closeBtn.onclick = () => {
        clearInterval(mfaPollingInterval);
        modal.classList.add("hidden");
        if (onError) onError("תהליך האימות בוטל על ידי המשתמש.");
    };
}

function translateMfaReason(reason) {
    if (!reason) return "סיבה לא ידועה";
    return MFA_REASONS_HE[reason] || reason;
}`;
