import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize the ApifyClient with the user's provided API token
  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || '',
  });

  // Proxy Route to bypass CORS on Twitter avatars with .jpg extension for PixiJS auto-detection
  app.get('/api/avatar-proxy/avatar.jpg', async (req, res) => {
    const { url } = req.query;
    console.log('[Proxy] Request received for URL:', url);
    try {
      if (!url) {
        console.warn('[Proxy] URL is missing');
        return res.status(400).send('URL is required');
      }

      const response = await fetch(url as string);
      console.log('[Proxy] Fetch response status:', response.status);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      console.log('[Proxy] Content type:', contentType);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
      console.log('[Proxy] Image sent successfully, bytes:', arrayBuffer.byteLength);
    } catch (error: any) {
      console.error('[Proxy] Avatar proxy error:', error);
      res.status(500).send(error.message || 'Failed to proxy image');
    }
  });

  // API Route to fetch Twitter profile info
  app.post('/api/twitter-info', async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Prepare the actor input with usernames parameter
      const actorInput = {
        usernames: [username],
      };

      // Run the Apify twitter profile scraper
      const run = await client.actor("dead00/twitter-profile-scraper-no-cookies").call(actorInput);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return res.status(404).json({ error: 'User not found or no data returned.' });
      }

      const userProfile = items[0] as any;
      
      if (!userProfile.success) {
        return res.status(404).json({ error: 'Failed to scrape user data.' });
      }
      
      // Select only followers count and profile photo
      const followersCount = userProfile.followers_count || 0;
      const avatarUrl = userProfile.profile_image_url || '';

      res.json({
        followersCount,
        avatarUrl
      });
    } catch (error: any) {
      console.error('Error fetching twitter info:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch information' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
