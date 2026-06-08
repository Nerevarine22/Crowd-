/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Users, AlertCircle, Loader2 } from 'lucide-react';
import CrowdVisualization from './components/CrowdVisualization';

export default function App() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crowdCount, setCrowdCount] = useState(100);
  
  const [userData, setUserData] = useState<{
    followersCount: number;
    avatarUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Remove @ if user included it
    const cleanUsername = username.trim().replace(/^@/, '');

    setIsLoading(true);
    setError(null);
    setUserData(null);

    try {
      const response = await fetch('/api/twitter-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user data');
      }

      setUserData({
        followersCount: data.followersCount,
        avatarUrl: data.avatarUrl,
      });
      const mappedCount = Math.min(Math.max(15, Math.floor(Math.log10((data.followersCount || 0) + 1) * 35)), 350);
      setCrowdCount(mappedCount);
    } catch (err: any) {
      setError(err.message || 'Сталася помилка. Перевірте нікнейм.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] font-sans p-4 md:p-8 flex flex-col overflow-x-hidden">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white flex items-center justify-center rounded-lg">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-black">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">X Metrics Insight</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-mono text-zinc-400">API: Active</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Search & Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Input Control Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 md:p-8 flex flex-col justify-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Пошук X профілю</h2>
              <p className="text-zinc-400 text-sm">Введіть username щоб отримати кількість підписників та фото</p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Query Target</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xl font-medium">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elonmusk"
                  className="w-full bg-black border border-zinc-700 rounded-2xl py-4 pl-10 pr-4 text-xl focus:ring-2 focus:ring-white outline-none transition-all disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl text-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Profile Data'
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl flex items-start gap-3 mt-2 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Always visible slider control */}
            <div className="mt-2 pt-4 border-t border-zinc-800/80">
              <div className="flex justify-between text-xs text-zinc-400 mb-2">
                <span>Масштабований натовп:</span>
                <span className="font-mono text-[#ffd700] font-bold">{crowdCount} осіб</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                value={crowdCount}
                onChange={(e) => setCrowdCount(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
              />
            </div>
          </div>

          {/* Follower Count Card (only shown when userData is available) */}
          {userData && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 md:p-8 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-5 duration-350">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Follower Audience</span>
                <Users className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="flex items-baseline gap-4 mb-2 mt-auto">
                <span className="text-5xl font-black tracking-tighter truncate text-white">
                  {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(userData.followersCount || 0)}
                </span>
                <span className="text-xl font-medium text-zinc-500">
                  ({new Intl.NumberFormat('uk-UA').format(userData.followersCount || 0)})
                </span>
              </div>
              <p className="text-zinc-500 text-sm mt-1">Real-time snapshot for @{username.replace(/^@/, '')}</p>
            </div>
          )}
        </div>

        {/* Right Column: PixiJS Crowd Perspective Visualization (Always Visible) */}
        <div className="lg:col-span-7 flex flex-col justify-center min-h-[400px] h-full">
          <CrowdVisualization 
            avatarUrl={userData?.avatarUrl} 
            crowdCount={crowdCount} 
            className="flex-grow w-full h-auto"
          />
        </div>

      </main>

      {/* Footer Status Bar */}
      <footer className="mt-6 md:mt-8 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        <div>System Operational</div>
        <div>© {new Date().getFullYear()} Profile Fetcher Labs</div>
      </footer>
    </div>
  );
}
