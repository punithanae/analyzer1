async function test() {
  console.log("Testing Yahoo Finance v7 quote (TATASTEEL.NS)...");
  const url = 'https://query2.finance.yahoo.com/v7/finance/quote?symbols=TATASTEEL.NS';
  try {
      const response = await fetch(url);
      const data = await response.json();
      console.log("Status:", response.status);
      
      if (response.ok && data.quoteResponse && data.quoteResponse.result) {
          const res = data.quoteResponse.result[0];
          console.log("Result obj:", !!res);
          console.log("Sample:", res.longName, res.marketCap, res.trailingPE);
          console.log("Keys:", Object.keys(res).slice(0, 15));
      } else {
          console.log("Error:", data);
      }
  } catch (err) {
      console.error(err);
  }
}

test();
