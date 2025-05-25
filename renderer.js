// Renderer process script for Sports TV Guide
// This file handles the front-end display logic

console.log('📺 Sports TV Guide renderer script loaded');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM loaded, Sports TV Guide ready');
  
  // The main app logic is in app.js
  // This file is for any additional renderer-specific functionality
  
  // Add any additional UI enhancements here
  addUIEnhancements();
});

function addUIEnhancements() {
  // Add loading states
  const loadingElements = document.querySelectorAll('#current-time');
  loadingElements.forEach(el => {
    if (el.textContent === 'Loading...') {
      el.style.opacity = '0.7';
    }
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      location.reload();
    }
  });
  
  console.log('✨ UI enhancements added');
}

// Error handling
window.addEventListener('error', (e) => {
  console.error('🚨 Renderer Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Unhandled Promise Rejection:', e.reason);
});

console.log('✅ Sports TV Guide renderer ready');