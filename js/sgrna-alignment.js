// sgRNA Alignment Functions

// Color palette for multiple sgRNAs
const sgRNAColors = [
    '#4ecdc4', // Teal
    '#45b7d1', // Blue
    '#f7b731', // Yellow
    '#5f27cd', // Purple
    '#00d2d3', // Cyan
    '#ff9ff3', // Pink
    '#ff6b6b', // Red
    '#54a0ff', // Light blue
];

// Get reverse complement of a DNA sequence
function getReverseComplement(seq) {
    const complement = {
        'A': 'T', 'T': 'A',
        'C': 'G', 'G': 'C',
        'N': 'N', '-': '-'
    };
    return seq.split('').reverse()
              .map(base => complement[base.toUpperCase()] || 'N')
              .join('');
}

// Parse comma-separated sgRNA input
function parsesgRNAs(sgRNAsText) {
    if (!sgRNAsText || !sgRNAsText.trim()) {
        return [];
    }

    return sgRNAsText.split(',')
        .map(sgRNA => sgRNA.trim().toUpperCase())
        .filter(sgRNA => sgRNA.length > 0)
        .filter(sgRNA => /^[ATCGN]+$/.test(sgRNA)); // Only valid DNA characters
}

// Score match between sgRNA and target window (simple percentage)
function scoresgRNAMatch(sgRNA, targetWindow) {
    if (sgRNA.length !== targetWindow.length) {
        return 0;
    }

    let matches = 0;
    for (let i = 0; i < sgRNA.length; i++) {
        if (sgRNA[i] === targetWindow[i] || sgRNA[i] === 'N' || targetWindow[i] === 'N') {
            matches++;
        }
    }

    return (matches / sgRNA.length) * 100;
}

// Find best match for sgRNA in target sequence (sliding window)
function findsgRNAInSequence(sgRNA, targetSeq) {
    // Remove gaps from target sequence for alignment
    const targetNoGaps = targetSeq.replace(/-/g, '');

    if (sgRNA.length > targetNoGaps.length) {
        return {
            found: false,
            position: -1,
            score: 0,
            strand: '+',
            cutSite: -1
        };
    }

    let bestScore = 0;
    let bestPos = -1;
    let bestStrand = '+';

    // Try forward strand
    for (let i = 0; i <= targetNoGaps.length - sgRNA.length; i++) {
        const window = targetNoGaps.substr(i, sgRNA.length);
        const score = scoresgRNAMatch(sgRNA, window);

        if (score > bestScore) {
            bestScore = score;
            bestPos = i;
            bestStrand = '+';
        }
    }

    // Try reverse complement
    const sgRNArc = getReverseComplement(sgRNA);
    for (let i = 0; i <= targetNoGaps.length - sgRNArc.length; i++) {
        const window = targetNoGaps.substr(i, sgRNArc.length);
        const score = scoresgRNAMatch(sgRNArc, window);

        if (score > bestScore) {
            bestScore = score;
            bestPos = i;
            bestStrand = '-';
        }
    }

    return {
        found: bestScore > 0,
        position: bestPos,
        positionEnd: bestPos + sgRNA.length - 1,
        score: bestScore,
        strand: bestStrand
    };
}

// Calculate cut site position
// For an sgRNA like AATGGC with cutSiteOffset=-3, cut site should be at AAT|GGC
// Position is the index BEFORE which the cut occurs (i.e., between bases)
// Negative offset means INSIDE the sgRNA, counting back from the 3' end
function calculateCutSite(alignmentPos, sgRNALength, cutSiteOffset, isReverseStrand) {
    if (isReverseStrand) {
        // For reverse strand (3'----5'), the 3' end is at the LEFT (start position)
        // Cut site is distanceFromEnd bases to the RIGHT of the start
        // Example: sgRNA at 10-25, cutSiteOffset=-3, cut at position 13
        return alignmentPos - cutSiteOffset;
    } else {
        // For forward strand (5'----3'), the 3' end is at the RIGHT (end position)
        // Cut site is distanceFromEnd bases to the LEFT of the end
        // Example: sgRNA AATGGC at 0-5, cutSiteOffset=-3, cut at position 3
        // Position 3 = 0 + 6 - 3 = 3 (AAT|GGC)
        return alignmentPos + sgRNALength + cutSiteOffset;
    }
}

