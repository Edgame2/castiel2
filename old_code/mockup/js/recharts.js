// Recharts-style Utilities (for compatibility)
// Note: This file provides compatibility functions.
// Actual chart rendering is handled by charts.js

(function() {
  'use strict';

  // Update chart colors when theme changes
  function updateChartColors() {
    const colors = window.getChartColors ? window.getChartColors() : {};
    
    // Dispatch custom event for charts to update
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { colors } 
    }));
  }

  // Export function for theme.js compatibility
  window.updateChartColors = updateChartColors;
})();

