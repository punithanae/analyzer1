export interface OptionsSetup {
  type: 'CE' | 'PE';
  strikePrice: number;
  entryPremium: string; // "At Market"
  targetPrice: number;
  stopLoss: number;
  pattern: string;
  confidence: number;
  expiry: string;
}

export function generateOptionsSetup(
  niftyPrice: number,
  predictionScore: number,
  atr: number,
  isBullish: boolean
): OptionsSetup {
  // Round to nearest 50 for Nifty strike
  const strikeDiff = niftyPrice % 50;
  let strikePrice = niftyPrice - strikeDiff;
  if (strikeDiff >= 25) strikePrice += 50;
  
  // Choose CE for Bullish, PE for Bearish
  const type = isBullish ? 'CE' : 'PE';

  // Target and SL in Nifty points, mapped to option premium roughly (delta approx 0.5 for ATM)
  // For Intraday, typical Nifty 50 move expected is ~ATR. 
  // Target = Premium + ~ (ATR * 0.5)
  // Stop Loss = Premium - ~ (ATR * 0.3)
  
  // We don't have exact live premiums without a live options feed, 
  // so we dictate entry "At Market" and specify the Nifty Spot targets:
  
  const targetPrice = isBullish ? Math.round(niftyPrice + atr * 1.2) : Math.round(niftyPrice - atr * 1.2);
  const stopLoss = isBullish ? Math.round(niftyPrice - atr * 0.7) : Math.round(niftyPrice + atr * 0.7);

  // Derive pattern from score strength
  let pattern = '';
  if (predictionScore > 1.5) pattern = 'Breakout / Strong Momentum';
  else if (predictionScore > 0.5) pattern = 'Trend Continuation';
  else if (predictionScore < -1.5) pattern = 'Breakdown / Heavy Selling';
  else if (predictionScore < -0.5) pattern = 'Trend Reversal Down';
  else pattern = 'Range Bound / Accumulation';

  // Confidence based on prediction score
  const confidence = Math.min(95, Math.max(40, Math.round(50 + Math.abs(predictionScore) * 15)));

  // Next Thursday Expiry calculation
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 4 is Thursday
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
  const expiryDate = new Date(today.getTime() + daysUntilThursday * 24 * 60 * 60 * 1000);
  const expiry = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return {
    type,
    strikePrice,
    entryPremium: 'At Market',
    targetPrice,
    stopLoss,
    pattern,
    confidence,
    expiry,
  };
}
