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

// Navigation slider state
let contentWidth = 0;
let containerWidth = 0;
let isSliderDragging = false;
let sliderDragStartX = 0;
let sliderDragStartPanX = 0;

// URL encoding/decoding functions
function encodeSequencesToURL(seq1, seq2, name1, name2, sgRNAs, cutSite, scoreCutoff, annotations) {
    const parts = [];
    if (seq1) parts.push('seq1=' + encodeURIComponent(seq1));
    if (seq2) parts.push('seq2=' + encodeURIComponent(seq2));
    if (name1) parts.push('name1=' + encodeURIComponent(name1));
    if (name2) parts.push('name2=' + encodeURIComponent(name2));
    if (sgRNAs) parts.push('sgRNAs=' + encodeURIComponent(sgRNAs));
    if (cutSite !== undefined && cutSite !== null) parts.push('cutSite=' + encodeURIComponent(cutSite));
    if (scoreCutoff !== undefined && scoreCutoff !== null) parts.push('scoreCutoff=' + encodeURIComponent(scoreCutoff));
    if (annotations && annotations.length > 0) {
        const json = JSON.stringify(annotations);
        parts.push('annotations=' + encodeURIComponent(json));
    }
    return parts.join('&');
}

function decodeSequencesFromURL() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    const params = new URLSearchParams(hash);
    return {
        seq1: params.get('seq1') || '',
        seq2: params.get('seq2') || '',
        name1: params.get('name1') || '',
        name2: params.get('name2') || '',
        sgRNAs: params.get('sgRNAs') || '',
        cutSite: params.get('cutSite') !== null ? parseInt(params.get('cutSite')) : -3,
        scoreCutoff: params.get('scoreCutoff') !== null ? parseFloat(params.get('scoreCutoff')) : 80,
        annotations: params.get('annotations') || ''
    };
}

function updateURL(seq1, seq2, name1, name2, sgRNAs, cutSite, scoreCutoff, annotations) {
    const encoded = encodeSequencesToURL(seq1, seq2, name1, name2, sgRNAs, cutSite, scoreCutoff, annotations);
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
    updateNavigationSlider();
}

// Update the navigation slider position indicator
function updateNavigationSlider() {
    const container = document.getElementById('alignment-container');
    const content = document.getElementById('alignment-content');
    const sliderViewport = document.getElementById('slider-viewport');
    const sliderTrack = document.getElementById('slider-track');

    if (!container || !content || !sliderViewport || !sliderTrack) return;

    // Calculate content and container dimensions
    containerWidth = container.offsetWidth;
    const contentElement = content.querySelector('.alignment-row');
    if (!contentElement) return;

    contentWidth = contentElement.scrollWidth * zoomLevel;

    // Add animating class if not currently dragging
    if (!isDragging && !isSliderDragging) {
        sliderViewport.classList.add('animating');
    } else {
        sliderViewport.classList.remove('animating');
    }

    // If content fits entirely, center the indicator
    if (contentWidth <= containerWidth) {
        sliderViewport.style.left = '50%';
        return;
    }

    // Calculate position as percentage
    const maxPanX = 0;
    const minPanX = containerWidth - contentWidth;
    const panRange = maxPanX - minPanX;

    // Convert panX to percentage (0-100)
    let percentage;
    if (panRange !== 0) {
        percentage = ((maxPanX - panX) / panRange) * 100;
    } else {
        percentage = 0;
    }

    // Clamp percentage
    percentage = Math.max(0, Math.min(100, percentage));

    sliderViewport.style.left = percentage + '%';
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

    // Add position ruler for sequence 1
    const ruler1 = createPositionRuler(seq1, label1Text + ' pos:');
    content.appendChild(ruler1);

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

    // Add position ruler for sequence 2
    const ruler2 = createPositionRuler(seq2, label2Text + ' pos:');
    content.appendChild(ruler2);

    container.appendChild(content);

    // Apply current zoom/pan state
    applyTransform();

    // Update slider after DOM has rendered
    setTimeout(updateNavigationSlider, 0);
}

