# DNA Sequence Alignment Testing Guide

## Overview

The DNA sequence alignment feature implements the CRISPResso2 Needleman-Wunsch global alignment algorithm with affine gap penalties. This guide provides comprehensive test cases to verify that the JavaScript implementation (`js/alignment.js`) matches the behavior of the original Cython code (`crispresso_align.pyx`).

## Running Automated Tests

**Recommended for frequent testing:**

```bash
# Run automated command-line tests
npm test

# Or run directly with Node.js
node alignment.test.js
```

The automated test suite (`alignment.test.js`) runs all test cases and provides:
- ✓ Color-coded pass/fail output
- Detailed error messages with expected vs actual values
- Summary statistics
- Exit code 0 on success, 1 on failure (CI/CD friendly)

**No installation required** - uses only Node.js built-in modules (no external dependencies).

## Running Manual/Visual Tests

**For visual inspection and debugging:**

```bash
# Start local server
python -m http.server 8000

# Open in browser
http://localhost:8000/test-alignment.html
```

The HTML test page provides visual output showing aligned sequences with syntax highlighting.

## Algorithm Details

### Key Parameters
- **Match Score**: 5 (from EDNAFULL matrix)
- **Mismatch Score**: -4
- **N-Mismatch Score**: -2 (N vs A/T/C/G)
- **N-Match Score**: -1 (N vs N)
- **Gap Open Penalty**: -1
- **Gap Extend Penalty**: -1

### Three-Matrix System
The algorithm uses three scoring matrices:
- **M array**: Best alignment ending with a match/mismatch
- **I array**: Best alignment ending with a gap in read (insertion in reference)
- **J array**: Best alignment ending with a gap in reference (deletion in reference)

## Test Cases

### Test Case 1: Identical Sequences
**Purpose**: Verify perfect alignment with no gaps

**Input:**
- **Reference (seqI)**: `ATCGATCG`
- **Query (seqJ)**: `ATCGATCG`
- **Gap Incentive**: All zeros (length 9)
- **Gap Open**: -1
- **Gap Extend**: -1

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `ATCGATCG`
- **Match Percentage**: 100.0%
- **No gaps in either sequence**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCGATCG
```

---

### Test Case 2: Single Base Mismatch
**Purpose**: Verify mismatch scoring

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `ATCTATCG`

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `ATCTATCG`
- **Match Percentage**: 87.5% (7 matches / 8 bases)
- **Mismatch at position 3** (G vs T)

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCTATCG
```

---

### Test Case 3: Single Base Insertion
**Purpose**: Verify insertion handling (gap in reference)

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `ATCGAATCG`

**Expected Output:**
- **Aligned Reference**: `ATCG-ATCG`
- **Aligned Query**: `ATCGAATCG`
- **Gap in reference at position 4**
- **One base insertion (A) in query**

**Expected Match Percentage**: ~88.9% (8 matches / 9 positions)

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCGAATCG
```

---

### Test Case 4: Single Base Deletion
**Purpose**: Verify deletion handling (gap in query)

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `ATCGTCG`

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `ATCG-TCG`
- **Gap in query at position 4**
- **One base deletion (A) in query**

**Expected Match Percentage**: ~87.5% (7 matches / 8 positions)

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCGTCG
```

---

### Test Case 5: Multiple Insertions
**Purpose**: Verify multiple gap handling

**Input:**
- **Reference**: `ATCG`
- **Query**: `AATTCCGG`

**Expected Output:**
- **Aligned Reference**: `A-T-C-G-` or similar with gaps
- **Aligned Query**: `AATTCCGG`
- **Multiple gaps in reference**
- **Query has double bases compared to reference**

**Expected**: Multiple gaps distributed optimally according to scoring

**Test URL:**
```
http://localhost:8000/#seq1=ATCG&seq2=AATTCCGG
```

---

### Test Case 6: Consecutive Gaps
**Purpose**: Verify gap extension penalty

**Input:**
- **Reference**: `ATCGATCGATCG`
- **Query**: `ATCGCG`

**Expected Output:**
- **Aligned Reference**: `ATCGATCGATCG`
- **Aligned Query**: `ATCG------CG` or similar
- **Consecutive gaps should be grouped together** (gap extension is cheaper than opening multiple gaps)

**Expected**: One contiguous gap region, not scattered gaps

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCG&seq2=ATCGCG
```

---

### Test Case 7: Terminal Gaps (Beginning)
**Purpose**: Verify no gap penalty at sequence start

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `GATCG`

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `---GATCG` or `ATCGATCG` (depends on best alignment)
- **Terminal gaps at beginning treated specially**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=GATCG
```

---

