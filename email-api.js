export async function sendVerificationEmail(toEmail, code) {
  const sendRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: toEmail, name: toEmail.split('@')[0] }],
        },
      ],
      from: {
        email: 'sms@smti.uk',
        name: 'S.M.T הקמת מערכות טלפוניות', 
      },
      subject: 'קוד האימות שלך להרשמה',
      content: [
        {
          type: 'text/html',
          value: `
            <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
              <h2 style="color: #333;">שלום רב!</h2>
              <p>קיבלנו בקשה לפתיחת חשבון חדש.</p>
              <p>קוד האימות שלך הוא:</p>
              <h1 style="color: #007bff; letter-spacing: 4px; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${code}</h1>
              <p style="color: #777; font-size: 12px;">* הקוד בתוקף לזמן מוגבל. אם לא ביקשת להירשם, אנא התעלם מהודעה זו.</p>
            </div>
          `,
        },
      ],
    }),
  });

  try {
    const response = await fetch(sendRequest);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MailChannels Error:', response.status, errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Fetch Error:', error);
    return false;
  }
}