// Create a position ruler row for a specific sequence
function createPositionRuler(seq, labelText) {
    const row = document.createElement('div');
    row.className = 'position-ruler';

    // Add label
    const label = document.createElement('div');
    label.className = 'alignment-label position-label';
    label.textContent = labelText;
    row.appendChild(label);

    // Create ruler content
    const rulerContent = document.createElement('div');
    rulerContent.style.display = 'flex';

    let position = 0;
    for (let i = 0; i < seq.length; i++) {
        const posEl = document.createElement('div');
        posEl.className = 'position-marker';

        const base = seq[i];

        // If it's a gap, show nothing
        if (base === '-') {
            // Empty marker for gaps
        } else {
            // Show position number every 10 bases (0-indexed)
            if (position % 10 === 0) {
                posEl.textContent = position;
            } else if (position % 5 === 0) {
                // Show a tick mark at 5s
                posEl.textContent = '|';
                posEl.classList.add('tick');
            }
            position++;
        }

        rulerContent.appendChild(posEl);
    }

    row.appendChild(rulerContent);
    return row;
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

    // Mouse wheel zoom - zoom centered on mouse position
    container.addEventListener('wheel', function(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = zoomLevel * delta;

        // Limit zoom range
        if (newZoom >= 0.5 && newZoom <= 4) {
            // Get mouse position relative to container
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate the point in content space before zoom
            const contentX = (mouseX - panX) / zoomLevel;
            const contentY = (mouseY - panY) / zoomLevel;

            // Apply new zoom
            zoomLevel = newZoom;

            // Adjust pan to keep the same content point under the mouse
            panX = mouseX - (contentX * zoomLevel);
            panY = mouseY - (contentY * zoomLevel);

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

// Setup navigation slider controls
function setupNavigationSlider() {
    const sliderTrack = document.getElementById('slider-track');
    const sliderViewport = document.getElementById('slider-viewport');

    if (!sliderTrack || !sliderViewport) return;

    // Helper function to set position from percentage
    function setPanFromPercentage(percentage) {
        // Clamp percentage
        percentage = Math.max(0, Math.min(100, percentage));

        const container = document.getElementById('alignment-container');
        const content = document.getElementById('alignment-content');
        if (!container || !content) return;

        const contentElement = content.querySelector('.alignment-row');
        if (!contentElement) return;

        const currentContentWidth = contentElement.scrollWidth * zoomLevel;
        const currentContainerWidth = container.offsetWidth;

        if (currentContentWidth <= currentContainerWidth) {
            panX = 0;
        } else {
            const maxPanX = 0;
            const minPanX = currentContainerWidth - currentContentWidth;
            const panRange = maxPanX - minPanX;

            // Convert percentage to panX value
            panX = maxPanX - (percentage / 100) * panRange;

            // Clamp panX
            panX = Math.max(minPanX, Math.min(maxPanX, panX));
        }

        applyTransform();
    }

    // Click on track to jump to position
    sliderTrack.addEventListener('mousedown', function(e) {
        if (e.target === sliderTrack) {
            const rect = sliderTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = (clickX / rect.width) * 100;

            setPanFromPercentage(percentage);
        }
    });

    // Drag viewport indicator
    sliderViewport.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        isSliderDragging = true;
        sliderDragStartX = e.clientX;
        sliderDragStartPanX = panX;
    });

    document.addEventListener('mousemove', function(e) {
        if (isSliderDragging) {
            const sliderTrack = document.getElementById('slider-track');
            const rect = sliderTrack.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const percentage = (currentX / rect.width) * 100;

            setPanFromPercentage(percentage);
        }
    });

    document.addEventListener('mouseup', function() {
        isSliderDragging = false;
    });
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

        // Populate sgRNA fields if they exist
        const sgRNAsInput = document.getElementById('sgrnas');
        const cutSiteInput = document.getElementById('cut-site');
        const scoreCutoffInput = document.getElementById('score-cutoff');

        if (sgRNAsInput && data.sgRNAs) {
            sgRNAsInput.value = data.sgRNAs;
        }
        if (cutSiteInput) {
            cutSiteInput.value = data.cutSite;
        }
        if (scoreCutoffInput) {
            scoreCutoffInput.value = data.scoreCutoff;
        }

        // Load annotations from URL
        if (data.annotations && window.loadAnnotationsFromURL) {
            loadAnnotationsFromURL(data.annotations);
        }

        // Check if sequences need alignment (no gaps present)
        const seq1Clean = data.seq1.toUpperCase().replace(/\s+/g, '');
        const seq2Clean = data.seq2.toUpperCase().replace(/\s+/g, '');
        const needsAlignment = seq1Clean && seq2Clean &&
                               !seq1Clean.includes('-') && !seq2Clean.includes('-');

        if (needsAlignment) {
            // Auto-align on page load
            console.log('Auto-aligning sequences on page load...');
            setTimeout(() => {
                performAlignment();
            }, 100);
        } else {
            // Already aligned, just render
            renderAlignment(data.seq1, data.seq2, data.name1, data.name2);

            // Perform sgRNA alignment if sgRNAs are provided
            if (data.sgRNAs && window.performsgRNAAlignment) {
                performsgRNAAlignment(data.seq1, data.seq2, data.sgRNAs, data.cutSite, data.scoreCutoff);
            }

            // Render annotations if available
            if (window.renderAnnotationMarkers) {
                renderAnnotationMarkers(data.seq1, data.seq2);
            }
        }
    }

    // Initialize annotations system
    if (window.initAnnotations) {
        initAnnotations();
    }

    // Debounce timer for automatic alignment
    let alignmentTimer = null;

    // Function to update everything
    function updateAll() {
        const sgRNAsInput = document.getElementById('sgrnas');
        const cutSiteInput = document.getElementById('cut-site');
        const scoreCutoffInput = document.getElementById('score-cutoff');

        const sgRNAs = sgRNAsInput ? sgRNAsInput.value : '';
        const cutSite = cutSiteInput ? parseInt(cutSiteInput.value) : -3;
        const scoreCutoff = scoreCutoffInput ? parseFloat(scoreCutoffInput.value) : 80;

        updateURL(seq1Input.value, seq2Input.value, name1Input.value, name2Input.value, sgRNAs, cutSite, scoreCutoff, window.annotations || []);
        renderAlignment(seq1Input.value, seq2Input.value, name1Input.value, name2Input.value);

        // Perform sgRNA alignment if sgRNAs are provided
        if (sgRNAs && window.performsgRNAAlignment) {
            performsgRNAAlignment(seq1Input.value, seq2Input.value, sgRNAs, cutSite, scoreCutoff);
        }

        // Render annotations if available
        if (window.renderAnnotationMarkers) {
            renderAnnotationMarkers(seq1Input.value, seq2Input.value);
        }
    }

    // Function to trigger automatic alignment with debouncing
    function triggerAutoAlignment() {
        // Clear any existing timer
        if (alignmentTimer) {
            clearTimeout(alignmentTimer);
        }

        // Set a new timer to align after 1 second of no typing
        alignmentTimer = setTimeout(() => {
            const seq1 = seq1Input.value.toUpperCase().replace(/\s+/g, '');
            const seq2 = seq2Input.value.toUpperCase().replace(/\s+/g, '');

            // Only auto-align if both sequences have content and no gaps
            if (seq1 && seq2 && seq1.length > 0 && seq2.length > 0 &&
                !seq1.includes('-') && !seq2.includes('-')) {
                console.log('Auto-aligning sequences...');
                performAlignment();
            }
        }, 1000); // Wait 1 second after user stops typing
    }

    // Add input event listeners for real-time updates and auto-alignment
    seq1Input.addEventListener('input', function() {
        updateAll();
        triggerAutoAlignment();
    });
    seq2Input.addEventListener('input', function() {
        updateAll();
        triggerAutoAlignment();
    });
    name1Input.addEventListener('input', updateAll);
    name2Input.addEventListener('input', updateAll);

    // Add sgRNA input event listeners
    const sgRNAsInput = document.getElementById('sgrnas');
    const cutSiteInput = document.getElementById('cut-site');
    const scoreCutoffInput = document.getElementById('score-cutoff');

    if (sgRNAsInput) {
        sgRNAsInput.addEventListener('input', updateAll);
    }
    if (cutSiteInput) {
        cutSiteInput.addEventListener('input', updateAll);
    }
    if (scoreCutoffInput) {
        scoreCutoffInput.addEventListener('input', updateAll);
    }

    // Handle browser back/forward navigation
    window.addEventListener('hashchange', function() {
        const data = decodeSequencesFromURL();
        seq1Input.value = data.seq1;
        seq2Input.value = data.seq2;
        name1Input.value = data.name1;
        name2Input.value = data.name2;

        // Update sgRNA fields
        const sgRNAsInput = document.getElementById('sgrnas');
        const cutSiteInput = document.getElementById('cut-site');
        const scoreCutoffInput = document.getElementById('score-cutoff');

        if (sgRNAsInput) {
            sgRNAsInput.value = data.sgRNAs || '';
        }
        if (cutSiteInput) {
            cutSiteInput.value = data.cutSite;
        }
        if (scoreCutoffInput) {
            scoreCutoffInput.value = data.scoreCutoff;
        }

        // Load annotations from URL
        if (data.annotations && window.loadAnnotationsFromURL) {
            loadAnnotationsFromURL(data.annotations);
        }

        renderAlignment(data.seq1, data.seq2, data.name1, data.name2);

        // Perform sgRNA alignment if sgRNAs are provided
        if (data.sgRNAs && window.performsgRNAAlignment) {
            performsgRNAAlignment(data.seq1, data.seq2, data.sgRNAs, data.cutSite, data.scoreCutoff);
        }

        // Render annotations if available
        if (window.renderAnnotationMarkers) {
            renderAnnotationMarkers(data.seq1, data.seq2);
        }
    });

    // Setup zoom and pan
    setupZoomPan();

    // Setup navigation slider
    setupNavigationSlider();

    // Update slider on window resize
    window.addEventListener('resize', function() {
        updateNavigationSlider();
    });

    // Setup collapsible controls section
    const toggleButton = document.getElementById('toggle-controls');
    const controlsContent = document.getElementById('sequence-inputs');
    const sectionHeader = document.querySelector('#controls .section-header');

    if (sectionHeader && toggleButton && controlsContent) {
        sectionHeader.addEventListener('click', function() {
            controlsContent.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
        });
    }

    console.log('DNA alignment tool initialized with automatic alignment');
}

// Perform sequence alignment using the JavaScript implementation
function performAlignment() {
    const seq1Input = document.getElementById('seq1');
    const seq2Input = document.getElementById('seq2');
    const name1Input = document.getElementById('name1');
    const name2Input = document.getElementById('name2');
    const alignButton = document.getElementById('align-button');

    // Get raw sequences (without normalization to preserve user input)
    let seqI = seq1Input.value.toUpperCase().replace(/\s+/g, ''); // Reference
    let seqJ = seq2Input.value.toUpperCase().replace(/\s+/g, ''); // Query

    if (!seqI || !seqJ) {
        alert('Please enter both sequences before aligning.');
        return;
    }

    // Disable button during alignment
    if (alignButton) {
        alignButton.disabled = true;
        alignButton.textContent = 'Aligning...';
    }

    try {
        // Create scoring matrix (matches EDNAFULL defaults from Cython)
        const matrix = makeMatrix(5, -4, -2, -1); // match, mismatch, n-mismatch, n-match

        // Create gap incentive array (uniform, no special cut sites)
        const gapIncentive = new Int32Array(seqI.length + 1);
        gapIncentive.fill(0);

        // Perform global alignment with Cython default parameters
        // gap_open=-1, gap_extend=-1 (matches crispresso_align.pyx defaults)
        const result = globalAlign(seqJ, seqI, matrix, gapIncentive, -1, -1);

        console.log('Alignment complete:', result);
        console.log('Match percentage:', result.matchPercentage + '%');

        // Update the textareas with aligned sequences
        seq1Input.value = result.alignedSeqI;
        seq2Input.value = result.alignedSeqJ;

        // Get sgRNA parameters for URL update
        const sgRNAsInput = document.getElementById('sgrnas');
        const cutSiteInput = document.getElementById('cut-site');
        const scoreCutoffInput = document.getElementById('score-cutoff');

        const sgRNAs = sgRNAsInput ? sgRNAsInput.value : '';
        const cutSite = cutSiteInput ? parseInt(cutSiteInput.value) : -3;
        const scoreCutoff = scoreCutoffInput ? parseFloat(scoreCutoffInput.value) : 80;

        // Update URL and render
        updateURL(result.alignedSeqI, result.alignedSeqJ, name1Input.value, name2Input.value, sgRNAs, cutSite, scoreCutoff, window.annotations || []);
        renderAlignment(result.alignedSeqI, result.alignedSeqJ, name1Input.value, name2Input.value);

        // Perform sgRNA alignment if sgRNAs are provided
        if (sgRNAs && window.performsgRNAAlignment) {
            performsgRNAAlignment(result.alignedSeqI, result.alignedSeqJ, sgRNAs, cutSite, scoreCutoff);
        }

        // Render annotations if available
        if (window.renderAnnotationMarkers) {
            renderAnnotationMarkers(result.alignedSeqI, result.alignedSeqJ);
        }

        // Show success message
        console.log(`Alignment successful! Match: ${result.matchPercentage}%`);

    } catch (error) {
        console.error('Alignment error:', error);
        alert('Error during alignment: ' + error.message);
    } finally {
        // Re-enable button
        if (alignButton) {
            alignButton.disabled = false;
            alignButton.textContent = 'Align Sequences';
        }
    }
}
