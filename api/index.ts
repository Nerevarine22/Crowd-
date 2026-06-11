import express from 'express';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
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

    if (!process.env.APIFY_API_TOKEN) {
      return res.status(500).json({ 
        error: 'На бекенді Vercel не налаштовано Apify токен. Будь ласка, додайте змінну оточення APIFY_API_TOKEN у налаштуваннях вашого проекту на Vercel (Settings -> Environment Variables) та запустіть передеплой.' 
      });
    }

    // Prepare the actor input with usernames parameter
    const actorInput = {
      usernames: [username],
    };

    let followersCount: number | null = null;
    let avatarUrl = '';
    let success = false;

    // 1. Try Apify scraper
    try {
      const run = await client.actor("dead00/twitter-profile-scraper-no-cookies").call(actorInput);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (items && items.length > 0) {
        const userProfile = items[0] as any;
        if (userProfile.success) {
          followersCount = userProfile.followers_count || 0;
          avatarUrl = userProfile.profile_image_url || '';
          success = true;
        }
      }
    } catch (scraperError) {
      console.warn('Apify scraper failed, trying fallback...', scraperError);
    }

    // 2. Fallback to Twitter Syndication Widget
    if (!success) {
      try {
        const fallbackUrl = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(username)}`;
        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          const user = Array.isArray(data) ? data[0] : null;
          if (user && typeof user.followers_count === 'number') {
            followersCount = user.followers_count;
            avatarUrl = `https://unavatar.io/x/${encodeURIComponent(username)}`;
            success = true;
            console.log('Successfully fetched profile using syndication fallback for', username);
          }
        }
      } catch (fallbackError) {
        console.error('Syndication fallback failed:', fallbackError);
      }
    }

    if (!success || followersCount === null) {
      return res.status(404).json({ error: 'Failed to scrape user data. Please check the username or try again later.' });
    }

    res.json({
      followersCount,
      avatarUrl
    });
  } catch (error: any) {
    console.error('Error fetching twitter info:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch information' });
  }
});

export default app;
