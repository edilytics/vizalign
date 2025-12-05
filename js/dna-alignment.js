// DNA Alignment Visualization Functions

// Zoom and pan state
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

// URL encoding/decoding functions
function encodeSequencesToURL(seq1, seq2, name1, name2) {
    const params = new URLSearchParams();
    if (seq1) params.set('seq1', seq1);
    if (seq2) params.set('seq2', seq2);
    if (name1) params.set('name1', name1);
    if (name2) params.set('name2', name2);
    return params.toString();
}

function decodeSequencesFromURL() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    const params = new URLSearchParams(hash);
    return {
        seq1: params.get('seq1') || '',
        seq2: params.get('seq2') || '',
        name1: params.get('name1') || '',
        name2: params.get('name2') || ''
    };
}

function updateURL(seq1, seq2, name1, name2) {
    const encoded = encodeSequencesToURL(seq1, seq2, name1, name2);
    if (encoded) {
        window.location.hash = encoded;
    } else {
        history.replaceState(null, null, ' ');
    }
}

// Normalize sequences (uppercase, remove whitespace and newlines)
function normalizeSequence(seq) {
    return seq.toUpperCase().replace(/\s+/g, '');
}

// Apply transform to alignment content
function applyTransform() {
    const content = document.getElementById('alignment-content');
    if (content) {
        content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }
}

// Reset zoom and pan
function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

// Render the DNA alignment visualization
function renderAlignment(seq1, seq2, name1, name2) {
    const container = document.getElementById('alignment-container');

    // Clear previous content
    container.innerHTML = '';

    // Normalize sequences
    seq1 = normalizeSequence(seq1);
    seq2 = normalizeSequence(seq2);

    // If both sequences are empty, show a message
    if (!seq1 && !seq2) {
        container.innerHTML = '<div class="empty-message">Enter DNA sequences above to see the alignment visualization</div>';
        return;
    }

    // Use default names if not provided
    const label1Text = name1 || 'Reference';
    const label2Text = name2 || 'Amplicon 1';

    // Make sequences the same length (pad shorter one with gaps)
    const maxLength = Math.max(seq1.length, seq2.length);
    // TODO add a warning if the lengths don't match
    seq1 = seq1.padEnd(maxLength, '-');
    seq2 = seq2.padEnd(maxLength, '-');

    // Create content wrapper for zoom/pan
    const content = document.createElement('div');
    content.id = 'alignment-content';

    // Create row for sequence 1
    const row1 = document.createElement('div');
    row1.className = 'alignment-row';

    const label1 = document.createElement('div');
    label1.className = 'alignment-label';
    label1.textContent = label1Text + ':';
    row1.appendChild(label1);

    const bases1 = document.createElement('div');
    bases1.style.display = 'flex';

    let pos1 = 0;
    for (let i = 0; i < seq1.length; i++) {
        const base = seq1[i];
        const position = base === '-' ? 'del' : pos1;
        const baseEl = createBaseElement(base, seq2[i], position);
        bases1.appendChild(baseEl);
        if (base !== '-') pos1++;
    }
    row1.appendChild(bases1);
    content.appendChild(row1);

    // Create row for sequence 2
    const row2 = document.createElement('div');
    row2.className = 'alignment-row';

    const label2 = document.createElement('div');
    label2.className = 'alignment-label';
    label2.textContent = label2Text + ':';
    row2.appendChild(label2);

    const bases2 = document.createElement('div');
    bases2.style.display = 'flex';

    let pos2 = 0;
    for (let i = 0; i < seq2.length; i++) {
        const base = seq2[i];
        const position = base === '-' ? 'del' : pos2;
        const baseEl = createBaseElement(base, seq1[i], position);
        bases2.appendChild(baseEl);
        if (base !== '-') pos2++;
    }
    row2.appendChild(bases2);
    content.appendChild(row2);

    container.appendChild(content);

    // Apply current zoom/pan state
    applyTransform();
}

// Create a base element with appropriate styling
function createBaseElement(base, oppositeBase, position) {
    const el = document.createElement('div');
    el.className = 'base';

    // Add tooltip with position
    el.title = `Position: ${position}`;

    if (base === '-') {
        el.classList.add('gap');
        el.textContent = '-';
    } else {
        el.classList.add(base);
        el.textContent = base;

        // Check if this is an insertion (opposite base is a gap)
        if (oppositeBase === '-') {
            el.classList.add('insertion');
        }
    }

    return el;
}

// Setup zoom and pan controls
function setupZoomPan() {
    const container = document.getElementById('alignment-container');

    // Mouse wheel zoom
    container.addEventListener('wheel', function(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = zoomLevel * delta;

        // Limit zoom range
        if (newZoom >= 0.5 && newZoom <= 10) {
            zoomLevel = newZoom;
            applyTransform();
        }
    }, { passive: false });

    // Mouse drag pan
    container.addEventListener('mousedown', function(e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartPanX = panX;
        dragStartPanY = panY;
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            panX = dragStartPanX + (e.clientX - dragStartX);
            panY = dragStartPanY + (e.clientY - dragStartY);
            applyTransform();
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // Reset zoom button
    const resetButton = document.getElementById('reset-zoom');
    resetButton.addEventListener('click', resetZoom);
}

// Initialize the DNA alignment tool
function initDNAAlignment() {
    const seq1Input = document.getElementById('seq1');
    const seq2Input = document.getElementById('seq2');
    const name1Input = document.getElementById('name1');
    const name2Input = document.getElementById('name2');

    // Load sequences from URL on page load
    const data = decodeSequencesFromURL();
    if (data.seq1 || data.seq2) {
        seq1Input.value = data.seq1;
        seq2Input.value = data.seq2;
        name1Input.value = data.name1;
        name2Input.value = data.name2;
        renderAlignment(data.seq1, data.seq2, data.name1, data.name2);
    }

    // Function to update everything
    function updateAll() {
        updateURL(seq1Input.value, seq2Input.value, name1Input.value, name2Input.value);
        renderAlignment(seq1Input.value, seq2Input.value, name1Input.value, name2Input.value);
    }

    // Add input event listeners for real-time updates
    seq1Input.addEventListener('input', updateAll);
    seq2Input.addEventListener('input', updateAll);
    name1Input.addEventListener('input', updateAll);
    name2Input.addEventListener('input', updateAll);

    // Handle browser back/forward navigation
    window.addEventListener('hashchange', function() {
        const data = decodeSequencesFromURL();
        seq1Input.value = data.seq1;
        seq2Input.value = data.seq2;
        name1Input.value = data.name1;
        name2Input.value = data.name2;
        renderAlignment(data.seq1, data.seq2, data.name1, data.name2);
    });

    // Setup zoom and pan
    setupZoomPan();

    console.log('DNA alignment tool initialized');
}
