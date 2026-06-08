/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Users, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      <main className="flex-grow grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4">
        
        {/* Input Control Card */}
        <div className={`col-span-1 ${userData ? 'md:col-span-5 md:row-span-2' : 'md:col-span-12 md:row-span-6'} bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 text-center md:text-left md:p-8 flex flex-col justify-center gap-4 transition-all duration-500`}>
          {!userData && (
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Пошук X профілю</h2>
              <p className="text-zinc-400 text-sm">Введіть username щоб отримати кількість підписників та фото</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-sm uppercase tracking-widest text-zinc-500 font-semibold text-left">Query Target</label>
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
        </div>

        {userData && (
          <>
            {/* Follower Count Card */}
            <div className="col-span-1 md:col-span-7 md:row-span-2 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 md:p-8 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Follower Audience</span>
                <Users className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="flex items-baseline gap-4 mb-4 md:mb-0 mt-auto">
                <span className="text-6xl lg:text-8xl font-black tracking-tighter truncate">
                  {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(userData.followersCount || 0)}
                </span>
                <span className="hidden md:inline-block text-2xl md:text-3xl lg:text-4xl font-medium text-zinc-500">
                  ({new Intl.NumberFormat('uk-UA').format(userData.followersCount || 0)})
                </span>
              </div>
              <p className="text-zinc-500 text-sm mt-auto">Real-time snapshot for @{username.replace(/^@/, '')}</p>
            </div>

            {/* Avatar Display Card (Large) */}
            <div className="col-span-1 md:col-span-12 md:row-span-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden relative min-h-[300px] animate-in fade-in zoom-in-95 duration-300 delay-100">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
              
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 p-8">
                <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full border-8 border-black shadow-2xl overflow-hidden relative">
                  {userData.avatarUrl ? (
                    <img 
                      src={userData.avatarUrl.replace('_normal', '_400x400')} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = userData.avatarUrl;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                      <Users className="w-20 h-20 md:w-40 md:h-40 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-full pointer-events-none"></div>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-20">
                <h2 className="text-3xl md:text-4xl font-bold truncate max-w-[80vw] md:max-w-xl">@{username.replace(/^@/, '')}</h2>
                <p className="text-zinc-400 text-base md:text-lg">Профіль знайдено</p>
              </div>
              <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hidden sm:block">
                <span className="text-xs font-bold uppercase">Verified Source</span>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer Status Bar */}
      <footer className="mt-6 md:mt-8 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        <div>System Operational</div>
        <div>© {new Date().getFullYear()} Profile Fetcher Labs</div>
      </footer>
    </div>
  );
}
