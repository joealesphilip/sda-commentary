const https = require('https');

exports.handler = async function(event, context) {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' })
    };
  }

  let question;
  try {
    const body = JSON.parse(event.body);
    question = body.question;
    if (!question) throw new Error('No question provided');
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const SYSTEM_CTX = "You are a guide for the Seventh-day Adventist Bible Commentary (10 volumes, 1953-1970). Volumes: 1=Genesis-Deuteronomy, 2=Joshua-2Kings, 3=1Chronicles-SongOfSolomon, 4=Isaiah-Malachi(incl Daniel), 5=Matthew-Mark, 6=Luke-John, 7=Acts-Ephesians, 8=Philippians-Hebrews, 9=James-Revelation, 10=General reference. Help users of the Sepik Mission website in Papua New Guinea find Bible topics and doctrines. State the volume number, relevant Bible book, and give 2-3 sentences of guidance. Be warm and concise, under 120 words. Use **bold** for volume numbers and key terms.";

  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: SYSTEM_CTX + '\n\nUser question: ' + question }]
    }],
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.4
    }
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  try {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return {
        statusCode: geminiResponse.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error?.message || 'Gemini API error' })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ reply })
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
