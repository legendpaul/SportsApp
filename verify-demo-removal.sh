#!/bin/bash

# Sports App - Real Data Verification Script
# This script verifies that demo data has been completely removed

echo "🔍 Verifying Demo Data Removal..."
echo "=================================="

# Check for any remaining demo data references
echo "📋 Checking for demo data references..."

DEMO_REFS=$(grep -r -i "demo" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".git" | grep -v "README" | grep -v "COMPLETE.md")

if [ -z "$DEMO_REFS" ]; then
    echo "✅ No demo data references found in code files"
else
    echo "⚠️  Found potential demo references:"
    echo "$DEMO_REFS"
fi

echo ""
echo "📋 Checking for generateDemo functions..."

GENERATE_DEMO=$(grep -r "generateDemo" --include="*.js" . | grep -v "node_modules" | grep -v ".git")

if [ -z "$GENERATE_DEMO" ]; then
    echo "✅ No generateDemo functions found"
else
    echo "❌ Found generateDemo functions:"
    echo "$GENERATE_DEMO"
fi

echo ""
echo "📋 Checking for demo data arrays..."

DEMO_ARRAYS=$(grep -r "demoMatches\|demo_" --include="*.js" . | grep -v "node_modules" | grep -v ".git" | grep -v "README" | grep -v "COMPLETE.md")

if [ -z "$DEMO_ARRAYS" ]; then
    echo "✅ No demo data arrays found"
else
    echo "❌ Found demo data arrays:"
    echo "$DEMO_ARRAYS"
fi

echo ""
echo "📋 Key Files Status:"
echo "===================="

# Check specific files
if [ -f "web-matchfetcher.js" ]; then
    echo "✅ web-matchfetcher.js exists"
    if grep -q "generateLocalDemoMatches" web-matchfetcher.js; then
        echo "❌ Still contains generateLocalDemoMatches"
    else
        echo "✅ generateLocalDemoMatches removed"
    fi
else
    echo "❌ web-matchfetcher.js missing"
fi

if [ -f "netlify/functions/fetch-football.js" ]; then
    echo "✅ fetch-football.js exists"
    if grep -q "generateDemoMatches" netlify/functions/fetch-football.js; then
        echo "❌ Still contains generateDemoMatches"
    else
        echo "✅ generateDemoMatches removed"
    fi
else
    echo "❌ netlify/functions/fetch-football.js missing"
fi

if [ -f "netlify/functions/fetch-football-api.js" ]; then
    echo "✅ fetch-football-api.js exists"
    if grep -q "generateRealisticDemoMatches" netlify/functions/fetch-football-api.js; then
        echo "❌ Still contains generateRealisticDemoMatches"
    else
        echo "✅ generateRealisticDemoMatches removed"
    fi
else
    echo "❌ netlify/functions/fetch-football-api.js missing"
fi

echo ""
echo "📋 New Files Created:"
echo "===================="

if [ -f "API_CONFIG_README.md" ]; then
    echo "✅ API_CONFIG_README.md created"
else
    echo "❌ API_CONFIG_README.md missing"
fi

if [ -f "test-real-data.html" ]; then
    echo "✅ test-real-data.html created"
else
    echo "❌ test-real-data.html missing"
fi

if [ -f "DEMO_DATA_REMOVAL_COMPLETE.md" ]; then
    echo "✅ DEMO_DATA_REMOVAL_COMPLETE.md created"
else
    echo "❌ DEMO_DATA_REMOVAL_COMPLETE.md missing"
fi

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Deploy to Netlify: git add . && git commit -m 'Remove demo data' && git push"
echo "2. Test at: https://your-site.netlify.app/test-real-data.html"
echo "3. Configure API keys (optional): See API_CONFIG_README.md"
echo "4. Monitor main app: https://your-site.netlify.app/"
echo ""
echo "✅ Demo data removal verification complete!"
