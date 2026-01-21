#!/usr/bin/env python3
"""
Test oracle script that runs CRISPResso2's Cython alignment implementation.
Used to generate expected results for comparing against the JavaScript implementation.

Usage:
    python test_oracle.py '{"seqJ": "ATCG", "seqI": "ATCG", "gapIncentive": [0, 0, 0, 0, 0]}'

Or for batch processing:
    python test_oracle.py --batch < test_cases.json
"""

import sys
import json
import numpy as np
from CRISPResso2 import CRISPResso2Align


def run_alignment(seqJ, seqI, gap_incentive, gap_open=-20, gap_extend=-2):
    """
    Run the CRISPResso2 Cython global alignment.

    Args:
        seqJ: Query/read sequence
        seqI: Reference sequence
        gap_incentive: List of position-specific gap incentives (length = len(seqI) + 1)
        gap_open: Gap opening penalty (default: -20, from CRISPResso2/args.json)
        gap_extend: Gap extension penalty (default: -2, from CRISPResso2/args.json)

    Returns:
        dict with alignedSeqJ, alignedSeqI, matchPercentage
    """
    # Create scoring matrix (using make_matrix for EDNAFULL-like scores)
    matrix = CRISPResso2Align.make_matrix(
        match_score=5,
        mismatch_score=-4,
        n_mismatch_score=-2,
        n_match_score=-1
    )

    # Convert gap_incentive to numpy array
    gap_incentive_arr = np.array(gap_incentive, dtype=np.int64)

    # Run alignment
    result = CRISPResso2Align.global_align(
        seqJ,  # query/read
        seqI,  # reference
        matrix,
        gap_incentive_arr,
        gap_open=gap_open,
        gap_extend=gap_extend
    )

    # Result is (aligned_seqJ, aligned_seqI, match_percentage)
    return {
        'alignedSeqJ': result[0],
        'alignedSeqI': result[1],
        'matchPercentage': result[2]
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_oracle.py '<json_input>' or --batch", file=sys.stderr)
        sys.exit(1)

    if sys.argv[1] == '--batch':
        # Batch mode: read JSON array from stdin
        test_cases = json.load(sys.stdin)
        results = []
        for i, case in enumerate(test_cases):
            try:
                result = run_alignment(
                    case['seqJ'],
                    case['seqI'],
                    case['gapIncentive'],
                    case.get('gapOpen', -20),
                    case.get('gapExtend', -2)
                )
                results.append({
                    'index': i,
                    'success': True,
                    'result': result
                })
            except Exception as e:
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(e)
                })
        print(json.dumps(results))
    else:
        # Single test case mode
        try:
            input_data = json.loads(sys.argv[1])
            result = run_alignment(
                input_data['seqJ'],
                input_data['seqI'],
                input_data['gapIncentive'],
                input_data.get('gapOpen', -20),
                input_data.get('gapExtend', -2)
            )
            print(json.dumps({'success': True, 'result': result}))
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}))
            sys.exit(1)


if __name__ == '__main__':
    main()
