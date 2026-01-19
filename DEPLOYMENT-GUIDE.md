# Deployment Guide - Reflets de Bonheur

**Date**: January 17, 2026
**Version**: 1.0.0 (Phase 1 Extended + Bundle B + PWA)
**Status**: Ready for Production

---

## 🎯 Overview

This guide will help you deploy **Reflets de Bonheur** to production. The app is a fully-featured wedding photo gallery with:

- ✅ 16 complete features
- ✅ PWA support (installable, offline-capable)
- ✅ Mobile optimized (A++ grade)
- ✅ Admin analytics & album management
- ✅ Dark mode support

---

## 📋 Pre-Deployment Checklist

### **Required Steps**

- [ ] **Generate PWA icons** (5 minutes - CRITICAL)
- [ ] Test locally in development mode
- [ ] Build for production
- [ ] Choose hosting platform
- [ ] Deploy files
- [ ] Configure HTTPS (required for PWA)
- [ ] Test PWA installation
- [ ] Verify all features work

### **Optional Steps**

- [ ] Set up custom domain
- [ ] Configure analytics (Google Analytics, etc.)
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Create backup plan

---

## 🎨 Step 1: Generate PWA Icons (REQUIRED)

**⚠️ CRITICAL**: You must generate app icons before deploying, or PWA won't work properly.

### Method: Use the Browser Tool

1. **Open the icon generator:**
   ```bash
   # In your browser, navigate to:
   file:///Users/kevin/Development/WeddingPictures/reflets-de-bonheur/public/icons/generate-icons.html

   # Or open it directly from VS Code:
   # Right-click → Open with Live Server
   ```

2. **Wait for auto-generation** (0.5 seconds after page load)

3. **Save each icon:**
   - Right-click each generated icon
   - Select "Save Image As..."
   - Save to: `/public/icons/` directory
   - Use exact filename shown (e.g., `icon-192x192.png`)

4. **Icons to save (10 total):**
   ```
   Required icons:
   ✅ icon-72x72.png
   ✅ icon-96x96.png
   ✅ icon-128x128.png
   ✅ icon-144x144.png
   ✅ icon-152x152.png
   ✅ icon-192x192.png
   ✅ icon-384x384.png
   ✅ icon-512x512.png

   Maskable icons (for Android):
   ✅ icon-maskable-192x192.png
   ✅ icon-maskable-512x512.png
   ```

5. **Verify icons exist:**
   ```bash
   ls -lh public/icons/*.png
   # Should show 10 PNG files
   ```

**Estimated time:** 5 minutes

---

## 🧪 Step 2: Test Locally

### **Run Development Server**

```bash
npm run dev
```

### **Test Checklist**

#### **Core Features:**
- [ ] Gallery loads with photos
- [ ] Lightbox opens when clicking photos
- [ ] Search and filters work
- [ ] Upload modal opens
- [ ] Slideshow mode works
- [ ] Dark mode toggle works
- [ ] Favorites save correctly
- [ ] Reactions add/remove properly
- [ ] Bulk download creates ZIP
- [ ] Guestbook messages save

#### **Admin Features:**
- [ ] Admin panel accessible (use mock auth: click "Oui, je suis admin")
- [ ] Statistics dashboard displays correctly
  - [ ] Timeline graph shows data
  - [ ] Storage usage calculates
  - [ ] Top uploaders list appears
  - [ ] Reaction breakdown displays
- [ ] Albums section works
  - [ ] Can create new album
  - [ ] Can edit album
  - [ ] Can delete album
  - [ ] Gallery filtering by album works
- [ ] QR code generates
- [ ] Settings toggle works
- [ ] Backup download works

#### **PWA Features:**
- [ ] Service worker registers (check DevTools → Application → Service Workers)
- [ ] Manifest loads (check DevTools → Application → Manifest)
- [ ] Install prompt appears after 3 seconds (Desktop Chrome)
- [ ] `/offline` page accessible

