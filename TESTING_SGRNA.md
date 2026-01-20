# sgRNA Alignment Testing Guide

## Testing the sgRNA Alignment Feature

The sgRNA alignment feature has been successfully implemented. Follow these steps to test it:

### 1. Start the Local Server

```bash
cd /Users/cole/code/edilytics/vizalign
python -m http.server 8001
```

Then open: http://localhost:8001

### 2. Test Cases

#### Test Case 1: Basic sgRNA Alignment with Cut Site Inside sgRNA

**Input:**
- **Sequence 1 (Reference):** `ATCGATCGATCGATCGATCGATCGATCGATCGATCG`
- **Sequence 2 (Amplicon):** `ATCGATCGATCGATCGATCGATCGATCGATCGATCG`
- **sgRNA:** `ATCGATCGATCGATCG` (16 bases)
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `80`

**Expected Result:**
- sgRNA should align with 100% score to both sequences
- **Cut site should appear INSIDE the sgRNA, 3 bases from the 3' end**
- For sgRNA at position 0-15: cut site at position 13 (between base 12 and 13)
- This represents: `ATCGATCGATCGA|TCG` where `|` is the cut site
- Cut site markers should appear precisely between base pairs
- Sidebar should show "✓ Pass" for both sequences

**Test URL:**
```
http://localhost:8001/#seq1=ATCGATCGATCGATCGATCGATCGATCGATCGATCG&seq2=ATCGATCGATCGATCGATCGATCGATCGATCGATCG&name1=Reference&name2=Amplicon&sgRNAs=ATCGATCGATCGATCG&cutSite=-3&scoreCutoff=80
```

#### Test Case 2: Multiple sgRNAs

**Input:**
- **Sequence 1:** `ATCGATCGATCGATCGATCGGGGGGGGGGGGATCGATCGATCG`
- **Sequence 2:** `ATCGATCGATCGATCGATCGGGGGGGGGGGGATCGATCGATCG`
- **sgRNAs:** `ATCGATCGATCGATCG,GGGGGGGGGGGG,GATCGATCG`
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `80`

**Expected Result:**
- All three sgRNAs should align
- Different colored cut site markers for each sgRNA
- Sidebar should show results for all three sgRNAs

**Test URL:**
```
http://localhost:8001/#seq1=ATCGATCGATCGATCGATCGGGGGGGGGGGGATCGATCGATCG&seq2=ATCGATCGATCGATCGATCGGGGGGGGGGGGATCGATCGATCG&sgRNAs=ATCGATCGATCGATCG,GGGGGGGGGGGG,GATCGATCG&cutSite=-3&scoreCutoff=80
```

#### Test Case 3: Reverse Complement Matching

**Input:**
- **Sequence 1:** `ATCGATCGATCGATCG`
- **Sequence 2:** `CGATCGATCGATCGAT` (reverse complement)
- **sgRNA:** `ATCGATCGATCGATCG`
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `80`

**Expected Result:**
- sgRNA should match Seq1 on forward strand (+)
- sgRNA should match Seq2 on reverse strand (-)
- Both should show 100% score

**Test URL:**
```
http://localhost:8001/#seq1=ATCGATCGATCGATCG&seq2=CGATCGATCGATCGAT&sgRNAs=ATCGATCGATCGATCG&cutSite=-3&scoreCutoff=80
```

#### Test Case 4: Below Cutoff Threshold

