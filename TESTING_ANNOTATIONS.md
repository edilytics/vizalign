# Annotations Feature Testing Guide

## Overview

The annotations feature allows you to mark and label specific regions of DNA sequences with custom text notes. Annotations are:
- Stored in the URL for easy sharing
- Displayed as colored bars above/below sequences
- Interactive with hover tooltips

## How to Test

Server is running on **http://localhost:8000**

### Test Case 1: Basic Annotation

**Steps:**
1. Enter these sequences:
   - **Sequence 1**: `ATCGATCGATCGATCGATCG`
   - **Sequence 2**: `ATCGATCGATCGATCGATCG`

2. In the Annotations section:
   - Select: **Reference**
   - Start: `5`
   - End: `10`
   - Text: `Interesting region`
   - Click **Add**

**Expected Result:**
- Annotation appears in the list showing "Ref 5-10 Interesting region"
- Purple bar appears above the reference sequence from positions 5-10
- Hovering over the bar shows the text "Interesting region"
- URL updates with annotations parameter

**Test URL:**
```
http://localhost:8000/#seq1=ATCGATCGATCGATCGATCG&seq2=ATCGATCGATCGATCGATCG&annotations=%5B%7B%22seq%22%3A%22seq1%22%2C%22start%22%3A5%2C%22end%22%3A10%2C%22text%22%3A%22Interesting%20region%22%7D%5D
```

### Test Case 2: Multiple Annotations

**Steps:**
1. Use the same sequences from Test Case 1
2. Add first annotation:
   - Select: **Reference**
   - Start: `2`
   - End: `6`
   - Text: `Start region`

3. Add second annotation:
   - Select: **Amplicon 1**
   - Start: `12`
   - End: `18`
   - Text: `End region`

**Expected Result:**
- Two annotations in the list
- Purple bar above reference (positions 2-6)
- Orange bar below amplicon (positions 12-18)
- Both markers show tooltips on hover
- URL contains both annotations

### Test Case 3: Overlapping Annotations

**Steps:**
1. Sequences: `ATCGATCGATCGATCGATCG` for both
2. Add annotation 1:
   - Reference, 0-10, "Region A"
3. Add annotation 2:
   - Reference, 5-15, "Region B"

**Expected Result:**
- Both bars appear above reference
- Bars overlap in the middle (positions 5-10)
- Both tooltips work independently

### Test Case 4: Annotation with Gaps

**Steps:**
1. Perform an alignment that creates gaps:
   - Seq1: `ATCGATCGATCGATCGATCG`
   - Seq2: `ATCGATCGATCG`
   - Click "Align Sequences"

2. Add annotation:
   - Reference, 0-5, "Before gap region"

**Expected Result:**
- Annotation appears correctly positioned
- Marker spans the correct bases including any gaps in the alignment

### Test Case 5: URL Sharing

**Steps:**
1. Create several annotations
2. Copy the URL from the browser address bar
3. Open the URL in a new tab or incognito window

**Expected Result:**
- All annotations load correctly
- All markers appear in the visualization
- Annotation list shows all entries

### Test Case 6: Delete Annotation

**Steps:**
1. Create 2-3 annotations
2. Click "Delete" button on one annotation

**Expected Result:**
- Annotation removed from list
- Marker removed from visualization
- URL updates (no longer contains deleted annotation)

### Test Case 7: Real-World Example

**Sequences (CRISPR editing with deletion):**
- Reference: `ATCGATCGATCGCCCCCCCCCCCCCCCCCCCCCATCGATCGATCG`
- Amplicon: `ATCGATCGATCG---------------CCCCCCATCGATCGATCG`

**Annotations to add:**
1. Reference, 0-12, "Upstream homology arm"
2. Reference, 12-32, "Target deletion site"
3. Reference, 32-44, "Downstream homology arm"
4. Amplicon, 12-20, "Deletion scar"

**Expected Result:**
- Four annotations visible in list
- Purple bars above reference marking all three regions
- Orange bar below amplicon marking deletion scar
- Clear visualization of the CRISPR editing outcome

## Features to Verify

- [ ] Add annotation button works
- [ ] Annotations appear in list
- [ ] Purple bars appear above Reference sequence
- [ ] Orange bars appear below Amplicon sequence
- [ ] Hover shows tooltip with annotation text
- [ ] Delete button removes annotation
- [ ] URL updates when adding/deleting annotations
- [ ] URL sharing works (paste URL in new tab)
- [ ] Annotations work with aligned sequences (gaps)
- [ ] Multiple annotations can be added to same sequence
- [ ] Annotations can be added to both sequences independently
- [ ] Annotations persist through zoom/pan operations
- [ ] Browser back/forward buttons work with annotations

## Visual Guide

**Color Scheme:**
- **Reference (seq1)**: Purple bars above sequence (#8e44ad)
- **Amplicon (seq2)**: Orange bars below sequence (#e67e22)

**Marker Position:**
- Reference markers: 12px above the sequence row
- Amplicon markers: 12px below the sequence row
- Height: 8px (10px on hover)
- Rounded corners for visual polish

## Common Issues

**Issue**: Annotation marker doesn't appear
- **Solution**: Check that start/end positions are valid (not beyond sequence length)
- **Solution**: Ensure the position is in the ungapped sequence (don't count gaps)

**Issue**: URL is very long
- **Solution**: This is normal - annotations are JSON-encoded in the URL
- **Solution**: Use a URL shortener if needed for sharing

**Issue**: Annotation positions seem off after alignment
- **Solution**: Annotation positions are relative to the ungapped sequence
- **Solution**: The system automatically maps positions to handle gaps

## Browser Console Debugging

Open console (F12) and check for:
- Annotation array: `window.annotations`
- Manual test: `window.getAnnotations()`
- Errors during add/delete operations

## Integration with Other Features

**With sgRNA alignment:**
- Annotations and sgRNA markers coexist
- Different z-index levels prevent overlap issues
- sgRNA rectangles appear at different vertical positions

**With zoom/pan:**
- Annotations move with the alignment
- Tooltips remain aligned with markers
- No performance degradation

**With URL parameters:**
- All features work together in URL
- Format: `#seq1=...&seq2=...&sgRNAs=...&annotations=...`
- Annotations are JSON-encoded and URL-safe
