// Serverless API proxy for Yahoo Finance
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Strip /api/yahoo prefix to get the Yahoo Finance path
  const yahoPath = url.pathname.replace(/^\/api\/yahoo/, '') + url.search;
  const targetUrl = `https://query2.finance.yahoo.com${yahoPath}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://finance.yahoo.com'
      },
    });

    const data = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance', details: error.message });
  }
}
