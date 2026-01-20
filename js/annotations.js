// Annotations Management Functions

// Global annotations array
let annotations = [];

// Parse annotations from URL-encoded JSON string
function parseAnnotationsFromURL(annotationsParam) {
    if (!annotationsParam) return [];

    try {
        // URLSearchParams already decodes the value
        const parsed = JSON.parse(annotationsParam);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to parse annotations from URL:', e);
        return [];
    }
}

// Encode annotations to URL-safe JSON string
function encodeAnnotationsToURL(annotations) {
    if (!annotations || annotations.length === 0) return '';

    try {
        const json = JSON.stringify(annotations);
        return json; // Let URLSearchParams handle encoding
    } catch (e) {
        console.warn('Failed to encode annotations to URL:', e);
        return '';
    }
}

// Add a new annotation
function addAnnotation(seq, start, end, text) {
    if (!seq || start === undefined || end === undefined || !text) {
        return false;
    }

    // Validate positions
    start = parseInt(start);
    end = parseInt(end);

    if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
        alert('Invalid position range. End must be greater than or equal to start.');
        return false;
    }

    const annotation = {
        seq: seq,
        start: start,
        end: end,
        text: text.trim()
    };

    annotations.push(annotation);
    return true;
}

// Delete annotation by index
function deleteAnnotation(index) {
    if (index >= 0 && index < annotations.length) {
        annotations.splice(index, 1);
        return true;
    }
    return false;
}

// Render annotations list in the UI
function renderAnnotationsList() {
    const listContainer = document.getElementById('annotations-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (annotations.length === 0) {
        listContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">No annotations added yet</div>';
        return;
    }

    annotations.forEach((ann, index) => {
        const item = document.createElement('div');
        item.className = 'annotation-item';

        const seqLabel = ann.seq === 'seq1' ? 'Ref' : 'Amp';

        item.innerHTML = `
            <span class="annotation-badge ${ann.seq}">${seqLabel}</span>
            <span class="annotation-range">${ann.start}-${ann.end}</span>
            <span class="annotation-content">${ann.text}</span>
            <button class="annotation-delete" data-index="${index}">Delete</button>
        `;

        listContainer.appendChild(item);
    });

    // Add event listeners to delete buttons
    const deleteButtons = listContainer.querySelectorAll('.annotation-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteAnnotation(index);
            renderAnnotationsList();
            updateAnnotations();
        });
    });
}

// Check if two annotations overlap
function annotationsOverlap(ann1, ann2) {
    return !(ann1.end < ann2.start || ann2.end < ann1.start);
}

// Calculate stacking levels for overlapping annotations
function calculateStackingLevels(annotations, seq) {
    // Group annotations by sequence
    const seqAnnotations = annotations
        .map((ann, index) => ({ ...ann, originalIndex: index }))
        .filter(ann => ann.seq === seq);

    // Sort by start position
    seqAnnotations.sort((a, b) => a.start - b.start);

    // Assign levels to avoid overlaps
    const levels = new Array(seqAnnotations.length).fill(0);

    for (let i = 0; i < seqAnnotations.length; i++) {
        let level = 0;
        let overlaps = true;

        // Keep trying levels until we find one without overlap
        while (overlaps) {
            overlaps = false;

            // Check if this level is occupied by any previous annotation at this position
            for (let j = 0; j < i; j++) {
                if (levels[j] === level && annotationsOverlap(seqAnnotations[i], seqAnnotations[j])) {
                    overlaps = true;
                    break;
                }
            }

            if (overlaps) {
                level++;
            }
        }

        levels[i] = level;
    }

    // Create a map from original index to level
    const levelMap = {};
    seqAnnotations.forEach((ann, i) => {
        levelMap[ann.originalIndex] = levels[i];
    });

    return levelMap;
}

