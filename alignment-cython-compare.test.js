#!/usr/bin/env node
/**
 * Automated test suite comparing JavaScript alignment implementation
 * against the CRISPResso2 Cython reference implementation.
 *
 * Run with: node alignment-cython-compare.test.js
 *
 * This test suite focuses on gap_incentive behavior at different positions
 * to identify discrepancies between the JS and Cython implementations.
 */

const { execSync } = require('child_process');
const { makeMatrix, globalAlign } = require('./js/alignment.js');

// Path to Python environment with CRISPResso2
const PYTHON_PATH = '/Users/cole/mambaforge/envs/crispresso/bin/python';
const ORACLE_SCRIPT = './test_oracle.py';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// CRISPResso2 default gap penalties (from CRISPResso2/args.json)
const DEFAULT_GAP_OPEN = -20;
const DEFAULT_GAP_EXTEND = -2;

/**
 * Run the Cython implementation via Python oracle
 */
function runCythonAlignment(seqJ, seqI, gapIncentive, gapOpen = DEFAULT_GAP_OPEN, gapExtend = DEFAULT_GAP_EXTEND) {
    const input = JSON.stringify({
        seqJ,
        seqI,
        gapIncentive,
        gapOpen,
        gapExtend
    });

    try {
        const result = execSync(`${PYTHON_PATH} ${ORACLE_SCRIPT} '${input}'`, {
            cwd: process.cwd(),
            encoding: 'utf-8',
            timeout: 30000
        });
        const parsed = JSON.parse(result);
        if (!parsed.success) {
            throw new Error(parsed.error);
        }
        return parsed.result;
    } catch (error) {
        throw new Error(`Cython alignment failed: ${error.message}`);
    }
}

/**
 * Run the JavaScript implementation
 */
function runJSAlignment(seqJ, seqI, gapIncentive, gapOpen = DEFAULT_GAP_OPEN, gapExtend = DEFAULT_GAP_EXTEND) {
    const matrix = makeMatrix(5, -4, -2, -1);
    const gapIncentiveArr = new Int32Array(gapIncentive);
    return globalAlign(seqJ, seqI, matrix, gapIncentiveArr, gapOpen, gapExtend);
}

/**
 * Compare two alignment results
 */
function compareResults(jsResult, cythonResult) {
    const issues = [];

    if (jsResult.alignedSeqJ !== cythonResult.alignedSeqJ) {
        issues.push({
            field: 'alignedSeqJ',
            js: jsResult.alignedSeqJ,
            cython: cythonResult.alignedSeqJ
        });
    }

    if (jsResult.alignedSeqI !== cythonResult.alignedSeqI) {
        issues.push({
            field: 'alignedSeqI',
            js: jsResult.alignedSeqI,
            cython: cythonResult.alignedSeqI
        });
    }

    // Allow small floating point differences in match percentage
    if (Math.abs(jsResult.matchPercentage - cythonResult.matchPercentage) > 0.01) {
        issues.push({
            field: 'matchPercentage',
            js: jsResult.matchPercentage,
            cython: cythonResult.matchPercentage
        });
    }

    return issues;
}

/**
 * Run a single test case
 */
function runTest(testName, testCase) {
    totalTests++;
    const { seqJ, seqI, gapIncentive, gapOpen = DEFAULT_GAP_OPEN, gapExtend = DEFAULT_GAP_EXTEND } = testCase;

    try {
        const cythonResult = runCythonAlignment(seqJ, seqI, gapIncentive, gapOpen, gapExtend);
        const jsResult = runJSAlignment(seqJ, seqI, gapIncentive, gapOpen, gapExtend);
        const issues = compareResults(jsResult, cythonResult);

        if (issues.length === 0) {
            passedTests++;
            console.log(`${colors.green}✓${colors.reset} ${testName}`);
            return true;
        } else {
            failedTests++;
            console.log(`${colors.red}✗${colors.reset} ${testName}`);
            for (const issue of issues) {
                console.log(`  ${colors.cyan}${issue.field}:${colors.reset}`);
                console.log(`    ${colors.dim}Cython:${colors.reset} ${issue.cython}`);
                console.log(`    ${colors.dim}JS:    ${colors.reset} ${issue.js}`);
            }
            failures.push({
                name: testName,
                testCase,
                cythonResult,
                jsResult,
                issues
            });
            return false;
        }
    } catch (error) {
        failedTests++;
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
        failures.push({
            name: testName,
            testCase,
            error: error.message
        });
        return false;
    }
}

