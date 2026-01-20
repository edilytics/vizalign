// Pure JavaScript implementation of CRISPResso2 Needleman-Wunsch alignment
// Ported from crispresso_align.pyx

// Constants for traceback pointers
const UP = 1;
const LEFT = 2;
const DIAG = 3;
const NONE = 4;
const MARRAY = 1;
const IARRAY = 2;
const JARRAY = 3;

/**
 * Create a scoring matrix for DNA sequence alignment
 * @param {number} matchScore - Score for matching bases (default: 5)
 * @param {number} mismatchScore - Score for mismatching bases (default: -4)
 * @param {number} nMismatchScore - Score for N vs nucleotide (default: -2)
 * @param {number} nMatchScore - Score for N vs N (default: -1)
 * @returns {Int32Array} - Flat array representing 256x256 scoring matrix
 */
function makeMatrix(matchScore = 5, mismatchScore = -4, nMismatchScore = -2, nMatchScore = -1) {
    const matSize = 256; // ASCII table size for char codes
    const matrix = new Int32Array(matSize * matSize);

    // Initialize all to 0
    matrix.fill(0);

    const nucleotides = ['A', 'T', 'C', 'G'];
    const nucCodes = nucleotides.map(n => n.charCodeAt(0));
    const nCode = 'N'.charCodeAt(0);

    // Fill in scores for nucleotide pairs
    for (const code1 of nucCodes) {
        for (const code2 of nucCodes) {
            if (code1 === code2) {
                matrix[code1 * matSize + code2] = matchScore;
            } else {
                matrix[code1 * matSize + code2] = mismatchScore;
            }
        }
    }

    // N mismatches
    for (const code of nucCodes) {
        matrix[code * matSize + nCode] = nMismatchScore;
        matrix[nCode * matSize + code] = nMismatchScore;
    }

    // N matches N
    matrix[nCode * matSize + nCode] = nMatchScore;

    return matrix;
}

/**
 * Global sequence alignment using Needleman-Wunsch with affine gap penalties
 * Three-state dynamic programming (M, I, J arrays)
 * @param {string} seqJ - Query/read sequence
 * @param {string} seqI - Reference sequence
 * @param {Int32Array} matrix - Scoring matrix from makeMatrix()
 * @param {Int32Array} gapIncentive - Position-specific gap incentives (length = seqI.length + 1)
 * @param {number} gapOpen - Gap opening penalty (default: -1)
 * @param {number} gapExtend - Gap extension penalty (default: -1)
 * @returns {Object} - {alignedSeqJ, alignedSeqI, matchPercentage}
 */
