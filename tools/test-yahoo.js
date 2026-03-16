const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log("Testing Yahoo Finance (TATASTEEL.NS)...");
  const url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/TATASTEEL.NS?modules=assetProfile,summaryProfile,summaryDetail,price';
  const yf = await fetchJson(url);
  console.log("Status:", yf.status);
  
  if (yf.status === 200 && yf.data.quoteSummary && yf.data.quoteSummary.result) {
      const res = yf.data.quoteSummary.result[0];
      console.log("Result obj:", !!res);
      console.log("assetProfile:", !!res.assetProfile);
      console.log("summaryProfile:", !!res.summaryProfile);
      console.log("price:", !!res.price);
  } else {
      console.log("Error JSON:", JSON.stringify(yf.data).slice(0, 300));
  }
}

test();
