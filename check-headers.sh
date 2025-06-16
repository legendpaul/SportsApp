#!/bin/bash

echo "🔍 X-Frame-Options Fix Verification"
echo "==================================="

SITE_URL="https://minnkasports.netlify.app"

echo "📡 Checking headers for: $SITE_URL"
echo ""

# Check main site headers
echo "🌐 Main Site Headers:"
echo "---------------------"
curl -I "$SITE_URL" 2>/dev/null | grep -i "x-frame\|content-security\|access-control"

echo ""
echo "🔧 Netlify Function Headers:"
echo "-----------------------------"
curl -I "$SITE_URL/.netlify/functions/fetch-football-api" 2>/dev/null | grep -i "x-frame\|content-security\|access-control"

echo ""
echo "📊 Full Header Analysis:"
echo "------------------------"

# Check if X-Frame-Options is present
XFRAME=$(curl -I "$SITE_URL" 2>/dev/null | grep -i "x-frame-options")
if [ -z "$XFRAME" ]; then
    echo "✅ X-Frame-Options: NOT PRESENT (Good!)"
else
    echo "❌ X-Frame-Options: $XFRAME"
fi

# Check CSP
CSP=$(curl -I "$SITE_URL" 2>/dev/null | grep -i "content-security-policy")
if [ -z "$CSP" ]; then
    echo "⚠️  Content-Security-Policy: NOT PRESENT"
else
    echo "📋 Content-Security-Policy: Present"
    if [[ $CSP == *"frame-ancestors"* ]]; then
        echo "✅ CSP contains frame-ancestors directive"
    else
        echo "⚠️  CSP missing frame-ancestors directive"
    fi
fi

# Check CORS
CORS=$(curl -I "$SITE_URL" 2>/dev/null | grep -i "access-control-allow-origin")
if [ -z "$CORS" ]; then
    echo "⚠️  CORS: NOT PRESENT"
else
    echo "✅ CORS: $CORS"
fi

echo ""
echo "🧪 Quick Tests:"
echo "---------------"
echo "1. Visit: $SITE_URL/debug-x-frame.html"
echo "2. Run all tests in the debug tool"
echo "3. Check browser console for errors"
echo "4. Try incognito mode if issues persist"

echo ""
echo "📞 If still seeing X-Frame-Options errors:"
echo "- Clear browser cache completely"
echo "- Wait 5 minutes after deployment"
echo "- Check Netlify deploy logs"
echo "- Try different browser"
