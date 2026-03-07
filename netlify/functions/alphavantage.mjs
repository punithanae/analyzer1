// Netlify serverless function: Alpha Vantage API proxy
export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/alphavantage', '') + url.search;
  const targetUrl = `https://www.alphavantage.co${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
