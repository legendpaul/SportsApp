/**
 * Comprehensive Real Data Verification Script
 * Searches for and validates that all mock/fake data has been removed
 */

const fs = require('fs');
const path = require('path');

class RealDataVerifier {
  constructor() {
    this.rootDir = __dirname;
    this.excludeDirs = ['node_modules', '.git', 'logs'];
    this.mockPatterns = [
      /FAKE/gi,
      /MOCK/gi,
      /FALLBACK/gi,
      /getCurrentUFCEventsWithCorrectTimes/gi,
      /generateLocalDemoMatches/gi,
      /generateDemoMatches/gi,
      /generateRealisticDemoMatches/gi,
      /ufc_317_topuria_vs_oliveira_2025/gi,
      /reliable_local_data/gi,
      /demo.*ufc.*event/gi,
      /test.*ufc.*event/gi
    ];
    this.findings = [];
    this.checkedFiles = 0;
  }

  async verify() {
    console.log('🔍 Starting Real Data Verification...');
    console.log('🎯 Searching for any remaining mock/fake data patterns\n');

    await this.scanDirectory(this.rootDir);
    this.generateReport();
  }

  async scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !this.excludeDirs.includes(item)) {
          await this.scanDirectory(fullPath);
        } else if (stat.isFile() && this.shouldCheckFile(item)) {
          await this.checkFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not scan directory ${dir}: ${error.message}`);
    }
  }

  shouldCheckFile(filename) {
    const extensions = ['.js', '.html', '.md', '.json', '.txt', '.bat'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.checkedFiles++;

      for (const pattern of this.mockPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          const relativePath = path.relative(this.rootDir, filePath);
          this.findings.push({
            file: relativePath,
            pattern: pattern.toString(),
            matches: matches,
            isSerious: this.isSerious(pattern, relativePath)
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read (binary files, etc.)
    }
  }

  isSerious(pattern, filePath) {
    // Some patterns in certain files are not serious (e.g., comments about removing mock data)
    const nonSeriousFiles = [
      'DEMO_DATA_REMOVAL_COMPLETE.md',
      'verify_no_mock_data.js',
      'test_real_ufc_data.js'
    ];
    
    const fileName = path.basename(filePath);
    return !nonSeriousFiles.includes(fileName);
  }

  generateReport() {
    console.log('📊 REAL DATA VERIFICATION REPORT');
    console.log('=' .repeat(50));
    console.log(`📁 Files checked: ${this.checkedFiles}`);
    console.log(`🔍 Mock patterns searched: ${this.mockPatterns.length}`);
    console.log(`⚠️ Findings: ${this.findings.length}\n`);

    if (this.findings.length === 0) {
      console.log('✅ VERIFICATION PASSED!');
      console.log('🎉 No mock/fake data patterns found');
      console.log('🏆 All code appears to use real data sources');
      return true;
    }

    const seriousFindings = this.findings.filter(f => f.isSerious);
    const nonSeriousFindings = this.findings.filter(f => !f.isSerious);

    if (seriousFindings.length > 0) {
      console.log('❌ SERIOUS FINDINGS (need attention):');
      seriousFindings.forEach((finding, index) => {
        console.log(`\n${index + 1}. File: ${finding.file}`);
        console.log(`   Pattern: ${finding.pattern}`);
        console.log(`   Matches: ${finding.matches.slice(0, 3).join(', ')}${finding.matches.length > 3 ? '...' : ''}`);
      });
    }

    if (nonSeriousFindings.length > 0) {
      console.log('\n📝 NON-SERIOUS FINDINGS (likely documentation):');
      nonSeriousFindings.forEach((finding, index) => {
        console.log(`${index + 1}. ${finding.file} - ${finding.pattern}`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    
    if (seriousFindings.length === 0) {
      console.log('✅ VERIFICATION PASSED (with documentation notes)');
      console.log('🎯 No actual mock data code found');
      return true;
    } else {
      console.log('❌ VERIFICATION FAILED');
      console.log(`🔧 ${seriousFindings.length} serious findings need to be addressed`);
      return false;
    }
  }
}

// Additional validation functions
function validateUFCFetchers() {
  console.log('\n🥊 Validating UFC Fetcher files...');
  
  const ufcFiles = [
    'web-ufcfetcher.js',
    'ufcFetcher.js',
    'netlify/functions/fetch-ufc.js'
  ];

  let allValid = true;

  ufcFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for real data indicators
      const hasRealDataIndicators = [
        /ufc\.com/i,
        /official.*source/i,
        /real.*data/i,
        /google.*search/i
      ].some(pattern => pattern.test(content));

      // Check for mock data indicators
      const hasMockDataIndicators = [
        /getCurrentUFCEventsWithCorrectTimes/i,
        /fake.*ufc/i,
        /mock.*ufc/i,
        /demo.*ufc/i
      ].some(pattern => pattern.test(content));

      console.log(`  📄 ${file}:`);
      console.log(`    ✅ Real data indicators: ${hasRealDataIndicators ? 'Found' : 'Missing'}`);
      console.log(`    ❌ Mock data indicators: ${hasMockDataIndicators ? 'Found (BAD)' : 'None (GOOD)'}`);

      if (!hasRealDataIndicators || hasMockDataIndicators) {
        allValid = false;
      }
    } else {
      console.log(`  ❌ ${file}: File not found`);
      allValid = false;
    }
  });

  return allValid;
}

function validateEnvironmentConfig() {
  console.log('\n⚙️ Validating environment configuration...');
  
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('  📄 .env file found');
    
    const hasGoogleKeys = envContent.includes('GOOGLE_API_KEY') && envContent.includes('SEARCH_ENGINE_ID');
    console.log(`  🔑 Google API keys: ${hasGoogleKeys ? 'Configured' : 'Missing'}`);
    
    if (hasGoogleKeys) {
      console.log('  ✅ Google Custom Search API ready for UFC data');
    } else {
      console.log('  ⚠️ Google API keys missing - UFC data may be limited');
    }
  } else {
    console.log('  📄 .env file not found - using defaults');
  }
}

function validateNetlifyFunctions() {
  console.log('\n🌐 Validating Netlify functions...');
  
  const functionsDir = path.join(__dirname, 'netlify', 'functions');
  if (!fs.existsSync(functionsDir)) {
    console.log('  ❌ Netlify functions directory not found');
    return false;
  }

  const functions = ['fetch-ufc.js', 'fetch-football.js', 'fetch-football-api.js'];
  let allValid = true;

  functions.forEach(func => {
    const funcPath = path.join(functionsDir, func);
    if (fs.existsSync(funcPath)) {
      const content = fs.readFileSync(funcPath, 'utf-8');
      
      // Check if function has proper real data implementation
      const hasRealDataLogic = [
        /https?:\/\//i,
        /api/i,
        /scrap/i,
        /fetch/i
      ].some(pattern => pattern.test(content));

      const hasMockData = [
        /demo/i,
        /fake/i,
        /mock/i,
        /fallback.*data/i
      ].some(pattern => pattern.test(content));

      console.log(`  📄 ${func}:`);
      console.log(`    ✅ Real data logic: ${hasRealDataLogic ? 'Found' : 'Missing'}`);
      console.log(`    ❌ Mock data: ${hasMockData ? 'Found (BAD)' : 'None (GOOD)'}`);

      if (!hasRealDataLogic || hasMockData) {
        allValid = false;
      }
    } else {
      console.log(`  ❌ ${func}: Not found`);
      allValid = false;
    }
  });

  return allValid;
}

// Main execution
async function runFullVerification() {
  console.log('🚀 COMPREHENSIVE REAL DATA VERIFICATION');
  console.log('=' .repeat(60));
  console.log('🎯 Verifying removal of all mock/fake data');
  console.log('✅ Validating real data implementation\n');

  const verifier = new RealDataVerifier();
  const mockDataCheck = await verifier.verify();
  
  const ufcValidation = validateUFCFetchers();
  validateEnvironmentConfig();
  const netlifyValidation = validateNetlifyFunctions();

  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL VERIFICATION RESULTS:');
  console.log('=' .repeat(60));

  const overallSuccess = mockDataCheck && ufcValidation && netlifyValidation;

  console.log(`🔍 Mock data removal: ${mockDataCheck ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`🥊 UFC fetchers: ${ufcValidation ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`🌐 Netlify functions: ${netlifyValidation ? '✅ VALID' : '❌ INVALID'}`);

  if (overallSuccess) {
    console.log('\n🎉 VERIFICATION SUCCESSFUL!');
    console.log('🏆 All systems are using real data sources');
    console.log('✅ No mock/fake data detected');
    console.log('🚀 Ready for production deployment');
  } else {
    console.log('\n⚠️ VERIFICATION ISSUES FOUND');
    console.log('🔧 Please review the findings above');
    console.log('📝 Address any serious issues before deployment');
  }

  return overallSuccess;
}

if (require.main === module) {
  runFullVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification script error:', error);
      process.exit(1);
    });
}

module.exports = { RealDataVerifier, runFullVerification };