function globalAlign(seqJ, seqI, matrix, gapIncentive, gapOpen = -1, gapExtend = -1) {
    const maxJ = seqJ.length;
    const maxI = seqI.length;

    // Validate gap incentive length
    if (gapIncentive.length !== maxI + 1) {
        throw new Error(`Gap incentive length mismatch: expected ${maxI + 1}, got ${gapIncentive.length}`);
    }

    const matSize = 256; // For matrix indexing

    // Initialize scoring and pointer matrices
    // M = best alignment ending with a match
    // I = best alignment ending with gap in read (insertion in ref, deletion in read)
    // J = best alignment ending with gap in ref (deletion in ref, insertion in read)
    const mScore = new Int32Array((maxI + 1) * (maxJ + 1));
    const iScore = new Int32Array((maxI + 1) * (maxJ + 1));
    const jScore = new Int32Array((maxI + 1) * (maxJ + 1));
    const mPointer = new Int32Array((maxI + 1) * (maxJ + 1));
    const iPointer = new Int32Array((maxI + 1) * (maxJ + 1));
    const jPointer = new Int32Array((maxI + 1) * (maxJ + 1));

    const minScore = gapOpen * maxJ * maxI;

    // Helper function for 2D array access
    const idx = (i, j) => i * (maxJ + 1) + j;

    // Initialize M matrix
    for (let j = 1; j <= maxJ; j++) {
        mScore[idx(0, j)] = minScore;
        mPointer[idx(0, j)] = IARRAY;
    }
    for (let i = 1; i <= maxI; i++) {
        mScore[idx(i, 0)] = minScore;
        mPointer[idx(i, 0)] = JARRAY;
    }
    mScore[idx(0, 0)] = 0;
    mPointer[idx(0, 0)] = 0;

    // Initialize I matrix
    for (let i = 1; i <= maxJ; i++) {
        iScore[idx(0, i)] = gapExtend * i + gapIncentive[0];
        iPointer[idx(0, i)] = IARRAY;
    }
    for (let i = 0; i <= maxI; i++) {
        iScore[idx(i, 0)] = minScore;
    }

    // Initialize J matrix
    for (let i = 1; i <= maxI; i++) {
        jScore[idx(i, 0)] = gapExtend * i + gapIncentive[0];
        jPointer[idx(i, 0)] = JARRAY;
    }
    for (let j = 0; j <= maxJ; j++) {
        jScore[idx(0, j)] = minScore;
    }

    // Fill in matrices (not last row or column)
    for (let i = 1; i < maxI; i++) {
        const ci = seqI.charCodeAt(i - 1);

        for (let j = 1; j < maxJ; j++) {
            const cj = seqJ.charCodeAt(j - 1);

            // I array (gap in read)
            const iFromMVal = gapOpen + mScore[idx(i, j - 1)] + gapIncentive[i];
            const iExtendVal = gapExtend + iScore[idx(i, j - 1)] + gapIncentive[i];
            if (iFromMVal > iExtendVal) {
                iScore[idx(i, j)] = iFromMVal;
                iPointer[idx(i, j)] = MARRAY;
            } else {
                iScore[idx(i, j)] = iExtendVal;
                iPointer[idx(i, j)] = IARRAY;
            }

            // J array (gap in ref)
            const jFromMVal = gapOpen + mScore[idx(i - 1, j)] + gapIncentive[i - 1];
            const jExtendVal = gapExtend + jScore[idx(i - 1, j)];
            if (jFromMVal > jExtendVal) {
                jScore[idx(i, j)] = jFromMVal;
                jPointer[idx(i, j)] = MARRAY;
            } else {
                jScore[idx(i, j)] = jExtendVal;
                jPointer[idx(i, j)] = JARRAY;
            }

            // M array (match/mismatch)
            const mVal = mScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
            const iVal = iScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
            const jVal = jScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];

            if (mVal > jVal) {
                if (mVal > iVal) {
                    mScore[idx(i, j)] = mVal;
                    mPointer[idx(i, j)] = MARRAY;
                } else {
                    mScore[idx(i, j)] = iVal;
                    mPointer[idx(i, j)] = IARRAY;
                }
            } else {
                if (jVal > iVal) {
                    mScore[idx(i, j)] = jVal;
                    mPointer[idx(i, j)] = JARRAY;
                } else {
                    mScore[idx(i, j)] = iVal;
                    mPointer[idx(i, j)] = IARRAY;
                }
            }
        }
    }

    // Last column (no gap opening penalty)
    const j = maxJ;
    const cj = seqJ.charCodeAt(j - 1);
    for (let i = 1; i < maxI; i++) {
        const ci = seqI.charCodeAt(i - 1);

        const iFromMVal = gapExtend + mScore[idx(i, j - 1)] + gapIncentive[i];
        const iExtendVal = gapExtend + iScore[idx(i, j - 1)] + gapIncentive[i];
        if (iFromMVal > iExtendVal) {
            iScore[idx(i, j)] = iFromMVal;
            iPointer[idx(i, j)] = MARRAY;
        } else {
            iScore[idx(i, j)] = iExtendVal;
            iPointer[idx(i, j)] = IARRAY;
        }

        const jFromMVal = gapExtend + mScore[idx(i - 1, j)] + gapIncentive[i - 1];
        const jExtendVal = gapExtend + jScore[idx(i - 1, j)];
        if (jFromMVal > jExtendVal) {
            jScore[idx(i, j)] = jFromMVal;
            jPointer[idx(i, j)] = MARRAY;
        } else {
            jScore[idx(i, j)] = jExtendVal;
            jPointer[idx(i, j)] = JARRAY;
        }

        const mVal = mScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
        const iVal = iScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
        const jVal = jScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];

        if (mVal > jVal) {
            if (mVal > iVal) {
                mScore[idx(i, j)] = mVal;
                mPointer[idx(i, j)] = MARRAY;
            } else {
                mScore[idx(i, j)] = iVal;
                mPointer[idx(i, j)] = IARRAY;
            }
        } else {
            if (jVal > iVal) {
                mScore[idx(i, j)] = jVal;
                mPointer[idx(i, j)] = JARRAY;
            } else {
                mScore[idx(i, j)] = iVal;
                mPointer[idx(i, j)] = IARRAY;
            }
        }
    }

    // Last row (no gap opening penalty)
    const i = maxI;
    const ci = seqI.charCodeAt(i - 1);
    for (let j = 1; j <= maxJ; j++) {
        const cj = seqJ.charCodeAt(j - 1);

        const iFromMVal = gapExtend + mScore[idx(i, j - 1)] + gapIncentive[i];
        const iExtendVal = gapExtend + iScore[idx(i, j - 1)] + gapIncentive[i];
        if (iFromMVal > iExtendVal) {
            iScore[idx(i, j)] = iFromMVal;
            iPointer[idx(i, j)] = MARRAY;
        } else {
            iScore[idx(i, j)] = iExtendVal;
            iPointer[idx(i, j)] = IARRAY;
        }

        const jFromMVal = gapExtend + mScore[idx(i - 1, j)] + gapIncentive[i - 1];
        const jExtendVal = gapExtend + jScore[idx(i - 1, j)];
        if (jFromMVal > jExtendVal) {
            jScore[idx(i, j)] = jFromMVal;
            jPointer[idx(i, j)] = MARRAY;
        } else {
            jScore[idx(i, j)] = jExtendVal;
            jPointer[idx(i, j)] = JARRAY;
        }

        const mVal = mScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
        const iVal = iScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];
        const jVal = jScore[idx(i - 1, j - 1)] + matrix[ci * matSize + cj];

        if (mVal > jVal) {
            if (mVal > iVal) {
                mScore[idx(i, j)] = mVal;
                mPointer[idx(i, j)] = MARRAY;
            } else {
                mScore[idx(i, j)] = iVal;
                mPointer[idx(i, j)] = IARRAY;
            }
        } else {
            if (jVal > iVal) {
                mScore[idx(i, j)] = jVal;
                mPointer[idx(i, j)] = JARRAY;
            } else {
                mScore[idx(i, j)] = iVal;
                mPointer[idx(i, j)] = IARRAY;
            }
        }
    }

    // Traceback
    const alignmentJ = [];
    const alignmentI = [];
    let matchCount = 0;
    let alignCounter = 0;

    let currI = maxI;
    let currJ = maxJ;

    // Determine starting matrix
    let currMatrix = MARRAY;
    if (mScore[idx(currI, currJ)] > jScore[idx(currI, currJ)]) {
        if (mScore[idx(currI, currJ)] > iScore[idx(currI, currJ)]) {
            currMatrix = MARRAY;
        } else {
            currMatrix = IARRAY;
        }
    } else {
        if (jScore[idx(currI, currJ)] > iScore[idx(currI, currJ)]) {
            currMatrix = JARRAY;
        } else {
            currMatrix = IARRAY;
        }
    }

    while (currI > 0 || currJ > 0) {
        let currPtr;

        if (currMatrix === MARRAY) {
            currPtr = mPointer[idx(currI, currJ)];
            alignmentJ.push(seqJ[currJ - 1]);
            alignmentI.push(seqI[currI - 1]);

            if (seqJ[currJ - 1] === seqI[currI - 1]) {
                matchCount++;
            }

            currI = currI > 1 ? currI - 1 : 0;
            currJ = currJ > 1 ? currJ - 1 : 0;
            currMatrix = currPtr;

        } else if (currMatrix === JARRAY) {
            currPtr = jPointer[idx(currI, currJ)];
            alignmentJ.push('-');
            alignmentI.push(seqI[currI - 1]);

            currI = currI > 1 ? currI - 1 : 0;
            currMatrix = currPtr;

        } else if (currMatrix === IARRAY) {
            currPtr = iPointer[idx(currI, currJ)];
            alignmentJ.push(seqJ[currJ - 1]);
            alignmentI.push('-');

            currJ = currJ > 1 ? currJ - 1 : 0;
            currMatrix = currPtr;

        } else {
            throw new Error(`Invalid traceback state at i=${currI}, j=${currJ}`);
        }

        alignCounter++;
    }

    // Reverse alignments (built backwards)
    const finalAlignJ = alignmentJ.reverse().join('');
    const finalAlignI = alignmentI.reverse().join('');

    const matchPercentage = alignCounter > 0 ? (100 * matchCount / alignCounter) : 0;

    return {
        alignedSeqJ: finalAlignJ,
        alignedSeqI: finalAlignI,
        matchPercentage: Math.round(matchPercentage * 1000) / 1000 // Round to 3 decimal places
    };
}

