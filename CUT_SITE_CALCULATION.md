# Cut Site Calculation Documentation

## Overview

The cut site position calculation determines where CRISPR Cas9 (or other nucleases) will cut the DNA relative to the sgRNA binding site.

## Cut Site Offset Convention

The **cut site offset** is defined relative to the **3' end** of the sgRNA:
- **Negative values**: Cut site is INSIDE the sgRNA (toward the 5' end)
- **Positive values**: Cut site is OUTSIDE the sgRNA (beyond the 3' end)
- **Zero**: Cut site is exactly at the 3' end

### Example: Standard Cas9 (offset = -3)

For Cas9, the typical cut site is **3 bases upstream** of the PAM sequence, which is at the 3' end of the sgRNA.

```
sgRNA:  5' - A A T G G C - 3' [PAM]
Position:    0 1 2 3 4 5
                    |
Cut site (offset -3): between position 2 and 3
Result: AAT|GGC
```

## Position Indexing

Positions are **0-indexed** and represent the space **BEFORE** a base:
- Position 0: Before the first base
- Position 3: Before the 4th base (between base 2 and 3)
- Position N: Between base (N-1) and base N

## Forward Strand Calculation

For forward strand (5' → 3' reading left to right):

```javascript
cutSitePosition = alignmentPos + sgRNALength + cutSiteOffset
```

**Example:**
- sgRNA aligns at position 10-25 (16 bases)
- cutSiteOffset = -3
- Cut site = 10 + 16 + (-3) = 23
- This is 3 bases from the 3' end (position 25)
- Visual: positions 10-22 | 23-25

## Reverse Strand Calculation

For reverse strand (3' ← 5' reading right to left, but displayed left to right):

```javascript
cutSitePosition = alignmentPos - cutSiteOffset
```

**Example:**
- sgRNA aligns at position 10-25 (16 bases, reverse complement)
- For reverse strand, the 3' end is at the LEFT (position 10)
- cutSiteOffset = -3
- Cut site = 10 - (-3) = 13
- This is 3 bases from the 3' end toward the 5' end
- Visual: positions 10-12 | 13-25

## Visual Marker Placement

The cut site marker (scissors icon) is positioned:
1. At the left edge of the base at the calculated position
2. Offset left by half the marker width (1.5px) to center it
3. This places it precisely in the gap between bases

```
Base:    [A] [A] [T] | [G] [G] [C]
Index:    0   1   2  3  4   5   6
                     ↑
              Cut site marker
              (centered between bases)
```

## Common Cut Site Offsets

| Nuclease | Typical Offset | Description |
|----------|----------------|-------------|
| SpCas9 | -3 | 3 bp upstream of PAM |
| Cas12a (Cpf1) | +18 to +23 | Staggered cut downstream |
| SaCas9 | -3 | 3 bp upstream of PAM |
| Cas9 nickase | -3 | Single strand cut |

## Testing the Calculation

Use this test sequence to verify:

**Test sgRNA:** `AATGGC` (6 bases)
**Cut site offset:** -3
**Expected cut position:** Between position 2 and 3 (AAT|GGC)

If sgRNA aligns at position 10:
- Forward strand: 10 + 6 + (-3) = 13 ✓
- Reverse strand: 10 - (-3) = 13 ✓

Both should show the cut site at position 13, which represents the division point 3 bases from the respective 3' ends.
