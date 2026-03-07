// Serverless API proxy for Twelve Data
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const tdPath = url.pathname.replace(/^\/api\/twelvedata/, '') + url.search;
  const targetUrl = `https://api.twelvedata.com${tdPath}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const data = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Twelve Data', details: error.message });
  }
}
