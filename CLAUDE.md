# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VizAlign is a static web application for DNA sequence alignment visualization. It displays two DNA sequences in a CRISPResso-style stacked alignment view with color-coded bases. Sequences are encoded in the URL for easy sharing. All processing happens client-side in the browser.

## Development Workflow

### Local Development
Open `index.html` directly in a browser, or use a simple HTTP server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if http-server is installed)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`

### No Build Step
This project intentionally avoids build tools. All code is plain JavaScript (ES6+) with no dependencies.

## Architecture

### File Structure
```
vizalign/
├── index.html            # Entry point with UI structure
├── style.css             # All styles including CRISPResso base colors
├── js/
│   ├── dna-alignment.js  # DNA alignment visualization and URL encoding
│   └── main.js           # Application initialization
└── data/                 # (Currently unused, for future data files)
```

### Script Loading Order
Scripts are loaded in this order in `index.html`:
1. `dna-alignment.js` - DNA alignment rendering and URL handling
2. `main.js` - Initialization and event setup

No external dependencies or libraries are required.

### Key Functions

All functions are in `dna-alignment.js`:

**URL Encoding/Decoding**
- `encodeSequencesToURL(seq1, seq2)` - Convert sequences to URL query string
- `decodeSequencesFromURL()` - Parse sequences from URL hash (returns `{seq1, seq2}`)
- `updateURL(seq1, seq2)` - Update browser URL hash with current sequences

**Sequence Processing**
- `normalizeSequence(seq)` - Uppercase and remove whitespace/newlines from sequence
- Sequences are automatically padded with `-` to equal length for alignment display

**Visualization**
- `renderAlignment(seq1, seq2)` - Create CRISPResso-style alignment visualization
- `createBaseElement(base, oppositeBase)` - Create a single base DOM element with proper styling
- Automatically detects insertions (base opposite a gap) and adds red border

**Initialization**
- `initDNAAlignment()` - Set up event listeners and load sequences from URL

## DNA Sequence Alignment

### How It Works

1. **User Input**: Two textarea inputs accept DNA sequences (A, T, C, G, -)
2. **Normalization**: Sequences are uppercased and whitespace is removed
3. **Padding**: Shorter sequence is padded with `-` to match longer sequence length
4. **Visualization**: Each position is displayed in a stacked alignment:
   - Sequence 1 on top row
   - Sequence 2 on bottom row
   - Each base in its own colored box

### Base Color Scheme (CRISPResso Style)

- **A (Adenine)**: Green background `#00cc00`
- **T (Thymine)**: Red background `#ff0000`
- **C (Cytosine)**: Blue background `#0000ff`
- **G (Guanine)**: Orange background `#ffaa00`
- **- (Gap)**: Gray background `#cccccc`

### Insertion Detection

When a base is opposite a gap (`-`) in the other sequence, it gets a red border (`box-shadow: 0 0 0 3px #ff0000`) to indicate an insertion.

Example:
```
Seq1: A T - C G
Seq2: A T G C G
```
The `G` in Seq2 (opposite the `-` in Seq1) will have a red border.

### URL Sharing

Sequences are encoded in the URL hash using URLSearchParams format:
```
http://localhost:8000/#seq1=ATCG&seq2=ATGC
```

- Updates happen in real-time as user types
- Browser back/forward buttons work correctly
- URLs are shareable - anyone can see the same alignment

### Character-by-Character Comparison

No alignment algorithm is performed. Sequences are compared position-by-position:
- Position 0 of seq1 vs position 0 of seq2
- Position 1 of seq1 vs position 1 of seq2
- etc.

Users must manually add `-` characters to represent gaps where they want them.

## Code Conventions

### Variable Naming
- Functions: camelCase (`renderAlignment`, `normalizeSequence`)
- Constants: camelCase
- DOM elements: camelCase with descriptive suffixes (`seq1Input`, `baseEl`)

### No Module System
Do not use ES6 `import`/`export`. All code is global scope loaded via `<script>` tags.

### Browser Compatibility
Target modern browsers (ES6+ supported). Features used:
- Arrow functions
- `const`/`let`
- Template literals
- URLSearchParams API
- Modern DOM manipulation

## Styling

All styles in `style.css`. Key CSS classes:

**Input Styling**
- `.sequence-input-group` - Container for label and textarea
- `textarea` - Monospace font, responsive width, focus states

**Alignment Visualization**
- `.alignment-row` - Flexbox container for each sequence row
- `.alignment-label` - "Sequence 1:" / "Sequence 2:" labels
- `.base` - Individual base cell (30x30px box)
- `.base.A`, `.base.T`, `.base.C`, `.base.G` - Base-specific colors
- `.base.gap` - Gray styling for gap characters
- `.base.insertion` - Red border (box-shadow) for insertions
- `.empty-message` - Placeholder text when no sequences entered

## Testing

### Automated Unit Tests

The project includes automated unit tests for the alignment algorithm:

```bash
# Run all alignment tests
npm test

# Or run directly
node alignment.test.js
```

Features:
- **15 comprehensive test cases** covering basic alignment, gaps, terminal gaps, special bases, and CRISPR edits
- **Zero dependencies** - uses only Node.js built-in modules
- **Color-coded output** - green for pass, red for fail
- **CI/CD friendly** - exit code 0 on success, 1 on failure
- **Fast** - completes in milliseconds

Test files:
- `alignment.test.js` - Automated command-line test suite
- `test-alignment.html` - Visual browser-based test runner for manual inspection
- `TESTING_ALIGNMENT.md` - Comprehensive testing documentation

### Manual Testing (Browser)

1. Start local server: `python -m http.server 8000`
2. Navigate to `http://localhost:8000`
3. Enter DNA sequences in the textareas
4. Check that:
   - Bases are colored correctly
   - Insertions have red borders
   - URL updates as you type
   - Sharing URL loads the same sequences
5. Check browser console for errors and debug logs

For alignment algorithm testing, visit `http://localhost:8000/test-alignment.html`

## Adding New Features

### Additional Base Types
To support additional nucleotides (e.g., U for RNA, N for any base):
1. Add new CSS class in `style.css` under base color section
2. Update `createBaseElement()` to handle the new base character
3. No changes to visualization logic needed

### Alignment Metadata
To add information about matches/mismatches/statistics:
1. Create new function to analyze alignment (count matches, calculate identity %)
2. Add new DOM element to display stats above or below alignment
3. Call analysis function in `renderAlignment()` after creating visualization

### Export Functionality
To add export features (download as image, copy to clipboard):
1. Add button(s) in HTML controls section
2. Use html2canvas or similar library to capture visualization
3. Provide download link or copy to clipboard
4. Keep implementation client-side only

### Sequence Length Display
To show sequence lengths and position numbers:
1. Add position ruler above alignment rows
2. Create new CSS styles for position labels
3. Update `renderAlignment()` to add position markers every N bases
