// Theme Toggle Functionality

(function() {
  'use strict';

  // Get theme from localStorage or default to light
  function getTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  // Set theme
  function setTheme(theme) {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update Recharts colors if available
    if (window.updateChartColors) {
      window.updateChartColors();
    }
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    return newTheme;
  }

  // Initialize theme on page load
  function initTheme() {
    const theme = getTheme();
    setTheme(theme);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Export functions to window
  window.themeToggle = toggleTheme;
  window.setTheme = setTheme;
  window.getTheme = getTheme;
})();

