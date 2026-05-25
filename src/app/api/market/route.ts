import { NextRequest, NextResponse } from 'next/server';

const MIMO_API_KEY = process.env.MIMO_API_KEY || '';
const MIMO_BASE_URL = process.env.MIMO_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com/v1';
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2-omni';

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  circulating_supply: number;
  image: string;
  sparkline_in_7d: { price: number[] };
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h,7d',
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error('Failed to fetch');
    const data: CoinData[] = await res.json();
    return NextResponse.json({ data, updated: Date.now() });
  } catch {
    return NextResponse.json({ data: [], updated: Date.now(), error: 'Failed to fetch market data' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, coins } = await req.json();

    let marketData = coins;
    if (!marketData || marketData.length === 0) {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d',
        { next: { revalidate: 30 } }
      );
      marketData = await res.json();
    }

    const summary = marketData.slice(0, 15).map((c: CoinData) =>
      `${c.name} (${c.symbol.toUpperCase()}): $${c.current_price?.toLocaleString()} | 24h: ${c.price_change_percentage_24h?.toFixed(2)}% | 7d: ${c.price_change_percentage_7d_in_currency?.toFixed(2)}% | Vol: $${(c.total_volume / 1e9).toFixed(2)}B | MCap: $${(c.market_cap / 1e9).toFixed(2)}B`
    ).join('\n');

    const systemPrompt = `You are an expert cryptocurrency market analyst. Analyze the market data and provide:

1. 📊 **Market Overview** — General market sentiment (bullish/bearish/neutral)
2. 🔥 **Top Movers** — Biggest gainers and losers with % changes
3. 📈 **Trends & Patterns** — Technical observations, momentum shifts
4. 💰 **Volume Analysis** — Unusual volume activity, liquidity concerns
5. ⚠️ **Risk Assessment** — Volatility warnings, market risks
6. 🔮 **Outlook** — Short-term predictions based on data
7. 💡 **Key Takeaways** — 3-5 actionable insights

Use emojis, bold headers, and be specific with numbers. Keep it professional but readable.`;

    const userMessage = question
      ? `Market Data:\n${summary}\n\nUser Question: ${question}\n\nProvide a focused answer with market context.`
      : `Analyze this crypto market data:\n\n${summary}`;

    const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4096,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis generated';

    return NextResponse.json({ analysis, updated: Date.now() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