/**
 * Test suite runner
 */
function describe(suiteName, suiteFn) {
    console.log(`\n${colors.bold}${colors.blue}${suiteName}${colors.reset}`);
    suiteFn();
}

/**
 * Create gap incentive array with zeros, setting specific positions to a value
 */
function createGapIncentive(length, positions = [], value = 100) {
    const arr = new Array(length).fill(0);
    for (const pos of positions) {
        if (pos >= 0 && pos < length) {
            arr[pos] = value;
        }
    }
    return arr;
}

// =============================================================================
// TEST SEQUENCES - Using realistic 50-100bp sequences
// =============================================================================

// Base reference sequence (52bp)
const REF_50 = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG';

// Reference with different lengths
const REF_30 = 'ATCGATCGATCGATCGATCGATCGATCGAT';
const REF_80 = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG';

// =============================================================================
// TEST CASES
// =============================================================================

describe('Basic Alignment (No Gap Incentive)', () => {
    runTest('Identical sequences (50bp)', {
        seqJ: REF_50,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1)
    });

    runTest('Single mismatch in middle', {
        seqJ: REF_50.substring(0, 25) + 'T' + REF_50.substring(26),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1)
    });

    runTest('4bp deletion in query (middle)', {
        seqJ: REF_50.substring(0, 24) + REF_50.substring(28),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1)
    });

    runTest('4bp insertion in query (middle)', {
        seqJ: REF_50.substring(0, 25) + 'AAAA' + REF_50.substring(25),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1)
    });
});

describe('Gap Incentive Position Testing - Deletion Scenarios', () => {
    // Query has 4bp deletion, test where gap incentive pulls the gap
    const queryWithDeletion = REF_50.substring(0, 24) + REF_50.substring(28);

    runTest('Gap incentive at position 10 (before deletion)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [10])
    });

    runTest('Gap incentive at position 20 (near deletion)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [20])
    });

    runTest('Gap incentive at position 25 (at deletion site)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('Gap incentive at position 26 (at deletion site)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [26])
    });

    runTest('Gap incentive at position 30 (after deletion)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [30])
    });

    runTest('Gap incentive at position 40 (far after deletion)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [40])
    });
});

describe('Gap Incentive Position Testing - Insertion Scenarios', () => {
    // Query has 4bp insertion at position 25
    const queryWithInsertion = REF_50.substring(0, 25) + 'AAAA' + REF_50.substring(25);

    runTest('Gap incentive at position 10 (before insertion)', {
        seqJ: queryWithInsertion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [10])
    });

    runTest('Gap incentive at position 20 (near insertion)', {
        seqJ: queryWithInsertion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [20])
    });

    runTest('Gap incentive at position 25 (at insertion site)', {
        seqJ: queryWithInsertion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('Gap incentive at position 30 (after insertion)', {
        seqJ: queryWithInsertion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [30])
    });

    runTest('Gap incentive at position 40 (far after insertion)', {
        seqJ: queryWithInsertion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [40])
    });
});

describe('Multiple Gap Incentive Positions', () => {
    const queryWithDeletion = REF_50.substring(0, 24) + REF_50.substring(28);

    runTest('Gap incentive at positions 24-27 (spanning deletion)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [24, 25, 26, 27])
    });

    runTest('Gap incentive at positions 10, 25, 40 (scattered)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [10, 25, 40])
    });

    runTest('Gradient gap incentive around position 25', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: (() => {
            const arr = new Array(REF_50.length + 1).fill(0);
            arr[23] = 25;
            arr[24] = 50;
            arr[25] = 100;
            arr[26] = 50;
            arr[27] = 25;
            return arr;
        })()
    });
});