### Test Case 8: Terminal Gaps (End)
**Purpose**: Verify no gap opening penalty at sequence end

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `ATCGA`

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `ATCGA---` or aligned without terminal gap penalty
- **Terminal gaps at end treated with only extension penalty**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCGA
```

---

### Test Case 9: N (Ambiguous Base) Handling
**Purpose**: Verify N base scoring

**Input:**
- **Reference**: `ATCGATCG`
- **Query**: `ATCNATCG`

**Expected Output:**
- **Aligned Reference**: `ATCGATCG`
- **Aligned Query**: `ATCNATCG`
- **N at position 3 should align with G**
- **Penalty: -2 (N-mismatch score)**

**Expected Match Percentage**: Lower than perfect match but higher than complete mismatch

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCG&seq2=ATCNATCG
```

---

### Test Case 10: Complex Alignment
**Purpose**: Verify complex real-world scenario

**Input:**
- **Reference**: `ATCGATCGATCGATCGATCG`
- **Query**: `ATCGATTCGATCGAATCG`

**Expected Output:**
- **Multiple mismatches and potential gaps**
- **Algorithm should find optimal alignment**
- **Aligned sequences should be same length**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCGATCGATCG&seq2=ATCGATTCGATCGAATCG
```

---

### Test Case 11: Very Short Sequences
**Purpose**: Edge case - minimal sequences

**Input:**
- **Reference**: `AT`
- **Query**: `AT`

**Expected Output:**
- **Aligned Reference**: `AT`
- **Aligned Query**: `AT`
- **Match Percentage**: 100.0%

**Test URL:**
```
http://localhost:8000/#seq1=AT&seq2=AT
```

---

### Test Case 12: Completely Different Sequences
**Purpose**: Verify behavior with no similarity

**Input:**
- **Reference**: `AAAAAAAAAA`
- **Query**: `TTTTTTTTTT`

**Expected Output:**
- **Aligned Reference**: `AAAAAAAAAA`
- **Aligned Query**: `TTTTTTTTTT`
- **Match Percentage**: 0.0%
- **All positions are mismatches**

**Test URL:**
```
http://localhost:8000/#seq1=AAAAAAAAAA&seq2=TTTTTTTTTT
```

---

### Test Case 13: Length Mismatch - Query Longer
**Purpose**: Verify alignment when query is much longer

**Input:**
- **Reference**: `ATCG`
- **Query**: `ATCGATCGATCGATCG`

**Expected Output:**
- **Aligned sequences same length**
- **Gaps in reference to accommodate longer query**
- **Optimal alignment found**

**Test URL:**
```
http://localhost:8000/#seq1=ATCG&seq2=ATCGATCGATCGATCG
```

---

### Test Case 14: Length Mismatch - Reference Longer
**Purpose**: Verify alignment when reference is much longer

**Input:**
- **Reference**: `ATCGATCGATCGATCG`
- **Query**: `ATCG`

**Expected Output:**
- **Aligned sequences same length**
- **Gaps in query to accommodate longer reference**
- **Optimal alignment found**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCGATCG&seq2=ATCG
```

---

### Test Case 15: Real CRISPR Edit - Deletion
**Purpose**: Simulate actual CRISPR deletion

**Input:**
- **Reference**: `ATCGATCGATCGCCCCCCCCCCCCCCCCCCCCCATCGATCGATCG`
- **Query**: `ATCGATCGATCGCCCCCCATCGATCGATCG` (20bp deletion in middle)

**Expected Output:**
- **Large gap region in query sequence**
- **Deletion from position ~12-32**
- **Flanking regions should align perfectly**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCGCCCCCCCCCCCCCCCCCCCCCATCGATCGATCG&seq2=ATCGATCGATCGCCCCCCATCGATCGATCG
```

---

### Test Case 16: Real CRISPR Edit - Insertion
**Purpose**: Simulate actual CRISPR insertion

**Input:**
- **Reference**: `ATCGATCGATCGATCGATCG`
- **Query**: `ATCGATCGATCGGGGGGGGGGGGGGATCGATCG` (12bp insertion in middle)

**Expected Output:**
- **Large gap region in reference sequence**
- **Insertion around position ~12**
- **Flanking regions should align perfectly**

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCGATCGATCG&seq2=ATCGATCGATCGGGGGGGGGGGGGGATCGATCG
```

---

## Critical Assertions to Verify

### 1. Alignment Length
- Both aligned sequences must have **exactly the same length**
- Length = original length + gaps added

### 2. Gap Character
- All gaps represented by `-` character
- Gaps never appear in both sequences at same position

### 3. Match Percentage Calculation
```
matchPercentage = (matchCount / alignmentLength) * 100
```
- Should be rounded to 3 decimal places
- Must match Cython implementation

### 4. Score Matrix
The scoring matrix must match EDNAFULL:
```javascript
A-A:  5    A-T: -4    A-C: -4    A-G: -4
T-T:  5    T-A: -4    T-C: -4    T-G: -4
C-C:  5    C-A: -4    C-T: -4    C-G: -4
G-G:  5    G-A: -4    G-T: -4    G-C: -4
N-N: -1    N-X: -2    (where X = A/T/C/G)
```

