export async function sendVerificationEmail(toEmail, code) {
  const sendRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: "לקוח יקר" }] }],
      from: { email: 'sms@smti.uk', name: 'S.M.T הקמת מערכות טלפוניות' },
      subject: 'קוד האימות שלך להרשמה',
      content: [
        {
          type: 'text/html',
          value: `
            <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
              <h2 style="color: #007aff;">ברוכים הבאים למערכת ההודעות!</h2>
              <p>כדי להשלים את תהליך ההרשמה, אנא הזן את הקוד הבא במערכת:</p>
              <h1 style="color: #333; letter-spacing: 6px; background: #fff; padding: 15px; display: inline-block; border: 1px solid #ddd; border-radius: 8px;">${code}</h1>
              <p style="color: #777; font-size: 13px;">* הקוד בתוקף ל-15 דקות. אם לא ביקשת להירשם, אנא התעלם מהודעה זו.</p>
            </div>
          `,
        },
      ],
    }),
  });

  try {
    const response = await fetch(sendRequest);
    return response.ok;
  } catch (error) {
    console.error('MailChannels Error:', error);
    return false;
  }
}
