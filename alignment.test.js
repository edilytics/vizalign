#!/usr/bin/env node
/**
 * Automated unit tests for DNA sequence alignment
 * Run with: npm test
 * Or directly: node alignment.test.js
 */

const assert = require('assert');
const { makeMatrix, globalAlign } = require('./js/alignment.js');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Run a single test case
 */
function runTest(testName, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`${colors.green}✓${colors.reset} ${testName}`);
        return true;
    } catch (error) {
        failedTests++;
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
        if (error.actual !== undefined && error.expected !== undefined) {
            console.log(`  ${colors.cyan}Expected:${colors.reset} ${error.expected}`);
            console.log(`  ${colors.cyan}Actual:${colors.reset}   ${error.actual}`);
        }
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
 * Assertion helpers
 */
function assertAlignment(result, expected, testName) {
    // Check length match
    assert.strictEqual(
        result.alignedSeqI.length,
        result.alignedSeqJ.length,
        `${testName}: Aligned sequences must be same length`
    );

    // Check for gaps in same position
    for (let i = 0; i < result.alignedSeqI.length; i++) {
        if (result.alignedSeqI[i] === '-' && result.alignedSeqJ[i] === '-') {
            throw new Error(`${testName}: Gap in both sequences at position ${i}`);
        }
    }

    // Check expected values
    if (expected.alignedI) {
        assert.strictEqual(
            result.alignedSeqI,
            expected.alignedI,
            `${testName}: Reference alignment mismatch`
        );
    }

    if (expected.alignedJ) {
        assert.strictEqual(
            result.alignedSeqJ,
            expected.alignedJ,
            `${testName}: Query alignment mismatch`
        );
    }

    if (expected.matchPct !== undefined) {
        assert.ok(
            Math.abs(result.matchPercentage - expected.matchPct) < 0.01,
            `${testName}: Expected match% ${expected.matchPct}, got ${result.matchPercentage}`
        );
    }

    if (expected.minMatchPct !== undefined) {
        assert.ok(
            result.matchPercentage >= expected.minMatchPct,
            `${testName}: Match% too low: expected >= ${expected.minMatchPct}, got ${result.matchPercentage}`
        );
    }

    if (expected.hasGapInI) {
        assert.ok(
            result.alignedSeqI.includes('-'),
            `${testName}: Expected gap in reference sequence`
        );
    }

    if (expected.hasGapInJ) {
        assert.ok(
            result.alignedSeqJ.includes('-'),
            `${testName}: Expected gap in query sequence`
        );
    }

    if (expected.consecutiveGaps) {
        const gapRuns = result.alignedSeqJ.match(/-+/g) || [];
        const hasLongRun = gapRuns.some(run => run.length >= 4);
        assert.ok(
            hasLongRun,
            `${testName}: Expected consecutive gaps (gap extension should group gaps)`
        );
    }
}

/**
 * Helper to run alignment with standard parameters
 */
function align(seqI, seqJ) {
    const matrix = makeMatrix(5, -4, -2, -1);
    const gapIncentive = new Int32Array(seqI.length + 1);
    gapIncentive.fill(0);
    return globalAlign(seqJ, seqI, matrix, gapIncentive, -1, -1);
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Basic Alignment Tests', () => {
    runTest('Test 1: Identical Sequences', () => {
        const result = align('ATCGATCG', 'ATCGATCG');
        assertAlignment(result, {
            alignedI: 'ATCGATCG',
            alignedJ: 'ATCGATCG',
            matchPct: 100.0
        }, 'Test 1');
    });

    runTest('Test 2: Single Base Mismatch', () => {
        const result = align('ATCGATCG', 'ATCTATCG');
        assertAlignment(result, {
            alignedI: 'ATCGATCG',
            alignedJ: 'ATCTATCG',
            matchPct: 87.5
        }, 'Test 2');
    });

    runTest('Test 10: Very Short Sequences', () => {
        const result = align('AT', 'AT');
        assertAlignment(result, {
            alignedI: 'AT',
            alignedJ: 'AT',
            matchPct: 100.0
        }, 'Test 10');
    });

    runTest('Test 11: Completely Different Sequences', () => {
        const result = align('AAAAAAAAAA', 'TTTTTTTTTT');
        assertAlignment(result, {
            matchPct: 0.0
        }, 'Test 11');
        // Note: Algorithm may add gaps to optimize alignment score
        // What matters is 0% match rate
    });
});

