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
  minScale = 0.25,
  maxScale = 1.1
): number {
  if (canvasHeight <= 0) return minScale;
  const ratio = y / canvasHeight;
  return minScale + ratio * (maxScale - minScale);
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

      // Initialize the application
      await app.init({
        width,
        height,
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
      parent.appendChild(app.canvas);

      // 1. Load background image if it exists
      try {
        const bgTexture = await Assets.load('/background.png');
        const bgSprite = new Sprite(bgTexture);
        bgSprite.width = width;
        bgSprite.height = height;
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
      const parent = containerRef.current;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      
      app.renderer.resize(width, height);

      // Resize background
      if (backgroundSpriteRef.current) {
        backgroundSpriteRef.current.width = width;
        backgroundSpriteRef.current.height = height;
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
    const minX = 0.04;
    const maxX = 0.96;
    const minY = 0.50; // Adjusted for better placement on background image
    const maxY = 0.92;

    const newMembers: CrowdMember[] = [];

    for (let i = 0; i < crowdCount; i++) {
      // Overlap avoidance loop
      let attempts = 0;
      let nx = 0.5;
      let ny = 0.7;
      let isValid = false;

      while (!isValid && attempts < 80) {
        nx = Math.random() * (maxX - minX) + minX;
        ny = Math.random() * (maxY - minY) + minY;
        attempts++;

        isValid = true;
        // Avoid spawning right on top of the central user avatar space (x: ~0.45-0.55, y: ~0.7-0.82)
        const distToCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.76, 2));
        if (distToCenter < 0.12) {
          isValid = false;
          continue;
        }

        // Avoid spawning too close horizontally to peers at same depth
        for (const existing of newMembers) {
          const dx = Math.abs(nx - existing.normalizedX);
          const dy = Math.abs(ny - existing.normalizedY);

          if (dy < 0.038 && dx < 0.05) {
            isValid = false;
            break;
          }
        }
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
      let texture: Texture;
      let hasImage = false;

      if (avatarUrl) {
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
      } else {
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
      className={`relative w-full h-full min-h-[350px] bg-gradient-to-b from-[#09090b] via-[#101014] to-[#040406] rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl flex flex-col justify-end ${className}`}
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