describe('CRISPR-like Cut Site Scenarios', () => {
    // Simulate typical CRISPR editing scenarios with cut site at position 25

    runTest('5bp deletion at cut site (pos 25)', {
        seqJ: REF_50.substring(0, 23) + REF_50.substring(28),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('10bp deletion at cut site (pos 25)', {
        seqJ: REF_50.substring(0, 20) + REF_50.substring(30),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('5bp insertion at cut site (pos 25)', {
        seqJ: REF_50.substring(0, 25) + 'GGGGG' + REF_50.substring(25),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('10bp insertion at cut site (pos 25)', {
        seqJ: REF_50.substring(0, 25) + 'GGGGGGGGGG' + REF_50.substring(25),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('Complex edit: 3bp deletion + 2bp insertion at cut site', {
        seqJ: REF_50.substring(0, 24) + 'AA' + REF_50.substring(27),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });
});

describe('Gap Incentive Near Sequence Boundaries', () => {
    const queryWithDeletion = REF_50.substring(0, 24) + REF_50.substring(28);

    runTest('Gap incentive at position 5 (near start)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [5])
    });

    runTest('Gap incentive at position 48 (near end)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [48])
    });

    runTest('Gap incentive at position 50 (at end)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [50])
    });
});

describe('Different Sequence Lengths', () => {
    runTest('30bp reference with gap incentive at position 15', {
        seqJ: REF_30.substring(0, 14) + REF_30.substring(18),
        seqI: REF_30,
        gapIncentive: createGapIncentive(REF_30.length + 1, [15])
    });

    runTest('80bp reference with gap incentive at position 40', {
        seqJ: REF_80.substring(0, 38) + REF_80.substring(42),
        seqI: REF_80,
        gapIncentive: createGapIncentive(REF_80.length + 1, [40])
    });

    runTest('Query longer than reference', {
        seqJ: 'AAAA' + REF_30 + 'TTTT',
        seqI: REF_30,
        gapIncentive: createGapIncentive(REF_30.length + 1, [15])
    });
});

describe('Gap Open/Extend Penalty Variations', () => {
    const queryWithDeletion = REF_50.substring(0, 24) + REF_50.substring(28);

    runTest('Higher gap open penalty (-5)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25]),
        gapOpen: -5,
        gapExtend: -1
    });

    runTest('Higher gap extend penalty (-3)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25]),
        gapOpen: -1,
        gapExtend: -3
    });

    runTest('Both penalties higher (-5, -3)', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25]),
        gapOpen: -5,
        gapExtend: -3
    });
});

describe('Edge Cases', () => {
    runTest('N bases in query', {
        seqJ: REF_50.substring(0, 20) + 'NNNN' + REF_50.substring(24),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [22])
    });

    runTest('Multiple mismatches with gap incentive', {
        seqJ: REF_50.replace(/G/g, 'T'),
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25])
    });

    runTest('All zeros gap incentive', {
        seqJ: REF_50.substring(0, 24) + REF_50.substring(28),
        seqI: REF_50,
        gapIncentive: new Array(REF_50.length + 1).fill(0)
    });
});

describe('Gap Incentive Value Variations', () => {
    const queryWithDeletion = REF_50.substring(0, 24) + REF_50.substring(28);

    runTest('Low gap incentive value (10) at position 25', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25], 10)
    });

    runTest('Medium gap incentive value (50) at position 25', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25], 50)
    });

    runTest('High gap incentive value (100) at position 25', {
        seqJ: queryWithDeletion,
        seqI: REF_50,
        gapIncentive: createGapIncentive(REF_50.length + 1, [25], 100)
    });
});

