# VizAlign

A static web application for DNA sequence alignment visualization with CRISPResso-style coloring.

## Quick Start

Serve locally:

```bash
python -m http.server 8000
```

Then navigate to `http://localhost:8000`

## Features

- **CRISPResso-Style Visualization**: Color-coded DNA bases (A=green, T=red, C=blue, G=orange)
- **Insertion Detection**: Bases opposite gaps are highlighted with red borders
- **URL Sharing**: Sequences are encoded in the URL for easy sharing
- **Real-Time Updates**: Visualization updates as you type
- **No Dependencies**: Pure JavaScript, no build step required

## Usage

1. Enter two DNA sequences in the text boxes
2. Sequences are automatically:
   - Normalized (uppercased, whitespace removed)
   - Padded to equal length with `-` (gaps)
   - Displayed in a stacked alignment view
3. Share the URL to show others the same alignment

## Example

Try this URL:
```
http://localhost:8000/#seq1=ATCG-ATCG&seq2=ATCGGATCG
```

This shows:
- Sequence 1: `ATCG-ATCG`
- Sequence 2: `ATCGGATCG`
- The `G` in sequence 2 at position 4 will have a red border (insertion)

## Project Structure

- `index.html` - Main entry point with sequence inputs
- `style.css` - Styles including base colors
- `js/dna-alignment.js` - Visualization and URL encoding
- `js/main.js` - Application initialization

## Documentation

See `CLAUDE.md` for detailed architecture and development guidance.