// Render annotation markers in the visualization
function renderAnnotationMarkers(seq1, seq2) {
    console.log('renderAnnotationMarkers called', annotations.length, 'annotations');

    const content = document.getElementById('alignment-content');
    if (!content) {
        console.warn('alignment-content not found');
        return;
    }

    // Remove existing annotation markers
    const existingMarkers = content.querySelectorAll('.annotation-marker');
    existingMarkers.forEach(marker => marker.remove());

    if (annotations.length === 0) {
        console.log('No annotations to render');
        return;
    }

    const rows = content.querySelectorAll('.alignment-row');
    if (rows.length < 2) {
        console.warn('Not enough alignment rows found:', rows.length);
        return;
    }

    const row1 = rows[0]; // Reference sequence row
    const row2 = rows[1]; // Amplicon sequence row

    // Normalize sequences
    seq1 = seq1.toUpperCase().replace(/\s+/g, '');
    seq2 = seq2.toUpperCase().replace(/\s+/g, '');

    // Calculate stacking levels for each sequence
    const seq1Levels = calculateStackingLevels(annotations, 'seq1');
    const seq2Levels = calculateStackingLevels(annotations, 'seq2');

    console.log('Rendering', annotations.length, 'annotation markers with stacking');

    annotations.forEach((ann, index) => {
        const targetRow = ann.seq === 'seq1' ? row1 : row2;
        const targetSeq = ann.seq === 'seq1' ? seq1 : seq2;
        const level = ann.seq === 'seq1' ? (seq1Levels[index] || 0) : (seq2Levels[index] || 0);

        console.log('Rendering annotation', index, ann, 'at level', level);
        addAnnotationMarkerToRow(targetRow, targetSeq, ann, index, level);
    });
}

// Add a single annotation marker to a row
function addAnnotationMarkerToRow(row, sequence, annotation, index, level = 0) {
    const bases = row.querySelector('div[style*="display: flex"]');
    if (!bases) {
        console.warn('Bases container not found in row');
        return;
    }

    console.log('Adding marker for annotation:', annotation, 'sequence length:', sequence.length, 'level:', level);

    // Map positions from ungapped to gapped (aligned) sequence
    const alignedStart = mapPositionToAligned(annotation.start, sequence);
    const alignedEnd = mapPositionToAligned(annotation.end, sequence);

    console.log('Mapped positions - start:', alignedStart, 'end:', alignedEnd);

    if (alignedStart === -1) {
        console.warn('Start position', annotation.start, 'not found in sequence');
        return;
    }

    if (alignedEnd === -1) {
        console.warn('End position', annotation.end, 'not found in sequence');
        return;
    }

    if (!bases.children[alignedStart]) {
        console.warn('Start position', alignedStart, 'not found in bases (total:', bases.children.length, ')');
        return;
    }

    if (!bases.children[alignedEnd]) {
        console.warn('End position', alignedEnd, 'not found in bases (total:', bases.children.length, ')');
        return;
    }

    const firstBase = bases.children[alignedStart];
    const lastBase = bases.children[alignedEnd];

    // Create marker
    const marker = document.createElement('div');
    marker.className = `annotation-marker ${annotation.seq}`;
    marker.title = annotation.text;
    marker.setAttribute('data-level', level);

    // Calculate position and width using actual DOM positions
    // This automatically accounts for gaps in the sequence
    const baseWidth = 30;
    const leftPos = firstBase.offsetLeft;
    const width = lastBase.offsetLeft - firstBase.offsetLeft + baseWidth;

    marker.style.left = leftPos + 'px';
    marker.style.width = width + 'px';

    // Ensure marker uses absolute positioning
    marker.style.position = 'absolute';
    marker.style.zIndex = String(10 + level); // Higher levels on top

    // Adjust vertical position based on stacking level
    // Each level needs 14px (10px marker + 4px gap)
    const markerHeight = 14;
    const baseOffset = 20; // Base distance from the sequence

    if (annotation.seq === 'seq1') {
        // Stack upward for seq1 (above) - negative values
        const topOffset = -(baseOffset + (level * markerHeight));
        marker.style.top = `${topOffset}px`;
        marker.style.bottom = 'auto';
        console.log('seq1 marker top:', topOffset);
    } else {
        // Stack downward for seq2 (below) - negative values
        const bottomOffset = -(baseOffset + (level * markerHeight));
        marker.style.bottom = `${bottomOffset}px`;
        marker.style.top = 'auto';
        console.log('seq2 marker bottom:', bottomOffset);
    }

    console.log('Marker style - left:', leftPos, 'width:', width, 'level:', level, 'offset:', (baseOffset + (level * markerHeight)));

    // Create label (tooltip)
    const label = document.createElement('div');
    label.className = `annotation-label ${annotation.seq}`;
    label.textContent = annotation.text;

    marker.appendChild(label);

    // Add marker to the bases container
    bases.style.position = 'relative';
    bases.appendChild(marker);

    console.log('Marker added to DOM');
}

