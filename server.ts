import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ApifyClient } from 'apify-client';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize the ApifyClient with the user's provided API token
  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || '',
  });

  // API Route to fetch Twitter profile info
  app.post('/api/twitter-info', async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Prepare the actor input
      const input = {
        "twitterHandles": [username],
        "maxItems": 1
      };

      // Ensure we use the correct Apify actor. 
      // "quacker/twitter-api-scraper" or "user~twitter-profile-scraper" depending on what works.
      // We will try microrworlds/twitter-scraper or quacker/twitter-api-scraper or apidojo/twitter-user-scraper.
      // Usually "quacker/twitter-api-scraper" is the most robust and requires searchMode: "user".
      // Let's use `apidojo/twitter-user-scraper` as it's specifically for users and very popular.
      // Actually, quacker/twitter-api-scraper is best. Let's try it with just handles.
      
      const actorInput = {
        usernames: [username],
      };

      const run = await client.actor("dead00/twitter-profile-scraper-no-cookies").call(actorInput);
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return res.status(404).json({ error: 'User not found or no data returned.' });
      }

      const userProfile = items[0] as any;
      
      // If error or uncharged
      if (!userProfile.success) {
        return res.status(404).json({ error: 'Failed to scrape user data.' });
      }
      
      const followersCount = userProfile.followers_count || 0;
      const avatarUrl = userProfile.profile_image_url || '';

      res.json({
        followersCount,
        avatarUrl,
        raw: items[0] // for debugging if needed, we won't show to user
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