#### **Mobile Testing:**
- [ ] Test on real mobile device (or Chrome DevTools mobile emulation)
- [ ] Touch gestures work (swipe, tap)
- [ ] Gallery grid responsive
- [ ] Upload works from mobile
- [ ] Dark mode works
- [ ] Install prompt shows (mobile Chrome/Edge)

---

## 🏗️ Step 3: Build for Production

### **Create Production Build**

```bash
npm run build
```

**Expected output:**
```
Building for production...
✓ 234 modules transformed
dist/index.html                   2.45 kB
dist/assets/index-abc123.css      89.2 kB
dist/assets/index-def456.js      156.8 kB
✓ built in 8.43s
```

### **Verify Build**

```bash
# Preview the production build locally
npm run preview
```

Navigate to `http://localhost:4321` and test again.

### **Check Build Output**

```bash
ls -lh dist/
```

Should contain:
- `index.html` and other HTML pages
- `assets/` folder with CSS and JS
- `icons/` folder with PNG icons
- `manifest.json`
- `sw.js` (service worker)

---

## 🚀 Step 4: Choose Hosting Platform

### **Recommended Platforms** (all support HTTPS by default)

#### **Option 1: Netlify** (Easiest)

**Pros:**
- Zero config deployment
- Automatic HTTPS
- Free tier generous
- GitHub integration
- Instant rollback

**Pricing:** Free for personal projects

**Deploy:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

