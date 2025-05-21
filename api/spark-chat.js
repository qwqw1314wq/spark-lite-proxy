const axios = require('axios');

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

async function generateXunfeiAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 3600;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: API_KEY,
    exp: expiration
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const headerBase64 = encode(header);
  const payloadBase64 = encode(payload);

  const signature = require('crypto')
    .createHmac('sha256', API_SECRET)
    .update(`${headerBase64}.${payloadBase64}`)
    .digest('base64url');

  return `${headerBase64}.${payloadBase64}.${signature}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Missing message' });
    return;
  }

  try {
    const token = await generateXunfeiAccessToken();

    const result = await require('axios').post(
      'https://spark-api-open.xf-yun.com/v1/chat/completions',
      {
        model: 'spark-lite',
        messages: [
          { role: 'user', content: message }
        ],
        temperature: 0.5,
        max_tokens: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Appid': APP_ID
        }
      }
    );

    const reply = result.data.choices?.[0]?.message?.content || '[无响应]';
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: '调用讯飞接口失败' });
  }
};