/**
 * Find insertions, deletions, and substitutions in aligned sequences
 * @param {string} readSeqAl - Aligned read sequence
 * @param {string} refSeqAl - Aligned reference sequence
 * @param {Array<number>} includeIndx - Indices to include in analysis (window)
 * @returns {Object} - Results object with positions and counts of variants
 */
function findIndelsSubstitutions(readSeqAl, refSeqAl, includeIndx) {
    const refPositions = [];
    const allSubstitutionPositions = [];
    const substitutionPositions = [];
    const allSubstitutionValues = [];
    const substitutionValues = [];

    const allDeletionPositions = [];
    const allDeletionCoordinates = [];
    const deletionPositions = [];
    const deletionCoordinates = [];
    const deletionSizes = [];
    let startDeletion = -1;

    const allInsertionPositions = [];
    const allInsertionLeftPositions = [];
    const insertionPositions = [];
    const insertionCoordinates = [];
    const insertionSizes = [];
    let startInsertion = -1;

    const seqLen = refSeqAl.length;
    const includeIndxSet = new Set(includeIndx);
    const nucSet = new Set(['A', 'T', 'C', 'G', 'N']);

    let idx = 0;
    let currentInsertionSize = 0;

    for (let idxC = 0; idxC < seqLen; idxC++) {
        const c = refSeqAl[idxC];

        if (c !== '-') {
            refPositions.push(idx);

            // Check for substitution
            if (refSeqAl[idxC] !== readSeqAl[idxC] &&
                readSeqAl[idxC] !== '-' &&
                readSeqAl[idxC] !== 'N') {
                allSubstitutionPositions.push(idx);
                allSubstitutionValues.push(readSeqAl[idxC]);
                if (includeIndx.includes(idx)) {
                    substitutionPositions.push(idx);
                    substitutionValues.push(readSeqAl[idxC]);
                }
            }

            // End of insertion
            if (startInsertion !== -1) {
                allInsertionLeftPositions.push(startInsertion);
                allInsertionPositions.push(startInsertion);
                allInsertionPositions.push(idx);
                if (includeIndxSet.has(startInsertion) && includeIndxSet.has(idx)) {
                    insertionCoordinates.push([startInsertion, idx]);
                    insertionPositions.push(startInsertion);
                    insertionPositions.push(idx);
                    insertionSizes.push(currentInsertionSize);
                }
                startInsertion = -1;
            }
            currentInsertionSize = 0;
            idx++;

        } else {  // Current ref position is gap
            if (idx === 0) {
                refPositions.push(-1);
            } else {
                refPositions.push(-idx);
            }

            if (idx > 0 && startInsertion === -1) {
                startInsertion = idx - 1;
            }
            currentInsertionSize++;
        }

        // Check for deletion
        if (readSeqAl[idxC] === '-' && startDeletion === -1) {
            if (idxC - 1 > 0) {
                startDeletion = refPositions[idxC];
            } else {
                startDeletion = 0;
            }
        } else if (readSeqAl[idxC] !== '-' && startDeletion !== -1) {
            const endDeletion = refPositions[idxC];
            for (let i = startDeletion; i < endDeletion; i++) {
                allDeletionPositions.push(i);
            }
            allDeletionCoordinates.push([startDeletion, endDeletion]);

            // Check if deletion overlaps with window
            let inWindow = false;
            for (let i = startDeletion; i < endDeletion; i++) {
                if (includeIndxSet.has(i)) {
                    inWindow = true;
                    break;
                }
            }

            if (inWindow) {
                for (let i = startDeletion; i < endDeletion; i++) {
                    deletionPositions.push(i);
                }
                deletionCoordinates.push([startDeletion, endDeletion]);
                deletionSizes.push(endDeletion - startDeletion);
            }
            startDeletion = -1;
        }
    }

    // Handle deletion at end
    if (startDeletion !== -1) {
        const endDeletion = refPositions[seqLen - 1];
        for (let i = startDeletion; i < endDeletion; i++) {
            allDeletionPositions.push(i);
        }
        allDeletionCoordinates.push([startDeletion, endDeletion]);

        let inWindow = false;
        for (let i = startDeletion; i < endDeletion; i++) {
            if (includeIndxSet.has(i)) {
                inWindow = true;
                break;
            }
        }

        if (inWindow) {
            for (let i = startDeletion; i < endDeletion; i++) {
                deletionPositions.push(i);
            }
            deletionCoordinates.push([startDeletion, endDeletion]);
            deletionSizes.push(endDeletion - startDeletion);
        }
    }

    const substitutionN = substitutionPositions.length;
    const deletionN = deletionSizes.reduce((sum, val) => sum + val, 0);
    const insertionN = insertionSizes.reduce((sum, val) => sum + val, 0);

    return {
        allInsertionPositions,
        allInsertionLeftPositions,
        insertionPositions,
        insertionCoordinates,
        insertionSizes,
        insertionN,

        allDeletionPositions,
        allDeletionCoordinates,
        deletionPositions,
        deletionCoordinates,
        deletionSizes,
        deletionN,

        allSubstitutionPositions,
        substitutionPositions,
        allSubstitutionValues,
        substitutionValues,
        substitutionN,

        refPositions
    };
}

/**
 * Calculate simple homology between two sequences
 * @param {string} a - First sequence
 * @param {string} b - Second sequence
 * @returns {number} - Fraction of matching positions (0-1)
 */
function calculateHomology(a, b) {
    const len = Math.min(a.length, b.length);
    let score = 0;

    for (let i = 0; i < len; i++) {
        if (a[i] === b[i]) {
            score++;
        }
    }

    return score / len;
}

// Export for Node.js (ES modules)
// These exports allow the code to work in Node.js test environments
// while remaining fully functional in browsers (where exports are ignored)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        makeMatrix,
        globalAlign,
        findIndelsSubstitutions,
        calculateHomology
    };
}
