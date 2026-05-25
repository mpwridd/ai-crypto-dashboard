'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Bot, BarChart3, DollarSign, Volume2, Clock, ExternalLink, Search } from 'lucide-react';

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
  image: string;
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 30;
  const points = data.slice(-30).map((v, i) => {
    const x = (i / 29) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function Home() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [updated, setUpdated] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'market_cap' | 'price_change_percentage_24h' | 'total_volume'>('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchMarket = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (data.data) {
        setCoins(data.data);
        setUpdated(data.updated);
      }
    } catch {
      console.error('Failed to fetch');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 30000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  const analyzeMarket = async () => {
    setLoading(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question || undefined, coins }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setAnalysis(`❌ Error: ${err instanceof Error ? err.message : 'Failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = coins
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField] || 0;
      const bv = b[sortField] || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const totalMcap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);
  const totalVol = coins.reduce((s, c) => s + (c.total_volume || 0), 0);
  const avgChange = coins.length ? coins.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / coins.length : 0;
  const gainers = coins.filter(c => (c.price_change_percentage_24h || 0) > 0).length;
  const losers = coins.length - gainers;

  const topGainers = [...coins].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 5);
  const topLosers = [...coins].sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)).slice(0, 5);

  const timeAgo = updated ? `${Math.floor((Date.now() - updated) / 1000)}s ago` : '';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                AI Crypto Dashboard
              </h1>
              <p className="text-gray-400 text-sm">Real-time market data · AI analysis · Mimo v2.5 Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Updated {timeAgo}</span>
            <button
              onClick={fetchMarket}
              disabled={fetching}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Market Cap', value: `$${(totalMcap / 1e12).toFixed(2)}T`, icon: DollarSign, color: 'text-yellow-400' },
            { label: '24h Volume', value: `$${(totalVol / 1e9).toFixed(1)}B`, icon: Volume2, color: 'text-blue-400' },
            { label: 'Avg 24h Change', value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`, icon: avgChange >= 0 ? TrendingUp : TrendingDown, color: avgChange >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Gainers / Losers', value: `${gainers} / ${losers}`, icon: BarChart3, color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className={s.color} />
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Movers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-2xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              Top Gainers
            </h3>
            <div className="space-y-2">
              {topGainers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-2.5">
                    <img src={c.image} alt={c.name} className="w-6 h-6 rounded-full" />
                    <div>
                      <span className="font-medium text-sm">{c.symbol.toUpperCase()}</span>
                      <span className="text-xs text-gray-500 ml-1.5">${c.current_price?.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-green-400 font-bold text-sm">+{c.price_change_percentage_24h?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-400" />
              Top Losers
            </h3>
            <div className="space-y-2">
              {topLosers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-2.5">
                    <img src={c.image} alt={c.name} className="w-6 h-6 rounded-full" />
                    <div>
                      <span className="font-medium text-sm">{c.symbol.toUpperCase()}</span>
                      <span className="text-xs text-gray-500 ml-1.5">${c.current_price?.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-red-400 font-bold text-sm">{c.price_change_percentage_24h?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-gray-900 rounded-2xl p-5 mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Bot size={18} className="text-orange-400" />
            AI Market Analysis
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ask about the market... (e.g., 'What's the trend for ETH this week?')"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeMarket()}
            />
            <button
              onClick={analyzeMarket}
              disabled={loading || coins.length === 0}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 rounded-lg px-5 py-2.5 font-bold text-sm transition-all flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
              Analyze
            </button>
          </div>
          {analysis && (
            <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {analysis}
            </div>
          )}
        </div>

        {/* Full Table */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 size={16} className="text-yellow-400" />
              Market Overview ({filtered.length} coins)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="bg-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs border border-gray-700 focus:outline-none focus:border-gray-600"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-gray-800 rounded-lg px-2 py-1.5 text-xs border border-gray-700"
                value={sortField}
                onChange={e => setSortField(e.target.value as typeof sortField)}
              >
                <option value="market_cap">Market Cap</option>
                <option value="price_change_percentage_24h">24h Change</option>
                <option value="total_volume">Volume</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-xs">
                  <th className="text-left py-2 px-2 w-8">#</th>
                  <th className="text-left py-2 px-2">Coin</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">24h</th>
                  <th className="text-right py-2 px-2 hidden md:table-cell">7d</th>
                  <th className="text-right py-2 px-2 hidden lg:table-cell">24h High</th>
                  <th className="text-right py-2 px-2 hidden lg:table-cell">24h Low</th>
                  <th className="text-right py-2 px-2 hidden md:table-cell">Volume</th>
                  <th className="text-right py-2 px-2">Market Cap</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">7d Chart</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-2 text-gray-500 text-xs">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" />
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500 text-xs ml-1.5">{c.symbol.toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-medium">
                      ${c.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className={`py-3 px-2 text-right font-bold text-xs ${(c.price_change_percentage_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {c.price_change_percentage_24h?.toFixed(2)}%
                    </td>
                    <td className={`py-3 px-2 text-right text-xs hidden md:table-cell ${(c.price_change_percentage_7d_in_currency || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {c.price_change_percentage_7d_in_currency?.toFixed(2)}%
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400 text-xs hidden lg:table-cell">
                      ${c.high_24h?.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400 text-xs hidden lg:table-cell">
                      ${c.low_24h?.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400 text-xs hidden md:table-cell">
                      ${(c.total_volume / 1e9).toFixed(2)}B
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400 text-xs">
                      ${(c.market_cap / 1e9).toFixed(2)}B
                    </td>
                    <td className="py-3 px-2 text-center hidden md:table-cell">
                      {/* sparkline placeholder */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          Data from CoinGecko · AI Analysis by Mimo v2.5 Pro · Auto-refresh every 30s
        </div>
      </div>
    </div>
  );
}