describe('Gap Handling Tests', () => {
    runTest('Test 3: Single Base Insertion', () => {
        const result = align('ATCGATCG', 'ATCGAATCG');
        assertAlignment(result, {
            hasGapInI: true,
            minMatchPct: 85.0
        }, 'Test 3');
    });

    runTest('Test 4: Single Base Deletion', () => {
        const result = align('ATCGATCG', 'ATCGTCG');
        assertAlignment(result, {
            hasGapInJ: true,
            minMatchPct: 85.0
        }, 'Test 4');
    });

    runTest('Test 5: Multiple Insertions', () => {
        const result = align('ATCG', 'AATTCCGG');
        assertAlignment(result, {
            hasGapInI: true,
            minMatchPct: 40.0
        }, 'Test 5');
    });

    runTest('Test 6: Consecutive Gaps', () => {
        const result = align('ATCGATCGATCG', 'ATCGCG');
        assertAlignment(result, {
            hasGapInJ: true,
            consecutiveGaps: true
        }, 'Test 6');
    });
});

describe('Terminal Gap Tests', () => {
    runTest('Test 7: Terminal Gaps (Beginning)', () => {
        const result = align('ATCGATCG', 'GATCG');
        assertAlignment(result, {
            minMatchPct: 50.0
        }, 'Test 7');
    });

    runTest('Test 8: Terminal Gaps (End)', () => {
        const result = align('ATCGATCG', 'ATCGA');
        assertAlignment(result, {
            minMatchPct: 50.0
        }, 'Test 8');
    });
});

describe('Special Base Tests', () => {
    runTest('Test 9: N (Ambiguous Base) Handling', () => {
        const result = align('ATCGATCG', 'ATCNATCG');
        assertAlignment(result, {
            alignedI: 'ATCGATCG',
            alignedJ: 'ATCNATCG',
            minMatchPct: 80.0
        }, 'Test 9');
    });
});

describe('Length Mismatch Tests', () => {
    runTest('Test 12: Query Much Longer', () => {
        const result = align('ATCG', 'ATCGATCGATCGATCG');
        assertAlignment(result, {
            hasGapInI: true
        }, 'Test 12');
    });

    runTest('Test 13: Reference Much Longer', () => {
        const result = align('ATCGATCGATCGATCG', 'ATCG');
        assertAlignment(result, {
            hasGapInJ: true
        }, 'Test 13');
    });
});

describe('CRISPR Edit Tests', () => {
    runTest('Test 14: CRISPR Deletion', () => {
        const result = align(
            'ATCGATCGATCGCCCCCCCCCCCCCCCCCCCCCATCGATCGATCG',
            'ATCGATCGATCGCCCCCCATCGATCGATCG'
        );
        assertAlignment(result, {
            hasGapInJ: true,
            minMatchPct: 60.0
        }, 'Test 14');
    });

    runTest('Test 15: CRISPR Insertion', () => {
        const result = align(
            'ATCGATCGATCGATCGATCG',
            'ATCGATCGATCGGGGGGGGGGGGGGATCGATCG'
        );
        assertAlignment(result, {
            hasGapInI: true,
            minMatchPct: 50.0
        }, 'Test 15');
    });
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
console.log('='.repeat(60));
console.log(`Total:  ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bold}✓ All tests passed!${colors.reset}\n`);
    process.exit(0);
} else {
    console.log(`\n${colors.red}${colors.bold}✗ ${failedTests} test(s) failed${colors.reset}\n`);
    process.exit(1);
}