// Helper function to map position (same as in sgrna-alignment.js)
function mapPositionToAligned(position, sequence) {
    let noGapPos = 0;

    for (let i = 0; i < sequence.length; i++) {
        if (sequence[i] !== '-') {
            if (noGapPos === position) {
                return i;
            }
            noGapPos++;
        }
    }

    // Position not found - it's beyond the end of the sequence
    // Return -1 to indicate invalid position
    return -1;
}

// Update annotations and trigger re-render
function updateAnnotations() {
    console.log('updateAnnotations called');

    const seq1Input = document.getElementById('seq1');
    const seq2Input = document.getElementById('seq2');
    const name1Input = document.getElementById('name1');
    const name2Input = document.getElementById('name2');
    const sgRNAsInput = document.getElementById('sgrnas');
    const cutSiteInput = document.getElementById('cut-site');
    const scoreCutoffInput = document.getElementById('score-cutoff');

    if (!seq1Input || !seq2Input) {
        console.warn('Sequence inputs not found');
        return;
    }

    const sgRNAs = sgRNAsInput ? sgRNAsInput.value : '';
    const cutSite = cutSiteInput ? parseInt(cutSiteInput.value) : -3;
    const scoreCutoff = scoreCutoffInput ? parseFloat(scoreCutoffInput.value) : 80;

    // Update URL with annotations
    if (window.updateURL) {
        console.log('Updating URL with annotations:', annotations);
        window.updateURL(
            seq1Input.value,
            seq2Input.value,
            name1Input.value ? name1Input.value : '',
            name2Input.value ? name2Input.value : '',
            sgRNAs,
            cutSite,
            scoreCutoff,
            annotations
        );
    }

    // Re-render markers
    const seq1 = seq1Input.value;
    const seq2 = seq2Input.value;

    console.log('Re-rendering markers for sequences:', seq1.length, seq2.length);

    // Need to wait for the alignment to be rendered first
    setTimeout(() => {
        renderAnnotationMarkers(seq1, seq2);
    }, 100);
}

// Initialize annotations system
function initAnnotations() {
    const addButton = document.getElementById('add-annotation');
    const seqSelect = document.getElementById('annotation-seq');
    const startInput = document.getElementById('annotation-start');
    const endInput = document.getElementById('annotation-end');
    const textInput = document.getElementById('annotation-text');

    if (!addButton) return;

    // Add annotation button click handler
    addButton.addEventListener('click', function() {
        const seq = seqSelect.value;
        const start = startInput.value;
        const end = endInput.value;
        const text = textInput.value;

        if (addAnnotation(seq, start, end, text)) {
            // Clear inputs
            startInput.value = '';
            endInput.value = '';
            textInput.value = '';

            // Update UI
            renderAnnotationsList();
            updateAnnotations();
        }
    });

    // Allow Enter key in text input to add annotation
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });

    // Initial render
    renderAnnotationsList();
}

// Load annotations from URL
function loadAnnotationsFromURL(annotationsParam) {
    annotations = parseAnnotationsFromURL(annotationsParam);
    renderAnnotationsList();
}

// Get current annotations array
function getAnnotations() {
    return annotations;
}

// Export functions to global scope for integration
window.initAnnotations = initAnnotations;
window.loadAnnotationsFromURL = loadAnnotationsFromURL;
window.renderAnnotationMarkers = renderAnnotationMarkers;
window.encodeAnnotationsToURL = encodeAnnotationsToURL;
window.getAnnotations = getAnnotations;

// Make annotations accessible via getter
Object.defineProperty(window, 'annotations', {
    get: function() {
        return annotations;
    }
});
