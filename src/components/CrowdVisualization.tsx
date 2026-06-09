/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';

interface CrowdVisualizationProps {
  avatarUrl?: string;
  crowdCount: number;
  className?: string;
}

interface CrowdMember {
  sprite: Sprite;
  gridX: number;
  gridY: number;
  color: string;
}

// Preset color palette for light theme grid aesthetics
const PALETTE = [
  '#0F172A', // Slate 900 (Deep Navy)
  '#2563EB', // Blue 600
  '#DB2777', // Pink 600
  '#D97706', // Amber 600
  '#059669', // Emerald 600
  '#7C3AED', // Violet 600
  '#EA580C', // Orange 600
  '#0D9488', // Teal 600
];

// Helper function to draw a mathematically perfect centered star polygon
const drawStar = (
  g: Graphics,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: number
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  const points: number[] = [];
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    points.push(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    points.push(x, y);
    rot += step;
  }
  g.poly(points).fill({ color });
};

export default function CrowdVisualization({
  avatarUrl,
  crowdCount,
  className = '',
}: CrowdVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const crowdContainerRef = useRef<Container | null>(null);
  const crowdMembersRef = useRef<CrowdMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (avatarUrl) {
      setImageSrc(avatarUrl);
      setHasError(false);
    } else {
      setImageSrc(null);
      setHasError(true);
    }
  }, [avatarUrl]);

  const handleImageError = () => {
    if (imageSrc && imageSrc.includes('_400x400')) {
      console.log('[React Avatar] Loading _400x400 failed. Retrying with _normal size...');
      setImageSrc(imageSrc.replace('_400x400', '_normal'));
    } else {
      console.log('[React Avatar] All image load attempts failed. Falling back to VIP badge.');
      setHasError(true);
    }
  };

  const personTexturesRef = useRef<Texture[]>([]);
  const textureCacheRef = useRef<Map<string, Texture>>(new Map());

  /**
   * Generates a stylized person silhouette texture using Pixi Graphics
   */
  const getOrCreatePersonTexture = (app: Application, color: string, style: number): Texture => {
    const cacheKey = `${color}_${style}`;
    if (textureCacheRef.current.has(cacheKey)) {
      return textureCacheRef.current.get(cacheKey)!;
    }

    const g = new Graphics();
    const hexColor = parseInt(color.replace('#', '0x'));
    
    // Draw body capsule
    const bodyHeight = 40;
    const bodyWidth = 18;
    g.roundRect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight, 8)
     .fill({ color: hexColor });

    // Draw head
    const headRadius = 7;
    const headY = -bodyHeight - headRadius - 2;
    g.circle(0, headY, headRadius)
     .fill({ color: hexColor });

    // Stylized details based on character style
    if (style === 0) {
      // Bun / Hair knot
      g.circle(0, headY - headRadius, 3)
       .fill({ color: hexColor });
    } else if (style === 1) {
      // Headphones
      g.rect(-headRadius - 1.5, headY - 2, 1.5, 4).fill({ color: 0x64748b });
      g.rect(headRadius, headY - 2, 1.5, 4).fill({ color: 0x64748b });
      g.circle(0, headY, headRadius + 0.5)
       .stroke({ width: 1.5, color: 0x64748b });
    } else if (style === 2) {
      // Cap / Hat
      g.rect(-headRadius - 2, headY - headRadius + 1, headRadius * 2 + 4, 2)
       .fill({ color: 0x475569 });
      g.rect(-headRadius, headY - headRadius - 1, headRadius * 2, 2)
       .fill({ color: 0x475569 });
    } else if (style === 3) {
      // Glasses / Shades
      g.rect(-headRadius + 2, headY - 1, headRadius * 2 - 4, 2).fill({ color: 0x0f172a });
    }

    // Draw simple legs
    g.rect(-5, -4, 3, 4).fill({ color: hexColor });
    g.rect(2, -4, 3, 4).fill({ color: hexColor });

    const texture = app.renderer.generateTexture({ target: g });
    textureCacheRef.current.set(cacheKey, texture);
    return texture;
  };

  /**
   * Generates a simple circular dot texture for high performance rendering at high crowd counts (>30k)
   */
  const getOrCreateDotTexture = (app: Application, color: string): Texture => {
    const cacheKey = `dot_${color}`;
    if (textureCacheRef.current.has(cacheKey)) {
      return textureCacheRef.current.get(cacheKey)!;
    }

    const g = new Graphics();
    const hexColor = parseInt(color.replace('#', '0x'));
    
    g.circle(0, 0, 10)
     .fill({ color: hexColor });

    const texture = app.renderer.generateTexture({ target: g });
    textureCacheRef.current.set(cacheKey, texture);
    return texture;
  };

  // getVipFallbackTexture has been simplified and moved to direct graphics drawing in updateAvatarPosition

  // 1. Initialize PixiJS Application
  useEffect(() => {
    if (!containerRef.current) return;

    let active = true;
    const app = new Application();
    
    const initPixi = async () => {
      const parent = containerRef.current!;

      await app.init({
        resizeTo: parent,
        backgroundColor: 0xffffff,
        backgroundAlpha: 1,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!active) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      pixiAppRef.current = app;
      
      app.canvas.style.position = 'absolute';
      app.canvas.style.top = '0';
      app.canvas.style.left = '0';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';
      app.canvas.style.zIndex = '10';
      
      parent.appendChild(app.canvas);

      // Pre-load custom people sprites
      const spriteUrls = [
        '/person1.png',
        '/person2.png',
        '/person3.png',
        '/person4.png',
        '/person5.png',
        '/person6.png',
        '/person7.png',
        '/person8.png',
        '/person9.png'
      ];
      const loadedTextures: Texture[] = [];
      for (const url of spriteUrls) {
        try {
          const tex = await Assets.load(url);
          if (tex.source) {
            tex.source.autoGenerateMipmaps = true;
            tex.source.scaleMode = 'linear';
            tex.source.style.mipmapMode = 'on';
          }
          loadedTextures.push(tex);
        } catch (e) {
          // Fallback to silhouettes
        }
      }
      personTexturesRef.current = loadedTextures;

      // Create crowd container with depth-sorting enabled
      const crowdContainer = new Container();
      crowdContainer.sortableChildren = true;
      app.stage.addChild(crowdContainer);
      crowdContainerRef.current = crowdContainer;

      setIsLoaded(true);
    };

    initPixi();

    return () => {
      active = false;
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true, texture: true });
        pixiAppRef.current = null;
      }
    };
  }, []);

  // 2. Position Helper for Avatar - Obsolete as avatar is rendered as an HTML overlay

  // 3. Grid Rebuilding Logic
  const rebuildGrid = () => {
    if (!pixiAppRef.current || !crowdContainerRef.current || !isLoaded) return;

    const app = pixiAppRef.current;
    const container = crowdContainerRef.current;
    const { width, height } = app.screen;

    // Clear existing crowd sprites
    crowdMembersRef.current.forEach((member) => {
      container.removeChild(member.sprite);
    });
    crowdMembersRef.current = [];

    const centerX = width / 2;
    const centerY = height / 2;

    // Active area with padding
    const padding = 40;
    const activeWidth = width - padding * 2;
    const activeHeight = height - padding * 2;

    const N = Math.max(1, crowdCount);

    // Calculate grid cell dimensions dynamically
    let cellWidth = Math.sqrt((activeWidth * activeHeight) / (N * 1.4));
    cellWidth = Math.max(3.5, Math.min(70, cellWidth));
    const cellHeight = cellWidth * 1.25;

    const cols = Math.max(3, Math.floor(activeWidth / cellWidth));
    const rows = Math.max(3, Math.floor(activeHeight / cellHeight));

    const startX = (width - (cols - 1) * cellWidth) / 2;
    const startY = (height - (rows - 1) * cellHeight) / 2;

    // Generate grid points
    const cells: { x: number; y: number; dist: number }[] = [];
    const isDot = false; // Always render stylized person silhouettes/photos instead of color dots
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * cellWidth;
        const y = startY + r * cellHeight;
        
        // Symmetrical centering: calculate from the cell's center, not its feet coordinate
        const cellCenterY = isDot ? y : (y - cellHeight / 2);
        const dx = x - centerX;
        const dy = cellCenterY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cells.push({ x, y, dist });
      }
    }

    // Sort cells by proximity to the center
    cells.sort((a, b) => a.dist - b.dist);

    // Skip cells within center cutout area (avatarRadius)
    const avatarRadius = 65; 
    const validCells = cells.filter((cell) => cell.dist >= avatarRadius);

    const actualCount = Math.min(crowdCount, validCells.length);

    const newMembers: CrowdMember[] = [];

    for (let i = 0; i < actualCount; i++) {
      const cell = validCells[i];
      let texture: Texture;
      let isCustomSprite = false;
      let scaleMultiplier = 1.0;

      if (isDot) {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        texture = getOrCreateDotTexture(app, color);
      } else if (personTexturesRef.current.length > 0) {
        texture = personTexturesRef.current[Math.floor(Math.random() * personTexturesRef.current.length)];
        isCustomSprite = true;
        const baseHeight = 100;
        if (texture.height > 0) {
          scaleMultiplier = baseHeight / texture.height;
        }
      } else {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const style = Math.floor(Math.random() * 4);
        texture = getOrCreatePersonTexture(app, color, style);
      }

      const sprite = new Sprite(texture);

      // Scale to fit grid cell nicely
      if (isDot) {
        sprite.anchor.set(0.5, 0.5); // Center dot in cell
        sprite.width = cellWidth * 0.75;
        sprite.height = cellWidth * 0.75; // Square dot
      } else {
        sprite.anchor.set(0.5, 1.0); // Pivot at feet
        if (isCustomSprite) {
          sprite.width = cellWidth * 0.75;
          sprite.height = cellHeight * 0.85;
        } else {
          sprite.width = cellWidth * 0.65;
          sprite.height = cellHeight * 0.80;
        }
      }

      sprite.x = cell.x;
      sprite.y = cell.y;
      sprite.zIndex = Math.floor(cell.y);

      container.addChild(sprite);

      newMembers.push({
        sprite,
        gridX: cell.x,
        gridY: cell.y,
        color: isDot ? '#ffffff' : (isCustomSprite ? '#ffffff' : PALETTE[Math.floor(Math.random() * PALETTE.length)]),
      });
    }

    crowdMembersRef.current = newMembers;
  };

  // 4. Sync grid on crowdCount changes or window resize
  useEffect(() => {
    if (!isLoaded) return;
    
    rebuildGrid();

    const handleResize = () => {
      rebuildGrid();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [crowdCount, isLoaded]);

  // 5. Load and Apply User Avatar - Obsolete as avatar is rendered as an HTML overlay

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full min-h-[400px] h-full bg-white rounded-[2rem] border border-zinc-200 overflow-hidden shadow-xl flex flex-col justify-end ${className}`}
    >
      {/* Center Avatar HTML Overlay */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
        <div className="relative w-[92px] h-[92px] rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-lg">
          {!hasError && imageSrc ? (
            <div className="w-[80px] h-[80px] rounded-full border-[3px] border-slate-800 overflow-hidden bg-slate-100 flex items-center justify-center">
              <img 
                src={imageSrc} 
                alt="X profile avatar" 
                className="w-full h-full object-cover select-none"
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="w-[80px] h-[80px] rounded-full border-[3px] border-amber-600 bg-[#ffd700] flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 text-amber-600 fill-current" viewBox="0 0 24 24">
                <path d="M12 .587l3.668 7.431 8.2 1.19-5.934 5.784 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.208l8.2-1.19z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Informational Overlay */}
      <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto select-none bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-zinc-200 shadow-md flex flex-col gap-1 max-w-[280px]">
          <span className="text-[9px] uppercase tracking-[0.25em] text-indigo-600 font-bold">Світловий графік аудиторії</span>
          <h3 className="text-xs font-semibold text-zinc-800 mt-0.5">Сітка підписників ({crowdCount} осіб)</h3>
        </div>

        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200 text-[10px] font-mono text-zinc-500 uppercase select-none">
          Render: PixiJS Grid
        </div>
      </div>
    </div>
  );
}
