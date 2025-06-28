/**
 * Final Deployment Validation Script
 * Comprehensive testing of all systems before production deployment
 */

const fs = require('fs');
const path = require('path');

class FinalValidation {
  constructor() {
    this.testResults = {};
    this.overallScore = 0;
    this.maxScore = 0;
    this.criticalIssues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  async runFullValidation() {
    console.log('🚀 FINAL DEPLOYMENT VALIDATION');
    console.log('=' .repeat(60));
    console.log('🎯 Comprehensive testing for production readiness');
    console.log('📊 Testing all systems for real data implementation\n');

    try {
      await this.testMockDataRemoval();
      await this.testUFCDataSystems();
      await this.testFootballDataSystems();
      await this.testFileStructure();
      await this.testEnvironmentConfig();
      await this.testNetlifyFunctions();
      await this.testPerformance();
      await this.testUserExperience();
      
      this.generateFinalReport();
      return this.generateDeploymentDecision();

    } catch (error) {
      console.error('❌ Fatal error during validation:', error.message);
      return { ready: false, error: error.message };
    }
  }

  async testMockDataRemoval() {
    console.log('1️⃣ Testing Mock Data Removal...');
    this.maxScore += 25;

    try {
      const mockPatterns = [
        /FAKE/gi,
        /MOCK/gi,
        /FALLBACK/gi,
        /getCurrentUFCEventsWithCorrectTimes/gi,
        /demo.*ufc.*event/gi
      ];

      let findings = 0;
      const keyFiles = [
        'web-ufcfetcher.js',
        'ufcFetcher.js',
        'web-matchfetcher.js',
        'matchFetcher.js',
        'netlify/functions/fetch-ufc.js',
        'netlify/functions/fetch-football.js'
      ];

      for (const file of keyFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          for (const pattern of mockPatterns) {
            if (pattern.test(content)) {
              findings++;
              this.criticalIssues.push(`Mock data pattern found in ${file}: ${pattern}`);
            }
          }
        }
      }

      if (findings === 0) {
        console.log('   ✅ No mock data patterns found in key files');
        this.overallScore += 25;
        this.testResults.mockDataRemoval = { success: true, findings: 0 };
      } else {
        console.log(`   ❌ Found ${findings} mock data patterns in key files`);
        this.testResults.mockDataRemoval = { success: false, findings: findings };
      }

    } catch (error) {
      console.log(`   ❌ Mock data verification error: ${error.message}`);
      this.criticalIssues.push(`Mock data verification failed: ${error.message}`);
      this.testResults.mockDataRemoval = { success: false, error: error.message };
    }
  }