### 5. Gap Penalties
- **Gap Open**: -1 (penalty for starting a gap)
- **Gap Extend**: -1 (penalty for extending existing gap)
- **Last row/column**: Only extension penalty (no opening penalty)

### 6. Traceback Path
- Must start from bottom-right corner of matrix (maxI, maxJ)
- Must end at top-left corner (0, 0)
- Must follow pointer array (MARRAY, IARRAY, or JARRAY)

## Testing Methodology

### Manual Testing
1. Start local server: `python -m http.server 8000`
2. Open test URL in browser
3. Click "Align Sequences" button
4. Verify aligned sequences in textareas
5. Check match percentage in console

### Console Output
Open browser console (F12) to see:
```
Alignment complete: {alignedSeqI: "...", alignedSeqJ: "...", matchPercentage: ...}
Match percentage: XX.XXX%
```

### Automated Testing (Future)
To create automated tests:
1. Compare JavaScript output with Cython output for all test cases
2. Use Python script to run Cython version and generate expected results
3. Create Jest/Mocha tests to verify JavaScript matches expected output

## Known Algorithm Details from Cython Code

### Initialization
- **M[0,0] = 0** (starting point)
- **M[0,j] = minScore** for j > 0 (can't start with match in empty reference)
- **M[i,0] = minScore** for i > 0 (can't start with match in empty query)
- **I[0,j] = gap_extend * j + gap_incentive[0]** (gaps at start)
- **J[i,0] = gap_extend * i + gap_incentive[0]** (gaps at start)

### Matrix Filling Order
1. Fill interior cells (1 to maxI-1, 1 to maxJ-1)
2. Fill last column (j = maxJ) with only gap extend penalty
3. Fill last row (i = maxI) with only gap extend penalty

### Traceback Logic
```
while i > 0 or j > 0:
    if currMatrix == MARRAY:
        - Add both bases to alignment
        - Move diagonally (i-1, j-1)
    elif currMatrix == JARRAY:
        - Add gap to query, base to reference
        - Move up (i-1, j)
    elif currMatrix == IARRAY:
        - Add base to query, gap to reference
        - Move left (i, j-1)
```

## Common Issues and Debugging

### Issue: Alignment is wrong
- **Check**: Are scores being calculated correctly?
- **Check**: Is the matrix initialization correct?
- **Check**: Is traceback following the right pointers?
- **Debug**: Add console.log in scoring loop to print matrix values

### Issue: Match percentage doesn't match Cython
- **Check**: Are you counting matches correctly during traceback?
- **Check**: Are you dividing by total alignment length (not original length)?
- **Check**: Are you rounding to 3 decimal places?

### Issue: Gaps in wrong places
- **Check**: Is gap opening vs extension penalty correct?
- **Check**: Are last row/column using only extension penalty?
- **Check**: Is gap incentive array correct length (maxI + 1)?

### Issue: Sequences different lengths after alignment
- **Check**: Are both sequences being built during traceback?
- **Check**: Are gaps being added to correct sequence?
- **Check**: Is traceback stopping at (0,0)?

## Comparison with Cython Implementation

To verify JavaScript matches Cython, run both implementations on the same test cases:

### Python Test Script (example)
```python
import crispresso_align as cra
import numpy as np

# Create scoring matrix
matrix = cra.make_matrix(5, -4, -2, -1)

# Create gap incentive array (all zeros for uniform)
seq1 = "ATCGATCG"
gap_incentive = np.zeros(len(seq1) + 1, dtype=np.int32)

# Run alignment
seq2 = "ATCTATCG"
align_j, align_i, score = cra.global_align(seq2, seq1, matrix, gap_incentive, -1, -1)

print(f"Reference: {align_i}")
print(f"Query:     {align_j}")
print(f"Score:     {score}%")
```

Run this for each test case and compare with JavaScript output.

## Future Enhancements

### Automated Test Suite
- Create HTML test page with all test cases
- Button to run all tests and show pass/fail
- Compare against expected results stored in JSON

### Performance Testing
- Test with very long sequences (>10,000 bases)
- Measure time to align
- Compare JavaScript vs Cython performance

### Visual Debugging
- Create visualization of scoring matrices
- Show traceback path through matrices
- Highlight optimal alignment path

## References

- Original Cython code: `crispresso_align.pyx`
- JavaScript implementation: `js/alignment.js`
- CRISPResso2 documentation: https://github.com/pinellolab/CRISPResso2
- EDNAFULL matrix: `EDNAFULL` file in repository
- Needleman-Wunsch algorithm: https://en.wikipedia.org/wiki/Needleman%E2%80%93Wunsch_algorithm