describe('Real-World CRISPResso Test Cases', () => {
    // User-provided test case from CRISPResso2 output
    const REAL_SEQ_I = 'CGGATGTTCCAATCAGTACGCAGAGAGTCGCCGTCTCCAAGGTGAAAGCGGAAGTAGGGCCTTCGCGCACCTCATGGAATCCCTTCTGCAGCACCTGGATCGCTTTTCCGAGCTTCTGGCGGTCTCAAGCACTACCTACGTCAGCACCTGGGACCCCGCCACCGTGCGCCGGGCCTTGCAGTGGGCGCGCTACCTGCGCCACATCCATCGGCGCTTTGGTCGG';
    const REAL_SEQ_J = 'CGGCCGGATGTTCCAATCAGTACGCAGAGAGTCGCCGTCTCCAAGGTGAAAGCTGAAGTAGGGCCTTCGCGCACCTCATGGAATCCCTTCTGCAGCTTTTCCGAGCTTCTGGCGGTCTCAAGCACTACCTACGTCAGCACCTGGGACCCCGCCACCGTGCGCCGGGCCTTGCAGTGGGCGCGCTACCTGCGCCACATCCATCGGCGCTTTGGTCGG';

    // Expected alignment from CRISPResso2:
    // Seq1 (ref):   ----CGGATGTTCCAATCAGTACGCAGAGAGTCGCCGTCTCCAAGGTGAAAGCGGAAGTAGGGCCTTCGCGCACCTCATGGAATCCCTTCTGCAGCACCTGGATCGCTTTTCCGAGCTTCTGGCGGTCTCAAGCACTACCTACGTCAGCACCTGGGACCCCGCCACCGTGCGCCGGGCCTTGCAGTGGGCGCGCTACCTGCGCCACATCCATCGGCGCTTTGGTCGG
    // Seq2 (query): CGGCCGGATGTTCCAATCAGTACGCAGAGAGTCGCCGTCTCCAAGGTGAAAGCTGAAGTAGGGCCTTCGCGCACCTCATGGAATCCCTTCTGCAGC-----------TTTTCCGAGCTTCTGGCGGTCTCAAGCACTACCTACGTCAGCACCTGGGACCCCGCCACCGTGCGCCGGGCCTTGCAGTGGGCGCGCTACCTGCGCCACATCCATCGGCGCTTTGGTCGG

    runTest('CRISPResso real case: gap incentive at positions 168, 184', {
        seqJ: REAL_SEQ_J,
        seqI: REAL_SEQ_I,
        gapIncentive: (() => {
            const arr = new Array(REAL_SEQ_I.length + 1).fill(0);
            arr[168] = 1;
            arr[184] = 1;
            return arr;
        })()
    });

    runTest('CRISPResso real case: all zeros gap incentive', {
        seqJ: REAL_SEQ_J,
        seqI: REAL_SEQ_I,
        gapIncentive: new Array(REAL_SEQ_I.length + 1).fill(0)
    });

    runTest('CRISPResso real case: gap incentive at position 92 only', {
        seqJ: REAL_SEQ_J,
        seqI: REAL_SEQ_I,
        gapIncentive: (() => {
            const arr = new Array(REAL_SEQ_I.length + 1).fill(0);
            arr[92] = 1;
            return arr;
        })()
    });
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(70));
console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
console.log('='.repeat(70));
console.log(`Total:  ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

if (failedTests > 0) {
    console.log(`\n${colors.bold}${colors.red}FAILED TESTS DETAILS:${colors.reset}`);
    console.log('-'.repeat(70));
    for (const failure of failures) {
        console.log(`\n${colors.bold}${failure.name}${colors.reset}`);
        console.log(`Input: seqI (${failure.testCase.seqI.length}bp), seqJ (${failure.testCase.seqJ.length}bp)`);
        const nonZeroIncentives = failure.testCase.gapIncentive
            .map((v, i) => v !== 0 ? `[${i}]=${v}` : null)
            .filter(x => x)
            .join(', ');
        console.log(`Gap incentive positions: ${nonZeroIncentives || 'all zeros'}`);
        if (failure.error) {
            console.log(`${colors.red}Error: ${failure.error}${colors.reset}`);
        } else {
            for (const issue of failure.issues) {
                console.log(`${colors.cyan}${issue.field}:${colors.reset}`);
                console.log(`  Cython: "${issue.cython}"`);
                console.log(`  JS:     "${issue.js}"`);
            }
        }
    }
}

if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bold}✓ All tests passed! JS matches Cython implementation.${colors.reset}\n`);
    process.exit(0);
} else {
    console.log(`\n${colors.red}${colors.bold}✗ ${failedTests} test(s) failed - JS differs from Cython${colors.reset}\n`);
    process.exit(1);
}
