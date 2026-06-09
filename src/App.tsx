import React, { useState } from 'react';
import { Search, Users, AlertCircle, Loader2, Share2, Sparkles, ShieldAlert, BarChart3 } from 'lucide-react';
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

      const highResAvatarUrl = data.avatarUrl ? data.avatarUrl.replace('_normal', '_400x400') : '';
      const proxiedAvatarUrl = highResAvatarUrl ? `/api/avatar-proxy/avatar.jpg?url=${encodeURIComponent(highResAvatarUrl)}` : '';
      setUserData({
        followersCount: data.followersCount,
        avatarUrl: proxiedAvatarUrl,
      });
      const exactCount = Math.min(data.followersCount || 0, 100000);
      setCrowdCount(exactCount);
    } catch (err: any) {
      setError(err.message || 'Сталася помилка. Перевірте нікнейм.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const activeUsername = username.trim().replace(/^@/, '') || 'profile';
    const text = `Подивіться на мою аудиторію в X, візуалізовану як реальний натовп на MyCrowd! @${activeUsername} 👥✨`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(shareUrl, '_blank');
  };

  // Dynamic stats calculation
  const followers = userData ? userData.followersCount : crowdCount;
  const estimatedReach = Math.round(followers * 4.5);

  const getStadiumEquivalentText = (count: number) => {
    if (count === 0) return 'Порожній зал';
    if (count < 2000) {
      const val = (count / 500).toFixed(1);
      return `${val}x місцевих залів`;
    } else if (count < 15000) {
      const val = (count / 2200).toFixed(1);
      return `${val}x оперних театрів`;
    } else if (count < 80000) {
      const val = (count / 19500).toFixed(1);
      return `${val}x Madison Square Garden`;
    } else {
      const val = (count / 90000).toFixed(1);
      return `${val}x стадіонів Wembley`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-800 font-sans flex flex-col overflow-x-hidden relative dot-grid">
      {/* Background radial fade for dot-grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white/95 -z-20 pointer-events-none"></div>

      {/* Breathing gradient blur blob behind hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-indigo-200/30 via-violet-200/20 to-purple-200/30 rounded-full blur-3xl opacity-70 -z-10 pointer-events-none animate-pulse duration-[8000ms]"></div>

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-900 flex items-center justify-center rounded-xl shadow-md shadow-slate-900/10">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">MyCrowd</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Apify Scraper: Active</span>
          </div>

          {userData && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 border border-slate-200 rounded-xl text-sm transition-all shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              Поділитись
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center z-10">
        
        {/* Badge Intro */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold mb-6 select-none shadow-sm shadow-indigo-100/50">
          <Sparkles className="w-3.5 h-3.5 fill-indigo-100" />
          ВІЗУАЛІЗАЦІЯ АУДИТОРІЇ В РЕАЛЬНОМУ ЧАСІ
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tight max-w-3xl leading-[1.05] mb-6">
          See Your <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 bg-clip-text text-transparent">Audience.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10">
          Перетворіть своїх підписників у Twitter (X) на реальний інтерактивний натовп. Введіть свій нікнейм, щоб побачити обличчя та масштаб вашої спільноти.
        </p>

        {/* Username Input and CTA Form */}
        <div className="max-w-xl mx-auto w-full mb-8 px-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white rounded-2xl border border-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.03)] focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition-all duration-350">
            <div className="flex-grow flex items-center pl-3 gap-2">
              <span className="text-slate-400 text-xl font-medium select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="elonmusk"
                className="w-full bg-transparent border-none outline-none text-slate-800 text-lg placeholder-slate-400 py-3 disabled:opacity-50 font-medium"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98] select-none text-sm md:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Аналізуємо профіль...
                </>
              ) : (
                <>
                  Visualize My Audience
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 mt-4 text-left shadow-sm shadow-red-50/50">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Interactive Density Control */}
        <div className="max-w-sm mx-auto w-full px-6 mb-12 text-center">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Щільність натовпу</span>
            <span className="font-mono text-indigo-600 font-bold">{crowdCount.toLocaleString()} людей</span>
          </div>
          <input
            type="range"
            min="0"
            max="100000"
            value={crowdCount}
            onChange={(e) => setCrowdCount(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
          />
        </div>

        {/* Centered Circular Crowd Visualization */}
        <div className="w-full max-w-4xl aspect-[16/10] md:aspect-[16/9] mx-auto rounded-[2.5rem] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative mb-16">
          <CrowdVisualization 
            avatarUrl={userData?.avatarUrl} 
            crowdCount={crowdCount} 
            className="w-full h-full"
          />
        </div>

        {/* Live Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl mx-auto px-2 mb-12">
          
          {/* Card 1: Followers */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Підписники</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(followers)}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1 font-mono">
                {followers.toLocaleString()} осіб
              </span>
            </div>
          </div>

          {/* Card 2: Crowd Size */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Натовп у кадрі</span>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-indigo-600 tracking-tight">
                {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(crowdCount)}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1 font-mono">
                {crowdCount.toLocaleString()} аватарів
              </span>
            </div>
          </div>

          {/* Card 3: Stadium Seats */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Площа натовпу</span>
              <span className="text-[10px] font-bold text-indigo-600">Еквівалент</span>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-900 tracking-tight block leading-tight">
                {getStadiumEquivalentText(followers)}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1 font-mono">
                Заповнені трибуни
              </span>
            </div>
          </div>

          {/* Card 4: Estimated Reach */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Охоплення мережі</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(estimatedReach)}
              </span>
              <span className="block text-[11px] text-emerald-600 font-semibold mt-1 font-mono">
                ~{estimatedReach.toLocaleString()} показів
              </span>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-semibold select-none z-10">
        <div>System Operational</div>
        <div>© {new Date().getFullYear()} MyCrowd Labs</div>
      </footer>
    </div>
  );
}