**Input:**
- **Sequence 1:** `ATCGATCGATCGATCGATCGATCGATCGATCGATCG`
- **Sequence 2:** `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
- **sgRNA:** `ATCGATCGATCGATCG`
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `90`

**Expected Result:**
- sgRNA should match Seq1 with ✓ (100% > 90%)
- sgRNA should fail on Seq2 with ✗ (low score < 90%)
- Warning message "Below cutoff" for Seq2

**Test URL:**
```
http://localhost:8001/#seq1=ATCGATCGATCGATCGATCGATCGATCGATCGATCG&seq2=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&sgRNAs=ATCGATCGATCGATCG&cutSite=-3&scoreCutoff=90
```

#### Test Case 5: Mismatches Visualization

**Input (sgRNA with 2 mismatches):**
- **Reference:** `ATCGATCGATCGATCGATCGATCGATCGATCGATCG`
- **Amplicon:** `ATCGAACGATCGTTCGATCGATCGATCGATCGATCG`
- **sgRNA:** `ATCGATCGATCGATCG` (will have mismatches at positions 5 and 12)
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `70`

**Expected Result:**
- Grey rectangle appears above reference showing sgRNA alignment
- Grey rectangle appears below amplicon showing sgRNA alignment
- **Red squares appear within rectangles at mismatch positions**
- Both should pass (score ~87.5% > 70%)

**Test URL:**
```
http://localhost:8001/#seq1=ATCGATCGATCGATCGATCGATCGATCGATCGATCG&seq2=ATCGAACGATCGTTCGATCGATCGATCGATCGATCG&sgRNAs=ATCGATCGATCGATCG&cutSite=-3&scoreCutoff=70
```

#### Test Case 6: Real CRISPR Example

**Input (Simulated CRISPR editing with deletion):**
- **Reference:** `ATCGATCGATCGCCCCCCCCCCCCCCCCCCCCCATCGATCGATCG`
- **Amplicon:** `ATCGATCGATCG---------------CCCCCCATCGATCGATCG` (deletion)
- **sgRNA:** `CGATCGCCCCCCCCCCCCC` (targets the deletion site)
- **Cut Site Offset:** `-3`
- **Score Cutoff:** `80`

**Expected Result:**
- sgRNA aligns to reference with high score
- sgRNA may not align well to amplicon (due to deletion)
- Cut site markers show where CRISPR cut should occur
- Grey rectangle visible above reference sequence
- Deletion region visible in alignment

### 3. Features to Verify

- [ ] URL encoding/decoding works for all parameters
- [ ] Comma-separated sgRNAs are parsed correctly
- [ ] Forward strand alignment works
- [ ] Reverse complement alignment works
- [ ] **Grey alignment rectangles appear above/below sequences**
- [ ] **Red mismatch squares appear within rectangles**
- [ ] Cut site markers appear in visualization
- [ ] Cut site markers have different colors for different sgRNAs
- [ ] Sidebar shows all sgRNA results
- [ ] Pass/fail indicators work correctly
- [ ] Score cutoff threshold works
- [ ] Cut site position calculation is correct
- [ ] Sidebar is collapsible
- [ ] sgRNA inputs update URL in real-time

### 4. Manual Testing Steps

1. Open http://localhost:8001 in your browser
2. Enter test sequences in the input fields
3. Enter sgRNA sequences (comma-separated for multiple)
4. Adjust cut site offset and score cutoff as needed
5. Check that:
   - Sidebar appears with sgRNA results
   - Cut site markers appear in the alignment
   - URL updates with all parameters
   - Sharing the URL works (copy and paste in new tab)
   - Browser back/forward buttons work

### 5. Browser Console Debugging

Open the browser console (F12) and check for:
- sgRNA alignment messages
- Any JavaScript errors
- Alignment results logged to console

### Expected Console Output:
```
DNA alignment tool initialized
Performing sgRNA alignment...
sgRNAs: ATCGATCGATCGATCG
Cut site offset: -3
Score cutoff: 80
sgRNA alignment results: [...]
```

### 6. Known Limitations

- sgRNAs are aligned to sequences without gaps (gaps are removed)
- Positions shown in sidebar are relative to ungapped sequence
- Very long sgRNA lists may slow down the UI
- Cut site markers may overlap if sgRNAs target the same region

### 7. Troubleshooting

**Issue:** Sidebar doesn't appear
- Check if sgRNA input has valid DNA characters (A, T, C, G)
- Check browser console for JavaScript errors
- Verify sgrna-alignment.js is loaded

**Issue:** Cut site markers don't appear
- Check if alignment visualization rendered correctly
- Verify sgRNA alignment score passes the cutoff
- Check browser console for errors

**Issue:** URL parameters not loading
- Clear browser cache
- Check URL format (parameters should be in hash: #seq1=...&seq2=...)
- Verify all parameters are URL-encoded correctly