// Align all sgRNAs to both sequences
function alignAllsgRNAs(seq1, seq2, sgRNAsText, cutSiteOffset, scoreCutoff) {
    const sgRNAs = parsesgRNAs(sgRNAsText);

    if (sgRNAs.length === 0) {
        return [];
    }

    // Normalize sequences
    seq1 = seq1.toUpperCase().replace(/\s+/g, '');
    seq2 = seq2.toUpperCase().replace(/\s+/g, '');

    const results = [];

    for (let i = 0; i < sgRNAs.length; i++) {
        const sgRNA = sgRNAs[i];

        // Align to sequence 1
        const match1 = findsgRNAInSequence(sgRNA, seq1);
        let seq1Result = null;

        if (match1.found) {
            const cutSite1 = calculateCutSite(
                match1.position,
                sgRNA.length,
                cutSiteOffset,
                match1.strand === '-'
            );

            seq1Result = {
                position: match1.position,
                positionEnd: match1.positionEnd,
                score: match1.score,
                strand: match1.strand,
                cutSite: cutSite1,
                passes: match1.score >= scoreCutoff
            };
        }

        // Align to sequence 2
        const match2 = findsgRNAInSequence(sgRNA, seq2);
        let seq2Result = null;

        if (match2.found) {
            const cutSite2 = calculateCutSite(
                match2.position,
                sgRNA.length,
                cutSiteOffset,
                match2.strand === '-'
            );

            seq2Result = {
                position: match2.position,
                positionEnd: match2.positionEnd,
                score: match2.score,
                strand: match2.strand,
                cutSite: cutSite2,
                passes: match2.score >= scoreCutoff
            };
        }

        results.push({
            sgRNA: sgRNA,
            index: i,
            color: sgRNAColors[i % sgRNAColors.length],
            seq1Match: seq1Result,
            seq2Match: seq2Result
        });
    }

    return results;
}

// Convert position in sequence without gaps to position in aligned sequence with gaps
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

// Render sgRNA results in sidebar
function rendersgRNASidebar(results) {
    const sidebar = document.getElementById('sgrna-results');
    const content = document.getElementById('sgrna-results-content');

    if (!sidebar || !content) {
        console.warn('sgRNA sidebar elements not found');
        return;
    }

    // Clear previous content
    content.innerHTML = '';

    if (results.length === 0) {
        sidebar.classList.add('hidden');
        return;
    }

    // Show sidebar
    sidebar.classList.remove('hidden');

    // Render each sgRNA result
    for (const result of results) {
        const card = document.createElement('div');
        card.className = 'sgrna-result-card';
        card.style.borderLeftColor = result.color;

        // sgRNA header
        const header = document.createElement('div');
        header.className = 'sgrna-header';
        header.innerHTML = `
            <span class="sgrna-name">sgRNA ${result.index + 1}</span>
            <span class="sgrna-sequence">${result.sgRNA}</span>
        `;
        card.appendChild(header);

        // Sequence 1 match
        const match1Div = document.createElement('div');
        match1Div.className = 'sgrna-match';

        if (result.seq1Match) {
            const m = result.seq1Match;
            const statusClass = m.passes ? 'match-pass' : 'match-fail';
            const statusIcon = m.passes ? '✓' : '✗';
            const statusText = m.passes ? 'Pass' : 'Below cutoff';

            match1Div.innerHTML = `
                <div class="match-label">Reference:</div>
                <div class="match-details">
                    <span class="${statusClass}">${statusIcon} ${m.score.toFixed(1)}%</span>
                    <span class="match-position">pos ${m.position}-${m.positionEnd}</span>
                    <span class="match-strand">(${m.strand})</span>
                </div>
                <div class="match-info">Cut site: ${m.cutSite - 1}</div>
                ${!m.passes ? `<div class="match-warning">${statusText}</div>` : ''}
            `;
        } else {
            match1Div.innerHTML = `
                <div class="match-label">Reference:</div>
                <div class="match-details match-fail">Not found</div>
            `;
        }
        card.appendChild(match1Div);

        // Sequence 2 match
        const match2Div = document.createElement('div');
        match2Div.className = 'sgrna-match';

        if (result.seq2Match) {
            const m = result.seq2Match;
            const statusClass = m.passes ? 'match-pass' : 'match-fail';
            const statusIcon = m.passes ? '✓' : '✗';
            const statusText = m.passes ? 'Pass' : 'Below cutoff';

            match2Div.innerHTML = `
                <div class="match-label">Amplicon 1:</div>
                <div class="match-details">
                    <span class="${statusClass}">${statusIcon} ${m.score.toFixed(1)}%</span>
                    <span class="match-position">pos ${m.position}-${m.positionEnd}</span>
                    <span class="match-strand">(${m.strand})</span>
                </div>
                <div class="match-info">Cut site: ${m.cutSite - 1}</div>
                ${!m.passes ? `<div class="match-warning">${statusText}</div>` : ''}
            `;
        } else {
            match2Div.innerHTML = `
                <div class="match-label">Amplicon 1:</div>
                <div class="match-details match-fail">Not found</div>
            `;
        }
        card.appendChild(match2Div);

        content.appendChild(card);
    }
}

