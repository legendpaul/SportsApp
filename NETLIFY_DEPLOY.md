# 🚀 Netlify Deployment Guide

This guide will help you deploy the web version of UK Sports TV Guide to Netlify.

## 📋 Prerequisites

1. **GitHub Account** (or GitLab/Bitbucket)
2. **Netlify Account** (free at netlify.com)
3. **Web version files** in your repository

## 🎯 Quick Deploy Options

### Option 1: Drag & Drop (Easiest)

1. **Prepare files** - Copy these files to a new folder:
   ```
   web-index.html
   web-app.js
   web-datamanager.js
   web-matchfetcher.js
   styles.css
   styles_api.css
   assets/ (folder with images)
   netlify.toml
   ```

2. **Visit Netlify** - Go to [netlify.com](https://netlify.com)

3. **Drag & Drop** - Drag your folder to the deployment area

4. **Done!** - Your app is live at a random URL

### Option 2: Git Repository (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add web version for Netlify"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Log into Netlify
   - Click "New site from Git"
   - Choose GitHub and authorize
   - Select your repository

3. **Configure Build**:
   - **Build command**: Leave empty (static site)
   - **Publish directory**: `.` (root)
   - **Branch**: `main`

4. **Deploy** - Click "Deploy site"

## ⚙️ Configuration

The `netlify.toml` file handles all configuration:

```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/web-index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Content-Security-Policy = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:;"
```

## 🔧 Custom Domain (Optional)

1. **Buy domain** (e.g., from Namecheap, GoDaddy)
2. **Add to Netlify**:
   - Site settings → Domain management
   - Add custom domain
   - Update DNS records as instructed

## 🎨 Environment Setup

### For the Web Version:
- **No build process** required
- **Static files** only
- **localStorage** for data persistence
- **Fetch API** for data requests

### File Structure:
```
your-site/
├── web-index.html      # Main entry point
├── web-app.js          # Application logic
├── web-datamanager.js  # Data management
├── web-matchfetcher.js # Data fetching
├── styles.css          # Main styles
├── styles_api.css      # Additional styles
├── netlify.toml        # Netlify configuration
└── assets/             # Images and icons
    ├── background.jpg
    ├── background.svg
    └── icon.png
```

## 🔄 Continuous Deployment

Once connected to Git:
- **Push changes** to your repository
- **Automatic deploy** triggers
- **Live updates** within minutes
- **Rollback** capability if needed

## 🛠️ Troubleshooting

### Common Issues:

1. **404 Error**:
   - Check `netlify.toml` redirects
   - Ensure `web-index.html` exists
   - Verify publish directory is set to `.`

2. **CSS Not Loading**:
   - Check file paths in HTML
   - Ensure `styles.css` and `styles_api.css` exist
   - Verify case-sensitive filenames

3. **JavaScript Errors**:
   - Check browser console
   - Verify all `.js` files are uploaded
   - Check for CORS issues with external APIs

4. **CORS Issues**:
   - Web version uses CORS proxy for external data
   - May fall back to demo data if blocked
   - This is expected behavior

### Debug Steps:

1. **Check Deploy Log** in Netlify dashboard
2. **Test locally** by opening `web-index.html`
3. **Browser Console** for JavaScript errors
4. **Network Tab** for failed resource loads

## 📱 Testing

### Before Deployment:
```bash
# Test locally
open web-index.html

# Or serve with Python
python -m http.server 8000
# Visit http://localhost:8000/web-index.html
```

### After Deployment:
- Test on **desktop browser**
- Test on **mobile devices**
- Check **all features** work
- Verify **data persistence** (localStorage)
- Test **channel filtering**
- Check **debug system**

## 🎯 Performance Optimization

### Netlify Features:
- **CDN** (automatically enabled)
- **Compression** (gzip/brotli)
- **Asset optimization**
- **Edge locations** worldwide

### Manual Optimizations:
- **Minify** CSS/JS (optional)
- **Optimize images** in assets/
- **Enable caching** headers (in netlify.toml)

## 🔐 Security Headers

The `netlify.toml` includes security headers:
- **X-Frame-Options**: Prevent embedding
- **X-XSS-Protection**: XSS protection
- **Content-Security-Policy**: Control resource loading

## 📊 Analytics (Optional)

Add to `web-index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🎉 Success!

Your UK Sports TV Guide web app should now be live at:
`https://your-site-name.netlify.app`

### Next Steps:
1. **Share the URL** with users
2. **Test all features** thoroughly
3. **Monitor usage** via Netlify dashboard
4. **Update content** by pushing to Git
5. **Consider custom domain** for branding

---

**Need Help?**
- Netlify Docs: https://docs.netlify.com
- Community Support: https://answers.netlify.com
- GitHub Issues: Create an issue in your repository

Your web version is now accessible worldwide! 🌍
