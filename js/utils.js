// Utility functions for VizAlign

// Format numbers for display
function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
}

// Parse dates consistently
function parseDate(dateStr) {
    return new Date(dateStr);
}

// Calculate basic statistics
function calculateStats(data, key) {
    const values = data.map(d => d[key]).filter(v => v != null);

    return {
        min: d3.min(values),
        max: d3.max(values),
        mean: d3.mean(values),
        median: d3.median(values),
        count: values.length
    };
}

// Deep clone an object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

console.log('Utils loaded');