// Get mismatches between sgRNA and target sequence
function getMismatches(sgRNA, targetSeq, startPos, isReverseStrand) {
    const mismatches = [];
    const effectivesgRNA = isReverseStrand ? getReverseComplement(sgRNA) : sgRNA;
    const targetNoGaps = targetSeq.replace(/-/g, '');

    for (let i = 0; i < effectivesgRNA.length; i++) {
        const targetBase = targetNoGaps[startPos + i];
        const sgRNABase = effectivesgRNA[i];

        if (targetBase !== sgRNABase && sgRNABase !== 'N' && targetBase !== 'N') {
            mismatches.push(i); // Position within sgRNA
        }
    }

    return mismatches;
}

// Add cut site markers to the alignment visualization
function addCutSiteMarkers(results, seq1, seq2) {
    const content = document.getElementById('alignment-content');
    if (!content) return;

    // Remove existing markers and rectangles
    const existingMarkers = content.querySelectorAll('.cut-site-marker, .sgrna-alignment-rectangle, .sgrna-mismatch');
    existingMarkers.forEach(marker => marker.remove());

    if (results.length === 0) return;

    const rows = content.querySelectorAll('.alignment-row');
    if (rows.length < 2) return;

    const row1 = rows[0]; // Reference sequence row
    const row2 = rows[1]; // Amplicon sequence row

    // Add markers and rectangles for each sgRNA
    for (const result of results) {
        // Add marker and rectangle for sequence 1 (reference)
        if (result.seq1Match && result.seq1Match.passes) {
            const cutSitePos = result.seq1Match.cutSite;
            const alignedPos = mapPositionToAligned(cutSitePos, seq1);
            addMarkerToRow(row1, alignedPos, result.color, result.index, 'Reference');

            // Add alignment rectangle
            const startPos = result.seq1Match.position;
            const endPos = result.seq1Match.positionEnd;
            const mismatches = getMismatches(result.sgRNA, seq1, startPos, result.seq1Match.strand === '-');
            addAlignmentRectangle(row1, seq1, startPos, endPos, mismatches, result.color, result.index, 'seq1', 'Reference');
        }

        // Add marker and rectangle for sequence 2 (amplicon)
        if (result.seq2Match && result.seq2Match.passes) {
            const cutSitePos = result.seq2Match.cutSite;
            const alignedPos = mapPositionToAligned(cutSitePos, seq2);
            addMarkerToRow(row2, alignedPos, result.color, result.index, 'Amplicon 1');

            // Add alignment rectangle
            const startPos = result.seq2Match.position;
            const endPos = result.seq2Match.positionEnd;
            const mismatches = getMismatches(result.sgRNA, seq2, startPos, result.seq2Match.strand === '-');
            addAlignmentRectangle(row2, seq2, startPos, endPos, mismatches, result.color, result.index, 'seq2', 'Amplicon 1');
        }
    }
}

