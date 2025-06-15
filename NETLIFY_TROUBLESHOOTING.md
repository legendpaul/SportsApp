# 🔧 Netlify Deployment Troubleshooting

If your deployment is failing with "failed to connect", try these solutions:

## ✅ **SOLUTION 1: Correct File Structure**

Make sure you have these files in your repository root:

```
your-repo/
├── index.html              ← MAIN ENTRY POINT (web version)
├── desktop-index.html      ← Desktop/Electron version  
├── web-app.js             ← Web app logic
├── web-datamanager.js     ← Web data management
├── web-matchfetcher.js    ← Web data fetching
├── styles.css             ← Main styles
├── styles_api.css         ← Additional styles
├── netlify.toml           ← Netlify configuration
├── _redirects             ← Backup redirect rules
└── assets/                ← Images and icons
    ├── background.jpg
    ├── background.svg
    └── icon.png
```

## ✅ **SOLUTION 2: Quick Test Deploy**

1. **Create a minimal test** - Upload just `test.html` first:
   ```bash
   # Just drag test.html to Netlify to verify basic deployment works
   ```

2. **Test URL** - Visit your-site.netlify.app/test.html
   - Should show a working test page
   - Will display debug information

## ✅ **SOLUTION 3: Step-by-Step Deploy**

### Option A: Manual File Upload
1. **Create deployment folder** with these files only:
   ```
   deployment/
   ├── index.html
   ├── web-app.js  
   ├── web-datamanager.js
   ├── web-matchfetcher.js
   ├── styles.css
   ├── styles_api.css
   ├── netlify.toml
   └── assets/ (folder)
   ```

2. **Drag to Netlify** - Visit [netlify.com](https://netlify.com)
   - Drag the `deployment` folder to the deploy area
   - Should deploy instantly

### Option B: Git Repository
1. **Check repository structure**:
   ```bash
   git status
   git add .
   git commit -m "Fix web deployment structure"  
   git push origin main
   ```

2. **Netlify settings**:
   - **Build command**: Leave empty
   - **Publish directory**: `.` (root)
   - **Branch**: `main` or `master`

## ✅ **SOLUTION 4: Common Issues**

### Issue: "File not found"
- **Check**: `index.html` exists in root
- **Fix**: Rename web version to `index.html`

### Issue: "Failed to load resources"
- **Check**: CSS/JS file paths in HTML
- **Fix**: Ensure files exist and paths are correct:
  ```html
  <link rel="stylesheet" href="styles.css">
  <script src="web-app.js"></script>
  ```

### Issue: "JavaScript errors"
- **Check**: Browser console (F12 → Console)
- **Fix**: Look for missing files or syntax errors

### Issue: "CORS blocked"
- **Expected**: Web version may use demo data due to CORS
- **Normal**: App should still work with fallback data

## ✅ **SOLUTION 5: Test Locally First**

```bash
# Option 1: Simple file open
open index.html

# Option 2: Local server
python -m http.server 8000
# Visit: http://localhost:8000

# Option 3: Node.js server  
npx http-server
```

## ✅ **SOLUTION 6: Minimal Working Example**

If all else fails, try this minimal `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Deploy</title>
</head>
<body>
    <h1>✅ Netlify Deploy Working!</h1>
    <p>If you see this, deployment is successful.</p>
    <script>
        console.log('JavaScript working!');
        alert('Deploy successful!');
    </script>
</body>
</html>
```

## 🔍 **Debugging Steps**

1. **Check Netlify deploy log**:
   - Site settings → Deploy logs
   - Look for specific error messages

2. **Test in browser**:
   - Visit your-site.netlify.app
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Verify files deployed**:
   - Try accessing individual files:
   - your-site.netlify.app/styles.css
   - your-site.netlify.app/web-app.js

## 📞 **Still Having Issues?**

If deployment still fails:

1. **Check the file structure** matches exactly what's listed above
2. **Try the minimal example** first 
3. **Use the drag-and-drop method** instead of Git
4. **Verify all referenced files exist** (case-sensitive)

The web version should work with demo data even if external APIs are blocked!

---

**Quick Fix Command:**
```bash
# Ensure you have the right file as index.html
cp web-index.html index.html  # If you still have web-index.html
```
