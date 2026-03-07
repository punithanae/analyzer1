// Serverless API proxy for Alpha Vantage
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const avPath = url.pathname.replace(/^\/api\/alphavantage/, '') + url.search;
  const targetUrl = `https://www.alphavantage.co${avPath}`;

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
    res.status(500).json({ error: 'Failed to fetch from Alpha Vantage', details: error.message });
  }
}