// Add alignment rectangle showing where sgRNA aligns
function addAlignmentRectangle(row, sequence, startPos, endPos, mismatches, color, sgRNAIndex, seqClass, seqName) {
    const bases = row.querySelector('div[style*="display: flex"]');
    if (!bases) return;

    // Map positions from ungapped to gapped (aligned) sequence
    const alignedStartPos = mapPositionToAligned(startPos, sequence);
    const alignedEndPos = mapPositionToAligned(endPos - 1, sequence);

    if (!bases.children[alignedStartPos] || !bases.children[alignedEndPos]) return;

    const firstBase = bases.children[alignedStartPos];
    const lastBase = bases.children[alignedEndPos];

    // Create rectangle
    const rectangle = document.createElement('div');
    rectangle.className = `sgrna-alignment-rectangle ${seqClass}`;
    rectangle.title = `sgRNA ${sgRNAIndex + 1} alignment (${seqName})`;

    // Calculate position and width
    // Account for 2px border on the rectangle (with box-sizing: border-box)
    const borderWidth = 2;
    const leftPos = firstBase.offsetLeft;
    const width = lastBase.offsetLeft - firstBase.offsetLeft + 30 + (borderWidth * 2); // 30px is base width, add 4px for borders

    rectangle.style.left = leftPos + 'px';
    rectangle.style.width = width + 'px';
    rectangle.style.borderColor = color;
    rectangle.style.background = `${color}33`; // Add transparency

    // Add mismatch markers
    for (const mismatchIdx of mismatches) {
        const mismatchAlignedPos = mapPositionToAligned(startPos + mismatchIdx, sequence);

        if (bases.children[mismatchAlignedPos]) {
            const mismatchBase = bases.children[mismatchAlignedPos];
            const mismatchMarker = document.createElement('div');
            mismatchMarker.className = 'sgrna-mismatch';
            mismatchMarker.style.left = (mismatchBase.offsetLeft - leftPos) + 'px';
            mismatchMarker.title = `Mismatch at position ${startPos + mismatchIdx}`;
            rectangle.appendChild(mismatchMarker);
        }
    }

    // Add rectangle to the bases container
    bases.style.position = 'relative';
    bases.appendChild(rectangle);
}

// Add a single cut site marker to a row
// Position indicates the base BEFORE which the cut occurs (i.e., between bases)
function addMarkerToRow(row, position, color, sgRNAIndex, seqName) {
    const bases = row.querySelector('div[style*="display: flex"]');
    if (!bases || !bases.children[position]) return;

    const baseEl = bases.children[position];
    const marker = document.createElement('div');
    marker.className = `cut-site-marker sgrna-${sgRNAIndex % 8}`;
    marker.style.backgroundColor = color;
    marker.title = `sgRNA ${sgRNAIndex + 1} cut site (${seqName}) at position ${position}`;

    // Position the marker between bases:
    // Each base is 30px wide, so we can calculate position directly
    // Offset by 3px (half of 6px marker width) to center it in the gap
    const baseWidth = 30;
    const leftPosition = (position * baseWidth) - 3;

    marker.style.left = leftPosition + 'px';
    marker.style.height = row.offsetHeight + 'px';
    marker.style.top = '0px';

    // Add marker to the row (position relative to bases container)
    bases.style.position = 'relative';
    bases.appendChild(marker);
}

// Main function to perform sgRNA alignment
function performsgRNAAlignment(seq1, seq2, sgRNAsText, cutSiteOffset, scoreCutoff) {
    console.log('Performing sgRNA alignment...');
    console.log('sgRNAs:', sgRNAsText);
    console.log('Cut site offset:', cutSiteOffset);
    console.log('Score cutoff:', scoreCutoff);

    // Perform alignment
    const results = alignAllsgRNAs(seq1, seq2, sgRNAsText, cutSiteOffset, scoreCutoff);

    console.log('sgRNA alignment results:', results);

    // Render sidebar
    rendersgRNASidebar(results);

    // Add cut site markers to visualization
    addCutSiteMarkers(results, seq1, seq2);

    return results;
}

// Setup sidebar collapse functionality
function setupsgRNASidebar() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const sidebarContent = document.getElementById('sgrna-results-content');
    const sidebarHeader = document.querySelector('#sgrna-results .sidebar-header');

    if (sidebarHeader && toggleButton && sidebarContent) {
        sidebarHeader.addEventListener('click', function() {
            sidebarContent.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
        });
    }
}

// Initialize sgRNA sidebar on page load
document.addEventListener('DOMContentLoaded', function() {
    setupsgRNASidebar();
});
