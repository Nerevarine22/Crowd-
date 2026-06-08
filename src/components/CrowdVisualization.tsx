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
  normalizedX: number; // 0 to 1
  normalizedY: number; // 0.45 to 0.95 (within floor bounding box)
  baseScale: number;   // slight random variation for natural height differences
  characterStyle: number;
  color: string;
  scaleMultiplier: number;
}

// Preset color palette for modern, premium crowd aesthetics
const PALETTE = [
  '#FF4B91', // Vibrant Pink
  '#FF7676', // Soft Coral
  '#FFB534', // Warm Gold
  '#40F8FF', // Electric Cyan
  '#9F0D7F', // Deep Violet
  '#102C57', // Sleek Navy
  '#00FFAB', // Neon Green
  '#AD8BFF', // Soft Purple
];

/**
 * Calculates the perspective scale of a sprite based on its Y coordinate.
 * Uses linear interpolation (lerp).
 */
export function calculatePerspectiveScale(
  y: number,
  canvasHeight: number,
  minScale = 0.10,
  maxScale = 0.98
): number {
  if (canvasHeight <= 0) return minScale;
  const ratio = y / canvasHeight;
  
  const horizon = 0.40; // The actual vanishing point of the pitch lines on the screen
  const maxY = 0.82;    // The foreground limit of the pitch
  
  if (ratio <= horizon) return minScale;
  
  // Linear scale starting from horizon (vanishing point = 0 size, maxY = maxScale size)
  const t = Math.max(0, Math.min(1, (ratio - horizon) / (maxY - horizon)));
  
  return minScale + t * (maxScale - minScale);
}

