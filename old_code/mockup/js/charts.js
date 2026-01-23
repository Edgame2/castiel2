// Vanilla JS Chart Implementation (Recharts-style for mockup)

(function() {
  'use strict';

  // Get theme-aware colors
  function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    const style = getComputedStyle(document.documentElement);
    
    return {
      chart1: style.getPropertyValue('--chart-1').trim() || (isDark ? '#7c3aed' : '#8b5cf6'),
      chart2: style.getPropertyValue('--chart-2').trim() || '#06b6d4',
      chart3: style.getPropertyValue('--chart-3').trim() || '#3b82f6',
      chart4: style.getPropertyValue('--chart-4').trim() || '#f59e0b',
      chart5: style.getPropertyValue('--chart-5').trim() || '#ef4444',
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      text: style.getPropertyValue('--foreground').trim(),
      muted: style.getPropertyValue('--muted-foreground').trim(),
    };
  }

  // Render Bar Chart
  function renderBarChart(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

      const {
      width = container.offsetWidth || 500,
      height = container.offsetHeight || 300,
      margin = { top: 20, right: 30, bottom: 40, left: 40 },
      showGrid = true,
      showTooltip = true,
      colors = getChartColors(),
      dataKey = 'value',
      nameKey = 'name',
      barColor = colors.chart1,
      customColors = null,
      valueFormatter = (v) => typeof v === 'number' ? v.toLocaleString() : v,
    } = options;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate max value
    const maxValue = Math.max(...data.map(d => d[dataKey] || d.value || 0));
    const barWidth = chartWidth / data.length * 0.8;
    const barGap = chartWidth / data.length * 0.2;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.overflow = 'visible';

    // Create group for chart area
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(g);

    // Draw grid lines
    if (showGrid) {
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = (chartHeight / gridLines) * i;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', chartWidth);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', colors.grid);
        line.setAttribute('stroke-width', 1);
        line.setAttribute('stroke-dasharray', '3 3');
        g.appendChild(line);
      }
    }

    // Draw bars
    data.forEach((item, index) => {
      const value = item[dataKey] || item.value || 0;
      const name = item[nameKey] || item.name || `Item ${index + 1}`;
      const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
      const x = index * (barWidth + barGap) + barGap / 2;
      const y = chartHeight - height;

      const color = customColors && customColors[index] ? customColors[index] : 
                   (item.color || barColor);

      // Bar
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', height);
      rect.setAttribute('fill', color);
      rect.setAttribute('rx', 4);
      rect.style.cursor = 'pointer';
      rect.style.transition = 'opacity 0.2s';
      
      if (showTooltip) {
        rect.addEventListener('mouseenter', function() {
          this.style.opacity = '0.8';
        });
        rect.addEventListener('mouseleave', function() {
          this.style.opacity = '1';
        });
      }

      g.appendChild(rect);

      // Value label on top
      if (value > 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + barWidth / 2);
        text.setAttribute('y', y - 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', colors.text);
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', '500');
        text.textContent = valueFormatter(value);
        g.appendChild(text);
      }

      // X-axis label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x + barWidth / 2);
      label.setAttribute('y', chartHeight + 20);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', colors.muted);
      label.setAttribute('font-size', '12');
      label.textContent = name;
      g.appendChild(label);
    });

    // Y-axis
    const yAxisLines = 5;
    for (let i = 0; i <= yAxisLines; i++) {
      const value = (maxValue / yAxisLines) * (yAxisLines - i);
      const y = (chartHeight / yAxisLines) * i;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', -10);
      text.setAttribute('y', y + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', colors.muted);
      text.setAttribute('font-size', '12');
      text.textContent = Math.round(value).toLocaleString();
      g.appendChild(text);
    }

    // Clear container and append SVG
    container.innerHTML = '';
    container.appendChild(svg);
  }

  // Export functions
  window.renderBarChart = renderBarChart;
  window.getChartColors = getChartColors;

  // Update charts when theme changes
  window.addEventListener('themeChanged', function() {
    // Re-render all charts if needed
    const charts = document.querySelectorAll('[data-chart]');
    charts.forEach(chart => {
      const chartId = chart.id;
      const chartData = window.chartDataCache && window.chartDataCache[chartId];
      const chartOptions = window.chartOptionsCache && window.chartOptionsCache[chartId];
      if (chartData && chartOptions) {
        renderBarChart(chartId, chartData, chartOptions);
      }
    });
  });
})();