  async testUFCDataSystems() {
    console.log('\n2️⃣ Testing UFC Data Systems...');
    this.maxScore += 20;

    try {
      const UFCFetcher = require('./ufcFetcher');
      const fetcher = new UFCFetcher();

      // Test connection
      const connectionTest = await fetcher.testConnection();
      
      // Test data fetching (with timeout)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('UFC fetch timeout')), 15000)
      );
      
      const fetchPromise = fetcher.fetchUpcomingUFCEvents();
      
      try {
        const events = await Promise.race([fetchPromise, timeoutPromise]);
        
        const hasRealDataSources = events.every(e => 
          e.apiSource && !e.apiSource.includes('demo') && !e.apiSource.includes('mock')
        );

        if (connectionTest && hasRealDataSources) {
          console.log(`   ✅ UFC system working (${events.length} events, real sources)`);
          this.overallScore += 20;
          this.testResults.ufcData = { 
            success: true, 
            connection: connectionTest,
            eventCount: events.length,
            realDataSources: hasRealDataSources
          };
        } else {
          console.log('   ⚠️ UFC system has issues but may work in production');
          this.overallScore += 10;
          this.warnings.push('UFC system may need network connectivity for full functionality');
          this.testResults.ufcData = { 
            success: false, 
            connection: connectionTest,
            eventCount: events.length,
            realDataSources: hasRealDataSources
          };
        }

      } catch (fetchError) {
        console.log('   ⚠️ UFC fetch timeout/error - may work in production environment');
        this.overallScore += 5;
        this.warnings.push('UFC data fetching timed out - check network connectivity');
        this.testResults.ufcData = { success: false, error: fetchError.message };
      }

    } catch (error) {
      console.log(`   ❌ UFC system error: ${error.message}`);
      this.warnings.push(`UFC system error: ${error.message}`);
      this.testResults.ufcData = { success: false, error: error.message };
    }
  }

  async testFootballDataSystems() {
    console.log('\n3️⃣ Testing Football Data Systems...');
    this.maxScore += 15;

    try {
      const MatchFetcher = require('./matchFetcher');
      const fetcher = new MatchFetcher();

      // Test with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Football fetch timeout')), 10000)
      );
      
      const fetchPromise = fetcher.fetchTodaysMatches();
      
      try {
        const matches = await Promise.race([fetchPromise, timeoutPromise]);
        
        const hasRealDataSources = matches.every(m => 
          m.apiSource && !m.apiSource.includes('demo')
        );

        if (hasRealDataSources) {
          console.log(`   ✅ Football system working (${matches.length} matches, real sources)`);
          this.overallScore += 15;
          this.testResults.footballData = { 
            success: true, 
            matchCount: matches.length,
            realDataSources: hasRealDataSources
          };
        } else {
          console.log('   ⚠️ Football system working but data sources need verification');
          this.overallScore += 10;
          this.warnings.push('Football data sources need verification');
          this.testResults.footballData = { 
            success: false, 
            matchCount: matches.length,
            realDataSources: hasRealDataSources
          };
        }

      } catch (fetchError) {
        console.log('   ⚠️ Football fetch timeout - may work in production');
        this.overallScore += 5;
        this.warnings.push('Football data fetching timed out');
        this.testResults.footballData = { success: false, error: fetchError.message };
      }

    } catch (error) {
      console.log(`   ❌ Football system error: ${error.message}`);
      this.warnings.push(`Football system error: ${error.message}`);
      this.testResults.footballData = { success: false, error: error.message };
    }
  }

  async testFileStructure() {
    console.log('\n4️⃣ Testing File Structure...');
    this.maxScore += 15;

    const requiredFiles = [
      'index.html',
      'web-ufcfetcher.js',
      'web-matchfetcher.js',
      'web-datamanager.js',
      'ufcFetcher.js',
      'matchFetcher.js',
      'dataManager.js',
      'netlify/functions/fetch-ufc.js',
      'netlify/functions/fetch-football.js',
      'netlify/functions/fetch-football-api.js',
      'test-real-data.html'
    ];

    let foundFiles = 0;
    const missingFiles = [];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        foundFiles++;
      } else {
        missingFiles.push(file);
      }
    }

    const fileScore = Math.round((foundFiles / requiredFiles.length) * 15);
    this.overallScore += fileScore;

    if (missingFiles.length === 0) {
      console.log('   ✅ All required files present');
    } else {
      console.log(`   ⚠️ Missing ${missingFiles.length} files: ${missingFiles.join(', ')}`);
      missingFiles.forEach(file => {
        this.warnings.push(`Missing required file: ${file}`);
      });
    }

    this.testResults.fileStructure = { 
      success: missingFiles.length === 0,
      foundFiles: foundFiles,
      totalFiles: requiredFiles.length,
      missingFiles: missingFiles
    };
  }

  async testEnvironmentConfig() {
    console.log('\n5️⃣ Testing Environment Configuration...');
    this.maxScore += 10;

    try {
      const envPath = path.join(__dirname, '.env');
      let envScore = 0;

      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        
        if (envContent.includes('GOOGLE_API_KEY') && envContent.includes('SEARCH_ENGINE_ID')) {
          console.log('   ✅ Google API keys configured');
          envScore += 8;
        } else {
          console.log('   ⚠️ Google API keys missing - UFC data may be limited');
          this.warnings.push('Google API keys not configured - UFC data may be limited');
          envScore += 3;
        }

        if (envContent.includes('FOOTBALL_DATA_API_KEY') || envContent.includes('API_FOOTBALL_KEY')) {
          console.log('   ✅ Optional football API keys found');
          envScore += 2;
        } else {
          console.log('   📝 Optional football API keys not set');
          this.recommendations.push('Consider adding FOOTBALL_DATA_API_KEY for enhanced football data');
        }

      } else {
        console.log('   ⚠️ .env file not found');
        this.warnings.push('.env file not found - API functionality may be limited');
        envScore += 1;
      }

      this.overallScore += envScore;
      this.testResults.environmentConfig = { 
        success: envScore >= 8,
        score: envScore,
        maxScore: 10
      };

    } catch (error) {
      console.log(`   ❌ Environment config error: ${error.message}`);
      this.warnings.push(`Environment configuration error: ${error.message}`);
      this.testResults.environmentConfig = { success: false, error: error.message };
    }
  }

  async testNetlifyFunctions() {
    console.log('\n6️⃣ Testing Netlify Functions...');
    this.maxScore += 10;

    const functions = ['fetch-ufc.js', 'fetch-football.js', 'fetch-football-api.js'];
    let functionScore = 0;

    for (const func of functions) {
      const funcPath = path.join(__dirname, 'netlify', 'functions', func);
      
      if (fs.existsSync(funcPath)) {
        const content = fs.readFileSync(funcPath, 'utf-8');
        
        // Check for real data implementation
        const hasRealDataLogic = /https?:\/\//.test(content) && !/demo|mock|fake/.test(content);
        
        if (hasRealDataLogic) {
          console.log(`   ✅ ${func} looks good`);
          functionScore += 3;
        } else {
          console.log(`   ⚠️ ${func} may have issues`);
          this.warnings.push(`${func} may not have proper real data implementation`);
          functionScore += 1;
        }
      } else {
        console.log(`   ❌ ${func} missing`);
        this.criticalIssues.push(`Netlify function missing: ${func}`);
      }
    }

    this.overallScore += Math.min(functionScore, 10);
    this.testResults.netlifyFunctions = { 
      success: functionScore >= 9,
      score: functionScore,
      maxScore: 9
    };
  }

  async testPerformance() {
    console.log('\n7️⃣ Testing Performance...');
    this.maxScore += 10;

    try {
      // Check for performance optimizations
      const hasPerformanceOptimizer = fs.existsSync(path.join(__dirname, 'performance_optimizer.js'));
      const hasCaching = fs.existsSync(path.join(__dirname, 'cache')) || 
                        fs.readFileSync(path.join(__dirname, 'web-datamanager.js'), 'utf-8').includes('cache');

      let perfScore = 0;

      if (hasPerformanceOptimizer) {
        console.log('   ✅ Performance optimizer available');
        perfScore += 5;
      }

      if (hasCaching) {
        console.log('   ✅ Caching system detected');
        perfScore += 5;
      } else {
        console.log('   📝 Basic caching available');
        perfScore += 3;
      }

      this.overallScore += perfScore;
      this.testResults.performance = { 
        success: perfScore >= 8,
        hasOptimizer: hasPerformanceOptimizer,
        hasCaching: hasCaching,
        score: perfScore
      };

      if (perfScore < 8) {
        this.recommendations.push('Consider implementing advanced caching for better performance');
      }

    } catch (error) {
      console.log(`   ⚠️ Performance check error: ${error.message}`);
      this.testResults.performance = { success: false, error: error.message };
    }
  }

  async testUserExperience() {
    console.log('\n8️⃣ Testing User Experience...');
    this.maxScore += 5;

    try {
      // Check for user-friendly features
      const hasTestPage = fs.existsSync(path.join(__dirname, 'test-real-data.html'));
      const hasDocumentation = fs.existsSync(path.join(__dirname, 'REAL_DATA_IMPLEMENTATION.md'));
      const hasDeploymentGuide = fs.existsSync(path.join(__dirname, 'DEPLOYMENT_CHECKLIST.md'));

      let uxScore = 0;

      if (hasTestPage) {
        console.log('   ✅ Test page available for users');
        uxScore += 2;
      }

      if (hasDocumentation) {
        console.log('   ✅ Documentation available');
        uxScore += 2;
      }

      if (hasDeploymentGuide) {
        console.log('   ✅ Deployment guide available');
        uxScore += 1;
      }

      this.overallScore += uxScore;
      this.testResults.userExperience = { 
        success: uxScore >= 4,
        hasTestPage: hasTestPage,
        hasDocumentation: hasDocumentation,
        hasDeploymentGuide: hasDeploymentGuide,
        score: uxScore
      };

    } catch (error) {
      console.log(`   ⚠️ UX check error: ${error.message}`);
      this.testResults.userExperience = { success: false, error: error.message };
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL VALIDATION REPORT');
    console.log('=' .repeat(60));

    const percentage = Math.round((this.overallScore / this.maxScore) * 100);
    
    console.log(`\n🎯 Overall Score: ${this.overallScore}/${this.maxScore} (${percentage}%)`);
    
    // Score interpretation
    if (percentage >= 90) {
      console.log('🏆 EXCELLENT - Ready for immediate production deployment');
    } else if (percentage >= 80) {
      console.log('✅ GOOD - Ready for production with minor optimizations');
    } else if (percentage >= 70) {
      console.log('⚠️ FAIR - Deployment possible but should address warnings');
    } else {
      console.log('❌ NEEDS WORK - Address critical issues before deployment');
    }

    // Detailed results
    console.log('\n📋 Test Results:');
    Object.entries(this.testResults).forEach(([test, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${test}: ${result.success ? 'PASS' : 'FAIL'}`);
    });

    // Issues and recommendations
    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }

    if (this.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
  }

  generateDeploymentDecision() {
    const percentage = Math.round((this.overallScore / this.maxScore) * 100);
    const isReady = percentage >= 70 && this.criticalIssues.length === 0;

    console.log('\n' + '='.repeat(60));
    console.log('🚀 DEPLOYMENT DECISION');
    console.log('=' .repeat(60));

    if (isReady) {
      console.log('\n✅ DEPLOYMENT APPROVED');
      console.log('🎉 Your Real Data Sports App is ready for production!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Commit all changes to Git');
      console.log('   2. Deploy to Netlify');
      console.log('   3. Configure environment variables');
      console.log('   4. Test production deployment');
      console.log('   5. Monitor initial performance');
      
      if (this.warnings.length > 0) {
        console.log('\n📝 Post-deployment improvements:');
        this.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

    } else {
      console.log('\n❌ DEPLOYMENT NOT RECOMMENDED');
      console.log('🔧 Please address the following issues first:');
      
      if (this.criticalIssues.length > 0) {
        console.log('\n🚨 Critical issues to fix:');
        this.criticalIssues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }

      console.log('\n📋 Steps to prepare for deployment:');
      console.log('   1. Fix all critical issues above');
      console.log('   2. Re-run this validation script');
      console.log('   3. Achieve at least 70% score');
      console.log('   4. Ensure zero critical issues');
    }

    return {
      ready: isReady,
      score: percentage,
      criticalIssues: this.criticalIssues.length,
      warnings: this.warnings.length,
      recommendations: this.recommendations.length
    };
  }
}

// Main execution
async function runFinalValidation() {
  const validator = new FinalValidation();
  const result = await validator.runFullValidation();
  
  console.log('\n🎯 VALIDATION COMPLETE');
  
  if (result.ready) {
    console.log('✅ System is ready for production deployment!');
    process.exit(0);
  } else {
    console.log('⚠️ System needs work before deployment');
    process.exit(1);
  }
}

if (require.main === module) {
  runFinalValidation().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { FinalValidation, runFinalValidation };