export async function sendVerificationEmail(toEmail, code, env) {
  const resendApiKey = env.RESEND_API_KEY;

  if (!resendApiKey) {
    return { success: false, message: "מפתח ה-API של Resend לא מוגדר בשרת." };
  }

  const sendRequest = new Request('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'S.M.T <sms@smti.uk>', // הכתובת שאושרה ב-Resend
      to: [toEmail],
      subject: 'קוד האימות שלך להרשמה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
          <h2 style="color: #007aff;">ברוכים הבאים למערכת ההודעות!</h2>
          <p>כדי להשלים את תהליך ההרשמה, אנא הזן את הקוד הבא במערכת:</p>
          <h1 style="color: #333; letter-spacing: 6px; background: #fff; padding: 15px; display: inline-block; border: 1px solid #ddd; border-radius: 8px;">${code}</h1>
          <p style="color: #777; font-size: 13px;">* הקוד בתוקף ל-15 דקות. אם לא ביקשת להירשם, אנא התעלם מהודעה זו.</p>
        </div>
      `
    })
  });

  try {
    const response = await fetch(sendRequest);
    if (!response.ok) {
      const errorText = await response.text(); 
      console.error('Resend Error:', response.status, errorText);
      return { success: false, message: `[Resend Error ${response.status}] ${errorText}` };
    }
    return { success: true };
  } catch (error) {
    console.error('Fetch Error:', error);
    return { success: false, message: `[Network Error] ${error.message}` };
  }
}
