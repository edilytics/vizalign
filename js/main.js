// Main application logic

function init() {
    console.log('VizAlign initialized');

    // Initialize DNA alignment tool
    initDNAAlignment();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