export default function CrowdVisualization({
  avatarUrl,
  crowdCount,
  className = '',
}: CrowdVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const crowdContainerRef = useRef<Container | null>(null);
  const crowdMembersRef = useRef<CrowdMember[]>([]);
  const userAvatarSpriteRef = useRef<Sprite | null>(null);
  const userAvatarBorderRef = useRef<Graphics | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const personTexturesRef = useRef<Texture[]>([]);
  const backgroundSpriteRef = useRef<Sprite | null>(null);

  // Keep track of textures generated to reuse them
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
      g.rect(-headRadius - 1.5, headY - 2, 1.5, 4).fill({ color: 0xffffff });
      g.rect(headRadius, headY - 2, 1.5, 4).fill({ color: 0xffffff });
      g.circle(0, headY, headRadius + 0.5)
       .stroke({ width: 1.5, color: 0xffffff });
    } else if (style === 2) {
      // Cap / Hat
      g.rect(-headRadius - 2, headY - headRadius + 1, headRadius * 2 + 4, 2)
       .fill({ color: 0xffffff });
      g.rect(-headRadius, headY - headRadius - 1, headRadius * 2, 2)
       .fill({ color: 0xffffff });
    } else if (style === 3) {
      // Glasses / Shades
      g.rect(-headRadius + 2, headY - 1, headRadius * 2 - 4, 2).fill({ color: 0x18181b });
    }

    // Draw simple legs
    g.rect(-5, -4, 3, 4).fill({ color: hexColor });
    g.rect(2, -4, 3, 4).fill({ color: hexColor });

    const texture = app.renderer.generateTexture({ target: g });
    textureCacheRef.current.set(cacheKey, texture);
    return texture;
  };

  /**
   * Generates a VIP golden texture for the user's avatar fallback
   */
  const getVipFallbackTexture = (app: Application): Texture => {
    const cacheKey = 'vip_fallback';
    if (textureCacheRef.current.has(cacheKey)) {
      return textureCacheRef.current.get(cacheKey)!;
    }

    const g = new Graphics();
    
    // Golden body capsule
    g.roundRect(-12, -48, 24, 48, 10)
     .fill({ color: 0xffd700 });
     
    // Head
    g.circle(0, -60, 9)
     .fill({ color: 0xffd700 });

    // Crown details
    g.poly([-6, -70, 0, -65, 6, -70, 4, -62, -4, -62])
     .fill({ color: 0xffaa00 });

    const texture = app.renderer.generateTexture({ target: g });
    textureCacheRef.current.set(cacheKey, texture);
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let active = true;
    const app = new Application();
    
    const initPixi = async () => {
      const parent = containerRef.current!;
      const width = parent.clientWidth || 800;
      const height = parent.clientHeight || 450;

      // Initialize the application with auto-resizing to the parent container
      await app.init({
        resizeTo: parent,
        backgroundAlpha: 0, // Transparent background to allow CSS gradients behind
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!active) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      pixiAppRef.current = app;
      
      // Apply CSS to prevent stretching
      app.canvas.style.position = 'absolute';
      app.canvas.style.top = '0';
      app.canvas.style.left = '0';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';
      
      parent.appendChild(app.canvas);

      // 1. Load background image if it exists
      try {
        const bgTexture = await Assets.load('/background.png');
        if (bgTexture.source) {
          bgTexture.source.autoGenerateMipmaps = true;
          bgTexture.source.scaleMode = 'linear';
          bgTexture.source.style.mipmapMode = 'on';
        }
        
        // Update aspect ratio state based on the loaded image dimensions
        if (bgTexture.width && bgTexture.height) {
          setAspectRatio(bgTexture.width / bgTexture.height);
        }
        
        const bgSprite = new Sprite(bgTexture);
        
        // Fit background using "cover" logic (preserve aspect ratio, center it)
        const scale = Math.max(width / bgTexture.width, height / bgTexture.height);
        bgSprite.scale.set(scale);
        bgSprite.x = (width - bgSprite.width) / 2;
        bgSprite.y = (height - bgSprite.height) / 2;
        
        app.stage.addChildAt(bgSprite, 0);
        backgroundSpriteRef.current = bgSprite;
      } catch (e) {
        console.warn("Failed to load /background.png, using fallback graphic grid", e);
        
        // Fallback grid
        const bgGraphics = new Graphics();
        app.stage.addChildAt(bgGraphics, 0);
        
        const drawGrid = (w: number, h: number) => {
          bgGraphics.clear();
          const horizonY = h * 0.42;
          bgGraphics.rect(0, horizonY, w, h - horizonY).fill({ color: 0x09090b, alpha: 0.85 });
          const vpX = w / 2;
          const vpY = horizonY;
          for (let i = 0; i <= 18; i++) {
            const xBottom = (i / 18) * w;
            bgGraphics.moveTo(vpX, vpY).lineTo(xBottom, h).stroke({ width: 1.5, color: 0x27272a, alpha: 0.35 });
          }
          for (let i = 0; i <= 12; i++) {
            const ratio = Math.pow(i / 12, 2);
            const y = horizonY + ratio * (h - horizonY);
            bgGraphics.moveTo(0, y).lineTo(w, y).stroke({ width: 1.5, color: 0x27272a, alpha: 0.35 });
          }
          bgGraphics.moveTo(0, horizonY).lineTo(w, horizonY).stroke({ width: 2.5, color: 0x3f3f46, alpha: 0.6 });
        };
        drawGrid(width, height);
      }

      // 2. Pre-load custom people sprites
      const spriteUrls = [
        '/person1.png',
        '/person2.png',
        '/person3.png',
        '/person4.png'
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
          console.warn(`Could not load custom sprite ${url}, using silhouettes as fallback`);
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

    // Handle resizing
    const handleResize = () => {
      if (!pixiAppRef.current || !containerRef.current) return;
      const app = pixiAppRef.current;
      const width = app.screen.width;
      const height = app.screen.height;

      // Update background dimensions using "cover" logic to preserve aspect ratio
      if (backgroundSpriteRef.current) {
        const bgSprite = backgroundSpriteRef.current;
        const bgTexture = bgSprite.texture;
        if (bgTexture) {
          const scale = Math.max(width / bgTexture.width, height / bgTexture.height);
          bgSprite.scale.set(scale);
          bgSprite.x = (width - bgSprite.width) / 2;
          bgSprite.y = (height - bgSprite.height) / 2;
        }
      } else {
        // Redraw grid on fallback graphics
        const bg = app.stage.getChildAt(0);
        if (bg && bg instanceof Graphics) {
          const horizonY = height * 0.42;
          bg.clear();
          bg.rect(0, horizonY, width, height - horizonY).fill({ color: 0x09090b, alpha: 0.85 });
          const vpX = width / 2;
          const vpY = horizonY;
          for (let i = 0; i <= 18; i++) {
            const xBottom = (i / 18) * width;
            bg.moveTo(vpX, vpY).lineTo(xBottom, height).stroke({ width: 1.5, color: 0x27272a, alpha: 0.35 });
          }
          for (let i = 0; i <= 12; i++) {
            const ratio = Math.pow(i / 12, 2);
            const y = horizonY + ratio * (height - horizonY);
            bg.moveTo(0, y).lineTo(width, y).stroke({ width: 1.5, color: 0x27272a, alpha: 0.35 });
          }
          bg.moveTo(0, horizonY).lineTo(width, horizonY).stroke({ width: 2.5, color: 0x3f3f46, alpha: 0.6 });
        }
      }

      updateAllPositions();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true, texture: true });
        pixiAppRef.current = null;
      }
    };
  }, []);

  // Update positions helper
  const updateAllPositions = () => {
    if (!pixiAppRef.current) return;
    const app = pixiAppRef.current;
    const width = app.screen.width;
    const height = app.screen.height;

    // 1. Update crowd sprites
    crowdMembersRef.current.forEach((member) => {
      const posX = member.normalizedX * width;
      const posY = member.normalizedY * height;
      const scale = calculatePerspectiveScale(posY, height) * member.baseScale * member.scaleMultiplier;
      
      member.sprite.x = posX;
      member.sprite.y = posY;
      member.sprite.scale.set(scale);
      member.sprite.zIndex = Math.floor(posY); // Depth sorting
    });

    // 2. Update user avatar sprite
    const avatarSprite = userAvatarSpriteRef.current;
    const avatarBorder = userAvatarBorderRef.current;
    if (avatarSprite) {
      const avX = width / 2;
      const avY = height * 0.76; // Place in VIP foreground
      const avScale = calculatePerspectiveScale(avY, height) * 2.0; // Double scale

      avatarSprite.x = avX;
      avatarSprite.y = avY;
      avatarSprite.scale.set(avScale);
      avatarSprite.zIndex = Math.floor(avY) + 5; // Ensure it's slightly in front of peers at same Y

      if (avatarBorder) {
        avatarBorder.clear();
        
        // Define base size of avatar image (approx 50px original, scaled)
        const radius = 22; // 44px diameter
        avatarBorder.x = avX;
        avatarBorder.y = avY;
        avatarBorder.scale.set(avScale);
        avatarBorder.zIndex = avatarSprite.zIndex + 1; // Keep border on top

        // Golden glowing outer circle
        avatarBorder.circle(0, 0, radius + 2.5)
                    .stroke({ width: 2.0, color: 0xffd700 }) // gold border
                    .circle(0, 0, radius + 4.5)
                    .stroke({ width: 1.0, color: 0xffd700, alpha: 0.5 }); // outer glow
      }
    }
  };

  /**
   * Side effect: repopulate when crowdCount or isLoaded changes
   */
  useEffect(() => {
    if (!isLoaded || !pixiAppRef.current || !crowdContainerRef.current) return;
    
    const app = pixiAppRef.current;
    const container = crowdContainerRef.current;
    
    // Clear existing crowd
    crowdMembersRef.current.forEach((member) => {
      container.removeChild(member.sprite);
    });
    crowdMembersRef.current = [];

    // Bounding Box limits (normalized)
    const minY = 0.42; // Expanded higher up the field
    const maxY = 0.82; // Cut off at the bottom red line

    const newMembers: CrowdMember[] = [];

    for (let i = 0; i < crowdCount; i++) {
      // Overlap avoidance loop
      let attempts = 0;
      let nx = 0.5;
      let ny = 0.7;
      let isValid = false;

      while (!isValid && attempts < 150) {
        // 1. Generate Y coordinate first
        ny = Math.random() * (maxY - minY) + minY;

        // 2. Calculate X boundaries based on Y (pitch trapezoid)
        // At y = 0.42 (minY): x ranges from 0.34 to 0.66
        // At y = 0.82 (maxY): x ranges from 0.02 to 0.98
        const ratio = (ny - minY) / (maxY - minY);
        const xMin = 0.34 - ratio * 0.32;
        const xMax = 0.66 + ratio * 0.32;

        nx = Math.random() * (xMax - xMin) + xMin;
        attempts++;

        // 3. Goal cutout: avoid spawning inside the red goal area outline (absolute constraint)
        if (nx >= 0.31 && nx <= 0.61 && ny > 0.67) {
          continue;
        }

        // Avoid spawning right on top of the central user avatar space if avatar is active (absolute constraint)
        if (avatarUrl) {
          const distToCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.76, 2));
          if (distToCenter < 0.10) {
            continue;
          }
        }

        // Avoid spawning too close to peers (soft constraint - relaxed after 80 attempts to allow packing)
        let hasCollision = false;
        if (attempts < 80) {
          const depthFactor = (ny - minY) / (maxY - minY);
          const minDx = 0.012 + depthFactor * 0.038;
          const minDy = 0.010 + depthFactor * 0.028;

          for (const existing of newMembers) {
            const dx = Math.abs(nx - existing.normalizedX);
            const dy = Math.abs(ny - existing.normalizedY);

            if (dy < minDy && dx < minDx) {
              hasCollision = true;
              break;
            }
          }
        }

        if (!hasCollision) {
          isValid = true;
        }
      }

      // Hard fallback check: Ensure we never ever append a coordinate inside the goal cutout
      if (nx >= 0.31 && nx <= 0.61 && ny > 0.67) {
        ny = Math.random() * (0.66 - minY) + minY; // push into the upper half of the pitch
      }

      let texture: Texture;
      let isCustomSprite = false;
      let scaleMultiplier = 1.0;

      if (personTexturesRef.current.length > 0) {
        // Choose one of the custom textures
        texture = personTexturesRef.current[Math.floor(Math.random() * personTexturesRef.current.length)];
        isCustomSprite = true;
        
        // Normalize height to baseHeight (e.g. 100px) so sprites fit well regardless of raw image resolution
        const baseHeight = 100;
        if (texture.height > 0) {
          scaleMultiplier = baseHeight / texture.height;
        }
      } else {
        // Fallback to silhouette graphics
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const style = Math.floor(Math.random() * 4);
        texture = getOrCreatePersonTexture(app, color, style);
      }

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1.0); // Pivot at bottom-center (feet)
      
      container.addChild(sprite);

      newMembers.push({
        sprite,
        normalizedX: nx,
        normalizedY: ny,
        baseScale: 0.88 + Math.random() * 0.24, // natural variation
        characterStyle: isCustomSprite ? -1 : 0,
        color: isCustomSprite ? '#ffffff' : PALETTE[Math.floor(Math.random() * PALETTE.length)],
        scaleMultiplier
      });
    }

    crowdMembersRef.current = newMembers;
    updateAllPositions();
  }, [crowdCount, isLoaded]);

  /**
   * Side effect: load and display user avatar when avatarUrl changes
   */
  useEffect(() => {
    if (!isLoaded || !pixiAppRef.current || !crowdContainerRef.current) return;
    
    const app = pixiAppRef.current;
    const container = crowdContainerRef.current;

    // Clean up old avatar
    if (userAvatarSpriteRef.current) {
      container.removeChild(userAvatarSpriteRef.current);
      userAvatarSpriteRef.current.destroy({ children: true });
      userAvatarSpriteRef.current = null;
    }
    if (userAvatarBorderRef.current) {
      container.removeChild(userAvatarBorderRef.current);
      userAvatarBorderRef.current.destroy();
      userAvatarBorderRef.current = null;
    }

    const loadAvatar = async () => {
      if (!avatarUrl) {
        return;
      }

      let texture: Texture;
      let hasImage = false;

      try {
        // Attempt loading external image with CORS support
        texture = await Assets.load({
          src: avatarUrl,
          data: {
            crossOrigin: 'anonymous',
          }
        });
        hasImage = true;
      } catch (e) {
        console.warn("Could not load avatar image via Pixi Assets (CORS/network). Falling back to gold VIP avatar.", e);
        texture = getVipFallbackTexture(app);
      }

      const avatarSprite = new Sprite(texture);
      avatarSprite.anchor.set(0.5, 0.5); // anchor in middle for clean rotation/scaling and circular masking

      // If we loaded a square user avatar image, we mask it into a circle
      if (hasImage) {
        // Force width/height to make it consistent (e.g. 44px diameter)
        const targetSize = 44;
        avatarSprite.width = targetSize;
        avatarSprite.height = targetSize;

        // Circular mask
        const maskG = new Graphics();
        maskG.circle(0, 0, targetSize / 2).fill({ color: 0xffffff });
        
        avatarSprite.mask = maskG;
        avatarSprite.addChild(maskG); // mask must be added to scene/parent
      }

      container.addChild(avatarSprite);
      userAvatarSpriteRef.current = avatarSprite;

      // Add a premium golden outline
      const borderG = new Graphics();
      container.addChild(borderG);
      userAvatarBorderRef.current = borderG;

      updateAllPositions();
    };

    loadAvatar();
  }, [avatarUrl, isLoaded]);

  return (
    <div 
      ref={containerRef} 
      style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto' }}
      className={`relative w-full min-h-[200px] bg-gradient-to-b from-[#09090b] via-[#101014] to-[#040406] rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl flex flex-col justify-end ${className}`}
    >
      {/* Decorative premium header inside canvas area */}
      <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none select-none">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#ffd700] font-bold">Crowd Perspective Sim</span>
          <h3 className="text-sm font-semibold text-zinc-400 mt-1">Live Audience Visualization ({crowdCount} members)</h3>
        </div>
        <div className="bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase">
          Render: WebGL 2D
        </div>
      </div>
    </div>
  );
}
