## Keep backend alive (Render free tier)

Render free tier sleeps after 15 min of inactivity. This repo includes a GitHub Action that pings every 10 min to keep it alive. For extra reliability, also set up:

1. Go to **https://uptimerobot.com** (free)
2. Add monitor → URL: `https://ostium-backend.onrender.com/api/health`
3. Interval: 5 minutes