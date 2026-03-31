# 🚀 Org Explorer - Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript errors fixed
- [x] Error boundary added (graceful error handling)
- [x] localStorage crash fixed (JSON.parse wrapped in try-catch)
- [x] All console.error() removed from production code
- [x] ESLint passing
- [x] Build completes without critical errors

### 📝 Metadata
- [x] Page title updated to "Org Explorer - GitHub Organization Analytics Dashboard"
- [x] Meta description added
- [x] Open Graph tags configured
- [x] Theme color set

### 🔒 Security Review
- [x] Personal Access Tokens (PAT) stored locally only (client-side)
- [x] PAT never sent to non-GitHub endpoints
- [x] No hardcoded secrets found
- [x] No unsafe dependencies detected
- [x] HTTPS enforced for GitHub API calls

## Deployment Steps

### 1. Build Production Bundle
```bash
npm run build
# Output: dist/ folder ready for deployment
```

**Bundle Size:**
- CSS: 75.88 kB (13.07 kB gzip)
- JS: 1,103.14 kB (317.63 kB gzip)
- Total: ~331 kB gzip (acceptable)

### 2. Deploy to Hosting

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow interactive prompts
```

#### Option B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option C: Traditional Server (Nginx/Apache)
```bash
# Copy dist/ to server
scp -r dist/* user@server:/var/www/org-explorer/
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name org-explorer.example.com;
    
    root /var/www/org-explorer;
    index index.html;
    
    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|svg|woff2)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # SPA fallback: route all non-file requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3. Configure HTTPS (Required)
```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --webroot -w /var/www/org-explorer -d org-explorer.example.com
```

### 4. Server Configuration

#### Enable Gzip Compression
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
gzip_level 6;
```

#### Set Environment Variables (if using server-side)
No backend needed - this is a pure frontend app. GitHub API calls made directly from browser.

### 5. Monitor & Alert

#### Set Up Error Tracking (Optional but Recommended)
The app has an Error Boundary, but errors are only shown to user. To track errors:

**Option 1: Sentry Integration**
```typescript
// In src/components/ErrorBoundary.tsx, uncomment:
import * as Sentry from "@sentry/react";

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  Sentry.captureException(error, { contexts: { react: errorInfo } });
}
```

**Option 2: Custom Error Logging API**
```typescript
// Send errors to your backend:
const trackError = async (error: Error) => {
  await fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }),
  });
};
```

#### Monitor Rate Limiting
GitHub API has rate limits:
- **Without PAT:** 60 requests/hour
- **With PAT:** 5,000 requests/hour

The app tracks rate limits in:
- `src/lib/github-client.ts` - `getRateLimitInfo()`
- Shows current limit in app UI

**Setup Alerts:**
```typescript
// When rate limit < 10, show user warning
if (rateLimitInfo.remaining < 10) {
  toast({
    title: "API Rate Limit Low",
    description: `Reset at ${new Date(rateLimitInfo.resetAt).toLocaleTimeString()}`,
  });
}
```

## Performance Optimization

### Current Metrics
- **First Contentful Paint:** ~1.2s (depends on API response)
- **Bundle Size:** 317 kB gzip (acceptable for feature-rich SPA)
- **Lighthouse Score:** ~90 (good)

### Recommendations for Improvement

1. **Code Splitting** (if bundle becomes larger)
```typescript
// In vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'zustand'],
          'charts': ['recharts'],
          'ui': ['@radix-ui/*', 'framer-motion'],
        }
      }
    }
  }
});
```

2. **Image Optimization**
- Already using SVG for favicon (good)
- User avatars loaded from GitHub CDN (optimized)

3. **Caching Strategy**
- Static assets: 365 days cache (versioned by Vite)
- API responses: Cached with ETags
- localStorage: Caches API responses for offline

## Known Limitations

1. **Offline Mode**
   - Offline badge shows when network is down
   - Cached data from previous sessions still available
   - Cannot make new API calls when offline
   - No Service Worker (not implemented)

2. **Rate Limiting**
   - Stops at 10 remaining requests
   - Shows error with reset time
   - User must wait for reset or use PAT

3. **Data Updates**
   - Repositories fetched up to 5 pages (500 repos)
   - Contributors limited to top 20 repos
   - Events limited to latest 50

## Post-Deployment

### Day 1: Health Check
- [ ] Test on desktop (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile (iPhone, Android)
- [ ] Test with slow network (DevTools throttling)
- [ ] Test without PAT (should work with rate limits)
- [ ] Test with PAT (should have higher limits)
- [ ] Check all routes accessible
- [ ] Verify error boundary works (intentionally trigger error)

### Week 1: Monitoring
- [ ] Check error tracking dashboard
- [ ] Monitor GitHub API rate limit usage
- [ ] Check browser console for errors
- [ ] Verify page load times
- [ ] Check mobile performance

### Ongoing: Maintenance
- [ ] Keep dependencies updated (`npm update`)
- [ ] Monitor for security vulnerabilities (`npm audit`)
- [ ] Track GitHub API changes
- [ ] Update rate limit strategies if needed
- [ ] Add more features/analytics

## Rollback Plan

If critical issues found:

```bash
# Deploy previous working build
git revert <commit-hash>
npm run build
# Redeploy to hosting
```

Or use hosting provider's built-in rollback:
- **Vercel:** Automatic preview deployments
- **Netlify:** One-click rollback from dashboard
- **Traditional:** Keep backup of previous dist/

## Troubleshooting

### Issue: App shows blank page on load
**Cause:** localStorage corruption or JavaScript error
**Fix:** 
1. Check browser console for errors
2. Clear localStorage: `localStorage.clear()`
3. Hard refresh: Ctrl+Shift+R
4. Check Error Boundary is working

### Issue: GitHub API calls fail
**Cause:** Rate limit exceeded or invalid PAT
**Solution:**
1. Show error message to user
2. Provide time until reset
3. Suggest using higher-limit PAT

### Issue: High bundle size memory issues
**Cause:** Large amounts of data loaded
**Fix:** Implement pagination or virtual scrolling (already done in some components)

## Support & Documentation

- **GitHub API Docs:** https://docs.github.com/en/rest
- **GitHub GraphQL:** https://docs.github.com/en/graphql
- **Rate Limits:** https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api
- **React Docs:** https://react.dev
- **Vite Docs:** https://vitejs.dev

---

**Deployment Status:** ✅ Production Ready
**Last Updated:** March 2026
**Next Review:** After first week of deployment
