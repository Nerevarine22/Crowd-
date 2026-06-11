import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import CrowdVisualization from './components/CrowdVisualization';

// ─── Count-Up ─────────────────────────────────────────────────────────────────
const CountUp = ({ end, duration = 2000 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(p * (2 - p) * end));
      if (p < 1) requestAnimationFrame(animate);
      else setCount(end);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return <span>{count.toLocaleString()}</span>;
};

// ─── Orbit data ────────────────────────────────────────────────────────────────
// 3 concentric rings, 60 avatars total. All monochrome silhouettes.
const generateOrbitsList = () => {
  const avatars: {
    id: number; ring: number; radius: number; angle: number;
    scale: number; delay: number; duration: number; direction: 'cw' | 'ccw';
    opacity: number;
  }[] = [];
  let id = 1;

  // Ring 1 – 18 avatars, inner, CW
  for (let i = 0; i < 18; i++) {
    avatars.push({
      id: id++, ring: 1,
      radius: 300 + (i % 3) * 8,
      angle: (i / 18) * 360,
      scale: 0.65 + (i % 2) * 0.1,
      delay: -(i * 2.5),
      duration: 55 + (i % 4) * 6,
      direction: 'cw',
      opacity: 0.06 + (i % 3) * 0.02,
    });
  }
  // Ring 2 – 22 avatars, middle, CCW
  for (let i = 0; i < 22; i++) {
    avatars.push({
      id: id++, ring: 2,
      radius: 390 + (i % 3) * 8,
      angle: (i / 22) * 360 + 10,
      scale: 0.52 + (i % 2) * 0.08,
      delay: -(i * 3),
      duration: 70 + (i % 4) * 7,
      direction: 'ccw',
      opacity: 0.04 + (i % 3) * 0.015,
    });
  }
  // Ring 3 – 20 avatars, outer, CW
  for (let i = 0; i < 20; i++) {
    avatars.push({
      id: id++, ring: 3,
      radius: 470 + (i % 3) * 8,
      angle: (i / 20) * 360 + 22,
      scale: 0.40 + (i % 2) * 0.06,
      delay: -(i * 3.5),
      duration: 88 + (i % 4) * 8,
      direction: 'cw',
      opacity: 0.03 + (i % 3) * 0.01,
    });
  }
  return avatars;
};

const orbitAvatarsList = generateOrbitsList();

// Monochrome person silhouette SVG (standard social media default)
const PersonSilhouette = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

// ─── Scattered background figures ─────────────────────────────────────────────
// These are tiny human silhouettes spread across the full hero background.
// Pure monochrome (black), extremely low opacity (3–7%), some blurred for depth.
const buildBgFigures = () => {
  const items: {
    id: number; top: number; left: number; size: number;
    opacity: number; blur: number; delay: number; duration: number;
    floatY: number; floatX: number;
  }[] = [];

  const positions = [
    // left column
    { top:  6, left:  4 }, { top: 18, left:  7 }, { top: 32, left:  2 },
    { top: 48, left:  6 }, { top: 63, left:  3 }, { top: 76, left:  8 },
    { top: 88, left:  5 }, { top: 14, left: 12 }, { top: 55, left: 11 },
    { top: 82, left: 14 },
    // right column
    { top:  8, left: 88 }, { top: 22, left: 93 }, { top: 36, left: 90 },
    { top: 50, left: 95 }, { top: 65, left: 87 }, { top: 78, left: 92 },
    { top: 91, left: 89 }, { top: 12, left: 82 }, { top: 42, left: 85 },
    { top: 70, left: 82 },
    // scattered mid
    { top:  5, left: 25 }, { top:  8, left: 45 }, { top:  7, left: 66 },
    { top: 93, left: 28 }, { top: 92, left: 50 }, { top: 94, left: 72 },
    { top: 35, left: 17 }, { top: 28, left: 78 }, { top: 72, left: 19 },
    { top: 68, left: 77 },
    // deeper scatter
    { top: 20, left: 30 }, { top: 80, left: 35 }, { top: 15, left: 60 },
    { top: 85, left: 62 }, { top: 40, left: 22 }, { top: 58, left: 80 },
  ];

  positions.forEach((pos, i) => {
    const isBlurred  = i % 3 === 0;
    const isSharp    = i % 5 === 0;
    items.push({
      id: i,
      top: pos.top,
      left: pos.left,
      size: isSharp ? 32 + (i % 4) * 5 : 20 + (i % 5) * 4,
      opacity: 0.03 + (i % 4) * 0.01,
      blur: isBlurred ? 1.2 + (i % 3) * 0.6 : 0,
      delay: -(i * 1.3),
      duration: 9 + (i % 6) * 2,
      floatY: -(3 + (i % 4) * 1.5),
      floatX: (i % 2 === 0 ? 1 : -1) * (1 + (i % 3)),
    });
  });
  return items;
};

