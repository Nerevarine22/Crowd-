import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertCircle, Loader2, Sparkles, ShieldAlert, BarChart3 } from 'lucide-react';
import CrowdVisualization from './components/CrowdVisualization';

// 1. High-Performance Particle Field Background
const BackgroundParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
    const colors = ['#4F46E5', '#635BFF', '#A5B4FC', '#C7D2FE'];

    // Initialize subtle floating dots
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.08;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-15 pointer-events-none" />;
};

// 2. Count-Up Animation Component
const CountUp = ({ end, duration = 2000 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercent = Math.min(progress / duration, 1);
      
      // Easing out quadratic
      const easedProgress = progressPercent * (2 - progressPercent);
      
      setCount(Math.floor(easedProgress * end));

      if (progressPercent < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// 3. Main Application
export default function App() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crowdCount, setCrowdCount] = useState(100);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState<'idle' | 'loading' | 'completed'>('idle');
  const [messageIndex, setMessageIndex] = useState(0);
  
  const [userData, setUserData] = useState<{
    followersCount: number;
    avatarUrl: string;
  } | null>(null);

  const loadingMessages = [
    "Finding your followers...",
    "Counting the crowd...",
    "Building your audience...",
    "Filling the stadium...",
    "Arranging people...",
    "Checking available seats...",
    "Almost ready...",
    "Preparing the visualization..."
  ];

  // Rotate loading messages
  useEffect(() => {
    if (loadingStep !== 'loading') return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loadingStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isLoading) return;

    const cleanUsername = username.trim().replace(/^@/, '');
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setLoadingProgress(0);
    setLoadingStep('loading');
    setMessageIndex(0);

    let apiData: any = null;
    let apiError: any = null;
    let isApiDone = false;

    // Trigger API request
    const apiPromise = fetch('/api/twitter-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch user data');
        }
        apiData = data;
        isApiDone = true;
      })
      .catch((err) => {
        apiError = err;
        isApiDone = true;
      });

    // Animate progress smoothly over at least 5.5 seconds (anticipation phase)
    const startTime = Date.now();
    const minDuration = 5500; 

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const elapsedTime = Date.now() - startTime;
        
        if (isApiDone) {
          if (apiError) {
            clearInterval(progressInterval);
            setError(apiError.message || 'Сталася помилка. Перевірте нікнейм.');
            setIsLoading(false);
            setLoadingStep('idle');
            return 0;
          }
          
          if (elapsedTime >= minDuration) {
            if (prev >= 100) {
              clearInterval(progressInterval);
              const highResAvatarUrl = apiData.avatarUrl ? apiData.avatarUrl.replace('_normal', '_400x400') : '';
              const proxiedAvatarUrl = highResAvatarUrl ? `/api/avatar-proxy/avatar.jpg?url=${encodeURIComponent(highResAvatarUrl)}` : '';
              setUserData({
                followersCount: apiData.followersCount,
                avatarUrl: proxiedAvatarUrl,
              });
              setCrowdCount(Math.min(apiData.followersCount || 0, 100000));
              setLoadingStep('completed');
              setIsLoading(false);
              return 100;
            }
            return prev + Math.floor(Math.random() * 8) + 6; // Quick count to 100%
          }
        }

        if (prev >= 95) return 95; // Hold at 95%
        
        const rate = prev < 50 ? 1.5 : (prev < 80 ? 0.8 : 0.3);
        return Math.min(95, prev + (Math.random() * rate + 0.15));
      });
    }, 50);
  };

  const handleShare = () => {
    const activeUsername = username.trim().replace(/^@/, '') || 'profile';
    const text = `See what my X audience actually looks like as a real crowd! Visualize yours on MyCrowd: @${activeUsername} 👥✨`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(shareUrl, '_blank');
  };

  const handleDownload = () => {
    if (!userData) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, 1200, 630);

    // Draw grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let x = 24; x < 1200; x += 24) {
      for (let y = 24; y < 630; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw gradient glow
    const gradient = ctx.createRadialGradient(600, 315, 50, 600, 315, 450);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.05)');
    gradient.addColorStop(1, 'rgba(250, 250, 250, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // Header label
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '6px';
    ctx.fillText('MY CROWD', 600, 90);

    // Dynamic statement texts
    const classrooms = Math.max(1, Math.round(followers / 30));
    const halls = Math.max(1, Math.round(followers / 500));
    const stadiumSections = Math.max(1, Math.round(followers / 1500));
    let statementText = '';
    if (followers < 500) {
      statementText = `Enough people to fill ${classrooms} classrooms.`;
    } else if (followers < 5000) {
      statementText = `Enough people to fill ${halls} conference halls.`;
    } else {
      statementText = `Enough people to fill ${stadiumSections} stadium sections.`;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = userData.avatarUrl || '';
    img.onload = () => {
      // Draw circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(600, 220, 48, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 552, 172, 96, 96);
      ctx.restore();

      // Outline borders
      ctx.beginPath();
      ctx.arc(600, 220, 50, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#111111';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(600, 220, 54, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Username text
      ctx.font = '500 22px "Inter", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.fillText(`@${username.replace(/^@/, '')}`, 600, 305);

      // Follower count
      ctx.font = '900 60px "Inter Tight", "Inter", sans-serif';
      ctx.fillStyle = '#111111';
      ctx.fillText(`${followers.toLocaleString()} Followers`, 600, 365);

      // Statement
      ctx.font = '500 20px "Inter", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(statementText, 600, 435);

      // Footer brand
      ctx.font = 'bold 12px "Inter", monospace';
      ctx.fillStyle = '#4F46E5';
      ctx.fillText('mycrowd.app', 600, 530);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mycrowd-${username.replace(/^@/, '')}.png`;
      link.href = dataUrl;
      link.click();
    };

    img.onerror = () => {
      ctx.beginPath();
      ctx.arc(600, 220, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d97706';
      ctx.stroke();

      ctx.font = '36px "Inter"';
      ctx.fillStyle = '#d97706';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 600, 216);

      ctx.font = '500 22px "Inter", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textBaseline = 'top';
      ctx.fillText(`@${username.replace(/^@/, '')}`, 600, 305);

      ctx.font = '900 60px "Inter Tight", "Inter", sans-serif';
      ctx.fillStyle = '#111111';
      ctx.fillText(`${followers.toLocaleString()} Followers`, 600, 365);

      ctx.font = '500 20px "Inter", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(statementText, 600, 435);

      ctx.font = 'bold 12px "Inter", monospace';
      ctx.fillStyle = '#4F46E5';
      ctx.fillText('mycrowd.app', 600, 530);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mycrowd-${username.replace(/^@/, '')}.png`;
      link.href = dataUrl;
      link.click();
    };
  };

  const handleReset = () => {
    setUsername('');
    setUserData(null);
    setLoadingStep('idle');
  };

  // Calculations for result screen
  const followersCountVal = userData ? userData.followersCount : crowdCount;
  const busesCount = Math.max(1, Math.round(followersCountVal / 50));
  const classroomsCount = Math.max(1, Math.round(followersCountVal / 30));
  const hallsCount = Math.max(1, Math.round(followersCountVal / 500));
  const sectionsCount = Math.max(1, Math.round(followersCountVal / 1500));

  const getResultStatement = (count: number) => {
    if (count < 500) {
      return `Enough people to fill ${classroomsCount} classrooms.`;
    } else if (count < 5000) {
      return `Enough people to fill ${hallsCount} conference halls.`;
    } else {
      return `Enough people to fill ${sectionsCount} stadium sections.`;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] font-sans flex flex-col overflow-x-hidden relative dot-grid select-none">
      
      {/* Background dot-grid radial mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAFAFA]/70 to-[#FAFAFA]/95 -z-20 pointer-events-none"></div>

      {/* Subtle particle system */}
      <BackgroundParticles />

      {/* Header navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#111111] flex items-center justify-center rounded-xl shadow-md">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-[#111111]">MyCrowd</span>
        </div>
      </header>

      {/* State Machine Layout */}
      <div className="flex-grow flex flex-col justify-center items-center w-full z-10">
        
        {/* 1. HERO / SEARCH VIEW */}
        {loadingStep === 'idle' && (
          <div className="w-full max-w-4xl px-6 py-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#4F46E5]/5 text-[#4F46E5] border border-[#4F46E5]/10 rounded-full text-xs font-semibold mb-8 select-none">
              <Sparkles className="w-3.5 h-3.5 fill-[#4F46E5]/10" />
              ВІЗУАЛІЗАЦІЯ ПІДПИСНИКІВ X (TWITTER)
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-[#111111] tracking-tight leading-[1.05] max-w-4xl mb-6 font-heading">
              See what your audience actually looks like.
            </h1>

            <p className="text-lg sm:text-xl text-[#666666] max-w-2xl leading-relaxed mb-12">
              Перетворіть своїх підписників у Twitter на реальний натовп та відкрийте для себе справжній масштаб вашої аудиторії.
            </p>

            {/* Input Card Wrapper */}
            <div className="max-w-xl mx-auto w-full mb-12 px-2">
              <form onSubmit={handleSubmit} className="relative w-full h-[72px] bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.02)] focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-[#4F46E5]/10 transition-all duration-300 flex items-center p-2">
                <span className="text-slate-400 text-2xl font-normal pl-4 select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="flex-grow bg-transparent border-none outline-none text-[#111111] text-xl placeholder-slate-300 px-2 h-full disabled:opacity-50 font-medium"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="h-full bg-[#4F46E5] hover:bg-[#635BFF] text-white font-semibold px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.97] select-none text-base"
                >
                  Visualize My Crowd
                </button>
              </form>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 mt-4 text-left shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Density adjust slider */}
            <div className="max-w-xs mx-auto w-full px-4 text-center">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Рівень сітки</span>
                <span className="font-mono text-[#4F46E5] font-bold">{crowdCount.toLocaleString()} осіб</span>
              </div>
              <input
                type="range"
                min="0"
                max="100000"
                value={crowdCount}
                onChange={(e) => setCrowdCount(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4F46E5] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* 2. LOADING STATE VIEW */}
        {loadingStep === 'loading' && (
          <div className="w-full max-w-lg px-6 py-20 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
            {/* SVG Circular Loader */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="text-slate-100"
                  strokeWidth="5"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="text-[#4F46E5] transition-all duration-150 ease-out"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 64}
                  strokeDashoffset={2 * Math.PI * 64 * (1 - Math.round(loadingProgress) / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-4xl font-black text-[#111111] tracking-tighter font-heading">
                {Math.round(loadingProgress)}%
              </span>
            </div>

            {/* Rotating message */}
            <p className="text-xl text-[#666666] font-medium tracking-tight h-8 animate-pulse duration-1000">
              {loadingMessages[messageIndex]}
            </p>
          </div>
        )}

        {/* 3. RESULT VIEW */}
        {loadingStep === 'completed' && (
          <div className="w-full px-6 py-12 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
            
            {/* Followers count and statement */}
            <div className="mb-12">
              <h2 className="text-5xl md:text-7xl font-black text-[#111111] tracking-tight mb-4 font-heading">
                <CountUp end={followersCountVal} /> Followers
              </h2>
              <p className="text-xl md:text-2xl text-[#666666] max-w-xl mx-auto font-medium tracking-tight">
                {getResultStatement(followersCountVal)}
              </p>
            </div>

            {/* Central massive visualization */}
            <div className="w-full max-w-4xl aspect-[16/10] md:aspect-[16/9] mx-auto rounded-[2.5rem] border border-slate-200/70 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.03)] overflow-hidden relative mb-20">
              <CrowdVisualization 
                avatarUrl={userData?.avatarUrl} 
                crowdCount={crowdCount} 
                className="w-full h-full"
              />
            </div>

            {/* Title for comparisons */}
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-10">Порівняння масштабу</h3>

            {/* Comparison cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mx-auto px-2 mb-24">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-[0_8px_35px_rgba(0,0,0,0.015)] hover:border-slate-300 transition-colors">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Автобуси</span>
                <span className="text-4xl font-black text-[#111111] tracking-tight">≈ {busesCount}</span>
                <span className="block text-[11px] text-slate-400 mt-1.5 font-medium">місткістю 50 людей</span>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-[0_8px_35px_rgba(0,0,0,0.015)] hover:border-slate-300 transition-colors">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Класи</span>
                <span className="text-4xl font-black text-[#111111] tracking-tight">≈ {classroomsCount}</span>
                <span className="block text-[11px] text-slate-400 mt-1.5 font-medium">по 30 учнів</span>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-[0_8px_35px_rgba(0,0,0,0.015)] hover:border-slate-300 transition-colors">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Конференц-зали</span>
                <span className="text-4xl font-black text-[#111111] tracking-tight">≈ {hallsCount}</span>
                <span className="block text-[11px] text-slate-400 mt-1.5 font-medium">по 500 місць</span>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-[0_8px_35px_rgba(0,0,0,0.015)] hover:border-slate-300 transition-colors">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Сектори стадіону</span>
                <span className="text-4xl font-black text-[#111111] tracking-tight">≈ {sectionsCount}</span>
                <span className="block text-[11px] text-slate-400 mt-1.5 font-medium">по 1500 місць</span>
              </div>
            </div>

            {/* Title for Share Section */}
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-10">Поділитись результатом</h3>

            {/* Screenshot Share Card */}
            <div className="max-w-md mx-auto w-full mb-20 px-2">
              <div id="share-card" className="bg-[#FAFAFA] border border-slate-200/90 rounded-[2rem] p-12 shadow-[0_16px_50px_rgba(0,0,0,0.03)] text-center relative overflow-hidden flex flex-col items-center select-none">
                <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/70 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center w-full">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-8">MY CROWD</span>

                  {/* Avatar wrapper */}
                  {userData?.avatarUrl ? (
                    <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-md mb-6">
                      <div className="w-[84px] h-[84px] rounded-full border-[3px] border-[#111111] overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src={userData.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full border-[3px] border-amber-600 bg-[#ffd700] flex items-center justify-center shadow-inner mb-6">
                      <svg className="w-12 h-12 text-amber-600 fill-current" viewBox="0 0 24 24">
                        <path d="M12 .587l3.668 7.431 8.2 1.19-5.934 5.784 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.208l8.2-1.19z" />
                      </svg>
                    </div>
                  )}

                  <span className="text-lg font-medium text-[#666666] mb-2">@{username.replace(/^@/, '')}</span>

                  <span className="text-4xl md:text-5xl font-black text-[#111111] tracking-tight mb-3 font-heading">
                    {followersCountVal.toLocaleString()} Followers
                  </span>

                  <p className="text-base text-[#666666] font-medium max-w-xs mb-10 leading-snug">
                    {getResultStatement(followersCountVal)}
                  </p>

                  <span className="text-xs font-mono font-bold text-[#4F46E5] uppercase tracking-wider">mycrowd.app</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={handleShare}
                  className="w-full bg-[#4F46E5] hover:bg-[#635BFF] text-white font-semibold py-4.5 rounded-2xl text-base transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4.5 rounded-2xl text-base border border-slate-200/90 transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  Download Image
                </button>
              </div>

              {/* Reset view link */}
              <div className="text-center mt-6">
                <button
                  onClick={handleReset}
                  className="text-[#4F46E5] hover:text-[#635BFF] font-semibold text-sm hover:underline cursor-pointer"
                >
                  Visualize another crowd
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-semibold select-none z-10">
        <div>System Operational</div>
        <div>© {new Date().getFullYear()} MyCrowd Labs</div>
      </footer>
    </div>
  );
}