Or use drag-and-drop at [netlify.com/drop](https://app.netlify.com/drop)

---

#### **Option 2: Vercel** (Fast)

**Pros:**
- Optimized for static sites
- Automatic HTTPS
- Edge network (fastest)
- Zero config
- GitHub integration

**Pricing:** Free for personal projects

**Deploy:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or connect GitHub repo at [vercel.com/new](https://vercel.com/new)

---

#### **Option 3: Cloudflare Pages** (Best for Phase 2)

**Pros:**
- Free unlimited bandwidth
- Fast global CDN
- Automatic HTTPS
- Easy integration with Cloudflare D1/R2 (Phase 2)
- Free tier very generous

**Pricing:** Free for unlimited sites

**Deploy:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy dist
```

Or connect GitHub at [dash.cloudflare.com](https://dash.cloudflare.com)

---

#### **Option 4: GitHub Pages** (Simplest)

**Pros:**
- Free for public repos
- Automatic HTTPS with custom domain
- Simple Git-based deployment

**Cons:**
- Requires public repo
- Slightly slower than CDN options

**Deploy:**
```bash
# Add to package.json:
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# Install gh-pages
npm install --save-dev gh-pages

# Deploy
npm run deploy
```

---

## 📦 Step 5: Deploy

### **Using Netlify (Recommended)**

#### **Method A: Drag and Drop** (Fastest)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag your `dist/` folder
3. Wait for deployment (30 seconds)
4. Get your URL: `https://your-site-name.netlify.app`

#### **Method B: CLI**

```bash
# First time
netlify deploy

# Choose "Create & configure a new site"
# Follow prompts

# For production
netlify deploy --prod
```

#### **Method C: GitHub (Continuous Deployment)**

1. Push code to GitHub
2. Go to [netlify.com/start](https://app.netlify.com/start)
3. Connect your repo
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy automatically on every push

---

## 🔒 Step 6: Verify HTTPS

**⚠️ CRITICAL**: PWA requires HTTPS. All recommended platforms provide it automatically.

### **Check HTTPS**

1. Visit your deployed URL
2. Look for 🔒 icon in browser address bar
3. Open DevTools → Security tab
4. Verify "This page is secure (valid HTTPS)"

If using custom domain:
- SSL certificate should auto-provision (2-5 minutes)
- Some platforms require DNS verification

---

## 📱 Step 7: Test PWA Installation

### **Desktop (Chrome/Edge)**

1. Visit your production URL
2. Wait 3 seconds for install prompt
3. Click "Installer maintenant"
4. New window opens in standalone mode
5. Verify app works without browser UI

**Manual installation (if prompt doesn't appear):**
1. Chrome: Address bar → Install icon (⊕)
2. Edge: Settings (⋯) → Apps → Install this site as an app

### **Mobile (Android Chrome)**

1. Visit your production URL on mobile
2. Wait 3 seconds for bottom banner
3. Tap "Installer"
4. Choose "Add to Home Screen"
5. Find icon on home screen
6. Launch app
7. Verify standalone mode (no browser UI)

### **Mobile (iOS Safari)**

**Note:** iOS doesn't support automatic install prompts

1. Open site in Safari
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Find icon on home screen
6. Launch app

---

## ✅ Step 8: Post-Deployment Verification

### **Run Lighthouse Audit**

1. Open site in Chrome
2. DevTools → Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"

**Expected scores:**
- PWA: 90-100 ✅
- Performance: 85-100 ✅
- Accessibility: 85-100 ✅
- Best Practices: 90-100 ✅
- SEO: 85-100 ✅

### **Test All Features**

Go through the test checklist from Step 2 again, but on production URL.

### **Test Offline Mode**

1. Install PWA (desktop or mobile)
2. Open installed app
3. Turn off WiFi/mobile data
4. Navigate between pages
5. Should show cached content
6. Try to upload → should show "offline" message
7. Turn WiFi back on
8. Verify app resumes normal operation

---

## 🎯 Custom Domain (Optional)

### **Setup Custom Domain**

Most hosting platforms make this easy:

**Netlify:**
1. Settings → Domain management
2. Add custom domain
3. Follow DNS instructions
4. HTTPS auto-configures

**Vercel:**
1. Settings → Domains
2. Add domain
3. Update DNS records
4. SSL auto-provisions

**Cloudflare Pages:**
1. Custom domains → Add domain
2. DNS auto-updates if using Cloudflare DNS
3. HTTPS immediate

**Recommended domain registrars:**
- Cloudflare (cheapest)
- Namecheap
- Google Domains

---

## 📊 Analytics (Optional)

### **Add Google Analytics**

1. Create GA4 property at [analytics.google.com](https://analytics.google.com)

2. Add tracking code to `src/layouts/MainLayout.astro`:

```astro
---
// In <head>:
---
<head>
  <!-- ... existing tags ... -->

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script is:inline>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

3. Rebuild and redeploy

---

## 🐛 Troubleshooting

### **Icons Not Loading**

**Problem:** App icon doesn't appear in PWA install prompt

**Solutions:**
1. Verify all 10 PNG files exist in `public/icons/`
2. Check file sizes (should be 2-50KB each)
3. Clear browser cache
4. Check DevTools → Application → Manifest
5. Re-generate icons from HTML tool

---

### **Service Worker Not Registering**

**Problem:** Console shows "Service Worker registration failed"

**Solutions:**
1. Ensure HTTPS is enabled
2. Check `public/sw.js` exists
3. Verify no syntax errors in sw.js
4. Clear browser cache
5. DevTools → Application → Service Workers → Unregister → Reload

---

### **Install Prompt Not Showing**

**Problem:** No install prompt after 3 seconds

**Solutions:**
1. Check if already installed (DevTools → Application → Manifest)
2. Clear localStorage: `localStorage.clear()`
3. Verify PWA criteria met (run Lighthouse audit)
4. Check browser console for errors
5. Try in Incognito mode

---

### **Offline Mode Not Working**

**Problem:** Shows browser error when offline

**Solutions:**
1. Verify service worker is active (DevTools → Application)
2. Check cache is populated (Application → Cache Storage)
3. Visit pages while online first (to cache them)
4. Check sw.js has correct URLs in STATIC_ASSETS
5. Clear caches and reload

---

## 📈 Monitoring (Optional)

### **Recommended Tools**

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com) (Free, 5 min checks)
- [Pingdom](https://pingdom.com) (Free trial)

**Error Tracking:**
- [Sentry](https://sentry.io) (Free tier: 5K events/month)
- Setup: Add Sentry SDK to `package.json`

**Performance:**
- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [GTmetrix](https://gtmetrix.com)

---

## 🔄 Updates & Maintenance

### **Deploying Updates**

```bash
# Make changes to code
git add .
git commit -m "Update feature X"
git push

# If using CLI deployment:
npm run build
netlify deploy --prod  # or vercel --prod
```

### **Service Worker Updates**

When deploying code changes:

1. Update `CACHE_VERSION` in `public/sw.js`:
   ```javascript
   const CACHE_VERSION = 'reflets-v1.0.1';  // Increment version
   ```

2. Users will get update prompt automatically
3. Old caches deleted on activation

### **Monitoring Usage**

Check hosting platform dashboards for:
- Bandwidth usage
- Request count
- Error rates
- Popular pages
- Traffic sources

---

## 🎉 Launch Checklist

### **Final Checks Before Announcing**

- [ ] All PWA icons generated and deployed
- [ ] HTTPS enabled and working
- [ ] PWA installable (tested on multiple devices)
- [ ] Lighthouse audit scores > 90
- [ ] Offline mode works
- [ ] All features tested on production
- [ ] Custom domain configured (if using)
- [ ] Analytics tracking (if using)
- [ ] Mobile tested (iOS and Android)
- [ ] QR code generated for easy sharing
- [ ] Admin credentials documented
- [ ] Backup plan established

### **Share with Users**

1. **Create QR code** (in Admin panel)
2. **Test installation** on your own device first
3. **Share URL** via:
   - Email
   - WhatsApp
   - Wedding website
   - Physical cards with QR code
4. **Provide instructions:**
   - "Ouvrez le lien sur votre téléphone"
   - "Appuyez sur 'Installer' quand demandé"
   - "L'application fonctionnera même sans Internet!"

---

## 🆘 Support

### **Common User Questions**

**Q: Comment installer l'application ?**
A: Sur Android Chrome, attendez le pop-up et appuyez "Installer". Sur iOS Safari, appuyez Partager → Ajouter à l'écran d'accueil.

**Q: Ça fonctionne hors ligne ?**
A: Oui ! Une fois installée, vous pouvez voir les photos déjà chargées même sans Internet.

**Q: Comment uploader des photos ?**
A: Appuyez sur le bouton "Upload" en haut à droite, sélectionnez vos photos, et appuyez "Envoyer".

**Q: Les photos sont-elles privées ?**
A: Actuellement, toute personne avec le lien peut voir les photos. Pour plus de sécurité, implémentez Phase 2 avec authentification.

---

## 📚 Additional Resources

**Documentation:**
- PWA Implementation: `/PWA-IMPLEMENTATION.md`
- Bundle B Features: `/BUNDLE-B-ADMIN-FEATURES.md`
- Remaining Features: `/REMAINING-FEATURES.md`

**Useful Links:**
- [Astro Docs](https://docs.astro.build)
- [PWA Builder](https://www.pwabuilder.com)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)

---

## ✅ Success!

Once deployed, your wedding photo gallery is live! Users can:

- ✅ View photos on any device
- ✅ Install as an app
- ✅ Use offline
- ✅ Upload their photos
- ✅ React and favorite
- ✅ Leave messages in guestbook
- ✅ Download photos

**Admins can:**
- ✅ View detailed statistics
- ✅ Manage albums
- ✅ Control upload permissions
- ✅ Generate QR codes
- ✅ Download backups

---

**🎊 Félicitations! Your wedding photo gallery is now live!**

Questions or issues? Check the troubleshooting section or create an issue in the repository.