const bgFigures = buildBgFigures();

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [username,      setUsername]      = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [isFocused,     setIsFocused]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [crowdCount,    setCrowdCount]    = useState(100);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep,   setLoadingStep]   = useState<'idle' | 'loading' | 'completed'>('idle');
  const [messageIndex,  setMessageIndex]  = useState(0);
  const [userData,      setUserData]      = useState<{ followersCount: number; avatarUrl: string } | null>(null);
  const [subheadlineIndex, setSubheadlineIndex] = useState(0);
  const [fade,          setFade]          = useState(true);

  const subheadlinePhrases = [
    "Let's check out your crowd",
    "Are there at least 100 followers already?",
    "More followers than yesterday? Fine, take the win",
    "Remember when we had zero followers? Right",
    "A few more followers and you can retire",
    "If all your followers chip in a dollar, you'll have enough for,,,,",
  ];

  const loadingMessages = [
    "Finding your followers...",
    "Counting the crowd...",
    "Building your audience...",
    "Filling the stadium...",
    "Arranging people...",
    "Checking available seats...",
    "Almost ready...",
    "Preparing the visualization...",
    "Let's check out your crowd",
    "Are there at least 100 followers already?",
    "More followers than yesterday? Fine, take the win",
    "Remember when we had zero followers? Right",
    "A few more followers and you can retire",
    "If all your followers chip in a dollar, you'll have enough for,,,,",
  ];

  useEffect(() => {
    if (loadingStep !== 'idle') return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setSubheadlineIndex(p => (p + 1) % subheadlinePhrases.length); setFade(true); }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [loadingStep]);

  useEffect(() => {
    if (loadingStep !== 'loading') return;
    const interval = setInterval(() => setMessageIndex(p => (p + 1) % loadingMessages.length), 1800);
    return () => clearInterval(interval);
  }, [loadingStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isLoading) return;
    const cleanUsername = username.trim().replace(/^@/, '');
    setIsLoading(true); setError(null); setUserData(null);
    setLoadingProgress(0); setLoadingStep('loading'); setMessageIndex(0);

    let apiData: any = null;
    let apiError: any = null;
    let isApiDone = false;

    fetch('/api/twitter-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch user data');
        apiData = data; isApiDone = true;
      })
      .catch((err) => { apiError = err; isApiDone = true; });

    const startTime = Date.now();
    const minDuration = 5500;
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const elapsed = Date.now() - startTime;
        if (isApiDone) {
          if (apiError) {
            clearInterval(progressInterval);
            setError(apiError.message || 'An error occurred. Please check the username.');
            setIsLoading(false); setLoadingStep('idle');
            return 0;
          }
          if (elapsed >= minDuration) {
            if (prev >= 100) {
              clearInterval(progressInterval);
              const highResAvatarUrl = apiData.avatarUrl ? apiData.avatarUrl.replace('_normal', '_400x400') : '';
              const proxiedAvatarUrl = highResAvatarUrl ? `/api/avatar-proxy/avatar.jpg?url=${encodeURIComponent(highResAvatarUrl)}` : '';
              setUserData({ followersCount: apiData.followersCount, avatarUrl: proxiedAvatarUrl });
              setCrowdCount(Math.min(apiData.followersCount || 0, 100000));
              setLoadingStep('completed'); setIsLoading(false);
              return 100;
            }
            return prev + Math.floor(Math.random() * 8) + 6;
          }
        }
        if (prev >= 95) return 95;
        const rate = prev < 50 ? 1.5 : prev < 80 ? 0.8 : 0.3;
        return Math.min(95, prev + (Math.random() * rate + 0.15));
      });
    }, 50);
  };

  const handleShare = () => {
    const activeUsername = username.trim().replace(/^@/, '') || 'profile';
    const text = `See what my X audience actually looks like as a real crowd! Visualize yours on MyCrowd: @${activeUsername} 👥✨`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, '_blank');
  };

  const handleDownload = () => {
    if (!userData) return;
    const followers = userData.followersCount;
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 28; x < 1200; x += 28)
      for (let y = 28; y < 630; y += 28) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }
    const g = ctx.createRadialGradient(600, 315, 50, 600, 315, 400);
    g.addColorStop(0, 'rgba(91,92,246,0.04)'); g.addColorStop(1, 'rgba(250,250,250,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 630);

    ctx.font = 'bold 11px "Inter", sans-serif'; ctx.fillStyle = '#999';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('MY CROWD', 600, 90);

    const classrooms = Math.max(1, Math.round(followers / 30));
    const halls      = Math.max(1, Math.round(followers / 500));
    const sections   = Math.max(1, Math.round(followers / 1500));
    const statementText = followers < 500
      ? `Enough people to fill ${classrooms} classrooms.`
      : followers < 5000
        ? `Enough people to fill ${halls} conference halls.`
        : `Enough people to fill ${sections} stadium sections.`;

    const img = new Image(); img.crossOrigin = 'anonymous';
    img.src = userData.avatarUrl || '';
    img.onload = () => {
      ctx.save(); ctx.beginPath(); ctx.arc(600, 220, 40, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, 560, 180, 80, 80); ctx.restore();
      ctx.font = '500 22px "Inter", sans-serif'; ctx.fillStyle = '#666';
      ctx.fillText(`@${username.replace(/^@/, '')}`, 600, 305);
      ctx.font = '900 60px "Inter Tight", "Inter", sans-serif'; ctx.fillStyle = '#111';
      ctx.fillText(`${followers.toLocaleString()} Followers`, 600, 360);
      ctx.font = '500 20px "Inter", sans-serif'; ctx.fillStyle = '#666';
      ctx.fillText(statementText, 600, 435);
      ctx.font = 'bold 12px "Inter", monospace'; ctx.fillStyle = '#5B5CF6';
      ctx.fillText('mycrowd.app', 600, 530);
      const link = document.createElement('a');
      link.download = `mycrowd-${username.replace(/^@/, '')}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    };
    img.onerror = () => {
      ctx.font = '500 22px "Inter", sans-serif'; ctx.fillStyle = '#666'; ctx.textBaseline = 'top';
      ctx.fillText(`@${username.replace(/^@/, '')}`, 600, 305);
      ctx.font = '900 60px "Inter Tight", "Inter", sans-serif'; ctx.fillStyle = '#111';
      ctx.fillText(`${followers.toLocaleString()} Followers`, 600, 360);
      ctx.font = '500 20px "Inter", sans-serif'; ctx.fillStyle = '#666';
      ctx.fillText(statementText, 600, 435);
      ctx.font = 'bold 12px "Inter", monospace'; ctx.fillStyle = '#5B5CF6';
      ctx.fillText('mycrowd.app', 600, 530);
      const link = document.createElement('a');
      link.download = `mycrowd-${username.replace(/^@/, '')}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    };
  };

  const handleReset = () => { setUsername(''); setUserData(null); setLoadingStep('idle'); };

  const followersCountVal = userData ? userData.followersCount : crowdCount;
  const busesCount      = Math.max(1, Math.round(followersCountVal / 50));
  const classroomsCount = Math.max(1, Math.round(followersCountVal / 30));
  const hallsCount      = Math.max(1, Math.round(followersCountVal / 500));
  const sectionsCount   = Math.max(1, Math.round(followersCountVal / 1500));
  const getResultStatement = (count: number) => {
    if (count < 500)  return `Enough people to fill ${classroomsCount} classrooms.`;
    if (count < 5000) return `Enough people to fill ${hallsCount} conference halls.`;
    return `Enough people to fill ${sectionsCount} stadium sections.`;
  };

  const isActive = isFocused || !!username.trim();

  return (
    <div
      className="text-[#111111] font-sans flex flex-col overflow-x-hidden relative dot-grid select-none"
      style={{
        background: '#FAFAFA',
        minHeight: '100vh',
        height: loadingStep === 'idle' ? '100vh' : 'auto',
        overflow: loadingStep === 'idle' ? 'hidden' : 'auto',
      }}
    >

      {/* ── Very soft ambient glows – no colors, just light ─────────── */}
      {/* Primary hero glow – violet, breathing, barely visible */}
      {loadingStep === 'idle' && (
        <div
          className="absolute pointer-events-none -z-10 animate-breathe"
          style={{
            top: '42%', left: '50%',
            width: 'min(85vw, 680px)', height: 'min(85vw, 680px)',
            background: 'radial-gradient(circle, rgba(91,92,246,0.09) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(-50%,-50%)',
          }}
        />
      )}
      {/* Secondary top-right glow – even quieter */}
      {loadingStep === 'idle' && (
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none -z-10 animate-breathe2"
          style={{
            background: 'radial-gradient(circle, rgba(91,92,246,0.05) 0%, transparent 65%)',
            borderRadius: '50%',
            transform: 'translate(35%, -35%)',
          }}
        />
      )}

      {/* ── Scattered background human silhouettes ───────────────────── */}
      {loadingStep === 'idle' && bgFigures.map((fig) => (
        <div
          key={fig.id}
          className="absolute pointer-events-none -z-10 animate-float-bob"
          style={{
            top: `${fig.top}%`,
            left: `${fig.left}%`,
            width: `${fig.size}px`,
            height: `${fig.size}px`,
            opacity: fig.opacity,
            filter: fig.blur > 0 ? `blur(${fig.blur}px)` : 'none',
            color: '#111111',
            '--float-delay': `${fig.delay}s`,
            '--float-duration': `${fig.duration}s`,
            '--float-offset-y': `${fig.floatY}px`,
            '--float-offset-x': `${fig.floatX}px`,
          } as React.CSSProperties}
        >
          <PersonSilhouette />
        </div>
      ))}

      {/* ── Header – only on loading/result screens ──────────────────── */}
      {loadingStep !== 'idle' && (
        <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-end items-center z-10 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            {userData && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white hover:bg-[#f5f5f5] text-[#111111] font-medium px-4 py-2 border border-slate-200 rounded-xl text-sm transition-all duration-200 cursor-pointer"
              >
                Share
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── State machine ────────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col justify-center items-center w-full z-10">

        {/* ═══════════════════════════════════════════════════════════
            HERO / IDLE
        ═══════════════════════════════════════════════════════════ */}
        {loadingStep === 'idle' && (
          <div className="w-full max-w-4xl px-6 py-8 flex flex-col items-center text-center animate-fade-in-up">

            {/* Headline */}
            <h1
              className="font-extrabold text-[#111111] tracking-tighter leading-[0.93] uppercase select-none mb-8"
              style={{ fontSize: 'clamp(2.2rem, 5.8vw, 6rem)', fontFamily: '"Inter Tight", "Inter", sans-serif' }}
            >
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>YOUR AUDIENCE</span>
              <span
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(135deg, #5B5CF6 0%, #818CF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                IS BIGGER
              </span>
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>THAN YOU THINK.</span>
            </h1>

            {/* Rotating subheadline */}
            <p
              className={`text-base sm:text-lg text-[#6B7280] font-medium tracking-tight h-8 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'} mb-16`}
            >
              {subheadlinePhrases[subheadlineIndex]}
            </p>

            {/* ─── Input + Orbit wrapper ──────────────────────────── */}
            <div className="relative w-full max-w-3xl flex items-center justify-center mb-16">

              {/* Orbiting silhouettes – fixed-size container, never shifts layout */}
              <div
                className="pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '0px',
                  height: '0px',
                  zIndex: -1,
                }}
              >
                {orbitAvatarsList.map((av) => (
                  <div
                    key={av.id}
                    className={`absolute ${av.direction === 'cw' ? 'animate-orbit' : 'animate-counter-orbit'}`}
                    style={{
                      width: '0px',
                      height: '0px',
                      willChange: 'transform',
                      '--orbit-duration': `${isActive ? av.duration / 1.5 : av.duration}s`,
                    } as React.CSSProperties}
                  >
                    {/* Radial translate – GPU composited, no layout shift */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '0px',
                        height: '0px',
                        transform: `rotate(${av.angle}deg) translateX(${isActive ? av.radius - 35 : av.radius}px) rotate(-${av.angle}deg)`,
                        willChange: 'transform',
                        transition: 'transform 0.9s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {/* Bob */}
                      <div
                        className="absolute animate-float-bob flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                        style={{
                          '--float-delay': `${av.delay}s`,
                          '--float-duration': `${av.duration / 9}s`,
                          '--float-offset-y': `${av.id % 2 === 0 ? -4 : -7}px`,
                          '--float-offset-x': '0px',
                        } as React.CSSProperties}
                      >
                        {/* Counter-rotate to stay upright */}
                        <div
                          className={av.direction === 'cw' ? 'animate-counter-orbit' : 'animate-orbit'}
                          style={{ '--orbit-duration': `${isActive ? av.duration / 1.5 : av.duration}s` } as React.CSSProperties}
                        >
                          {/* Avatar badge – monochrome silhouette */}
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transform: `scale(${av.scale})`,
                              opacity: av.opacity,
                              color: '#111111',
                              background: 'transparent',
                            }}
                          >
                            <PersonSilhouette />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── Input form ─────────────────────────────────── */}
              <div className="w-full max-w-[640px] z-10 px-4">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                  {/* Fully invisible borderless input */}
                  <div
                    className="relative w-full flex items-center justify-center"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      padding: '0 20px',
                      height: '64px',
                    }}
                  >
                    {/* Faint @ prefix */}
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: 500,
                        color: 'rgba(0,0,0,0.20)',
                        userSelect: 'none',
                        marginRight: '4px',
                        letterSpacing: '-0.01em',
                        flexShrink: 0,
                      }}
                    >
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="Enter X username"
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '18px',
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                        color: '#111111',
                        fontFamily: '"Inter Tight", "Inter", sans-serif',
                      }}
                    />
                  </div>

                  {/* CTA button – black, square */}
                  <button
                    type="submit"
                    disabled={isLoading || !username.trim()}
                    style={{
                      width: '100%',
                      height: '56px',
                      background: '#000000',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0px',
                      fontSize: '15px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      cursor: 'pointer',
                      opacity: 1,
                      boxShadow: 'none',
                      transition: 'opacity 0.2s ease',
                      fontFamily: '"Inter Tight", "Inter", sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && username.trim()) {
                        (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && username.trim()) {
                        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                      }
                    }}
                  >
                    Visualize My Crowd →
                  </button>
                </form>

                {/* Social proof – monochrome */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 select-none">
                  <div className="flex -space-x-2.5">
                    {['#111111', '#374151', '#6B7280', '#9CA3AF'].map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          border: '2px solid #FAFAFA',
                          background: color,
                          color: '#fff',
                        }}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: '11px', height: '11px', fill: 'currentColor' }}>
                           <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-[#9CA3AF] font-medium tracking-tight">
                    Used by creators, founders and traders.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 mt-6 text-left">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            LOADING
        ═══════════════════════════════════════════════════════════ */}
        {loadingStep === 'loading' && (
          <div className="w-full max-w-lg px-6 py-20 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
            <div className="relative w-36 h-36 flex items-center justify-center mb-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" />
                <circle
                  cx="72" cy="72" r="64"
                  stroke="#111111"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 64}
                  strokeDashoffset={2 * Math.PI * 64 * (1 - Math.round(loadingProgress) / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-150 ease-out"
                />
              </svg>
              <span
                className="absolute font-black text-[#111111] tracking-tighter"
                style={{ fontSize: '2.2rem', fontFamily: '"Inter Tight","Inter",sans-serif' }}
              >
                {Math.round(loadingProgress)}%
              </span>
            </div>
            <p className="text-lg text-[#6B7280] font-medium tracking-tight h-8">
              {loadingMessages[messageIndex]}
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            RESULT
        ═══════════════════════════════════════════════════════════ */}
        {(loadingStep === 'loading' || loadingStep === 'completed') && (
          <div 
            className="w-full px-6 py-12 flex flex-col items-center text-center transition-all duration-500 ease-out"
            style={
              loadingStep === 'loading'
                ? { position: 'absolute', opacity: 0, pointerEvents: 'none', top: '-9999px', left: '-9999px', visibility: 'hidden' }
                : { position: 'relative', opacity: 1, pointerEvents: 'auto', visibility: 'visible' }
            }
          >

            <div className="mb-12">
              <h2
                className="text-[#111111] tracking-tight mb-4 font-black"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontFamily: '"Inter Tight","Inter",sans-serif' }}
              >
                {loadingStep === 'completed' ? <CountUp end={followersCountVal} /> : 0} Followers
              </h2>
              <p className="text-xl text-[#6B7280] max-w-xl mx-auto font-medium tracking-tight">
                {getResultStatement(followersCountVal)}
              </p>
            </div>

            <div className="w-full max-w-[1344px] aspect-[16/10] md:aspect-[16/9] mx-auto rounded-[2.5rem] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden relative mb-20">
              <CrowdVisualization avatarUrl={userData?.avatarUrl} crowdCount={crowdCount} className="w-full h-full" />
            </div>

            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-10">Scale Comparison</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 w-full max-w-4xl mx-auto px-2 mb-24">
              {[
                { label: 'Buses', count: busesCount, sub: 'holds 50 people' },
                { label: 'Classrooms', count: classroomsCount, sub: '30 students each' },
                { label: 'Conference Halls', count: hallsCount, sub: '500 seats each' },
                { label: 'Stadium Sections', count: sectionsCount, sub: '1,500 seats each' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white border border-slate-100 rounded-2xl p-6 text-center transition-all duration-200 hover:border-slate-200 hover:shadow-sm"
                >
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">{card.label}</span>
                  <span className="text-4xl font-black text-[#111111] tracking-tight">≈ {card.count}</span>
                  <span className="block text-[11px] text-slate-400 mt-1.5 font-medium">{card.sub}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-10">Share Result</h3>

            <div className="max-w-md mx-auto w-full mb-20 px-2">
              <div id="share-card" className="bg-[#FAFAFA] border border-slate-200/80 rounded-[2rem] p-12 text-center relative overflow-hidden flex flex-col items-center select-none">
                <div className="absolute inset-0 dot-grid opacity-25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/60 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center w-full">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-8">MY CROWD</span>
                  {userData?.avatarUrl ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shadow-md mb-6">
                      <img src={userData.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#ffd700] flex items-center justify-center shadow-inner mb-6">
                      <svg className="w-12 h-12 text-amber-600 fill-current" viewBox="0 0 24 24">
                        <path d="M12 .587l3.668 7.431 8.2 1.19-5.934 5.784 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.208l8.2-1.19z" />
                      </svg>
                    </div>
                  )}
                  <span className="text-lg font-medium text-[#6B7280] mb-2">@{username.replace(/^@/, '')}</span>
                  <span
                    className="font-black text-[#111111] tracking-tight mb-3"
                    style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: '"Inter Tight","Inter",sans-serif' }}
                  >
                    {followersCountVal.toLocaleString()} Followers
                  </span>
                  <p className="text-base text-[#6B7280] font-medium max-w-xs mb-10 leading-snug">
                    {getResultStatement(followersCountVal)}
                  </p>
                  <span className="text-xs font-mono font-bold text-[#5B5CF6] uppercase tracking-wider">mycrowd.app</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={handleShare}
                  className="w-full text-white font-semibold py-4 rounded-2xl text-base transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: '#111111', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full bg-white hover:bg-[#f8f8f8] text-[#111111] font-semibold py-4 rounded-2xl text-base border border-slate-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Download Image
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={handleReset}
                  className="text-[#6B7280] hover:text-[#111111] font-medium text-sm transition-colors cursor-pointer"
                >
                  Visualize another crowd
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-semibold select-none z-10">
        <div>System Operational</div>
        <div>© {new Date().getFullYear()} MyCrowd Labs</div>
      </footer>
    </div>
  );
}
