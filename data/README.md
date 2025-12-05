# Data Directory

Place your CSV, JSON, or other data files in this directory.

## Example Files

- `example1.csv` - Sample dataset with time series data
- `example2.csv` - Sample dataset for alignment testing

## Data Formats

### CSV Files
Should have headers in the first row. Common patterns:
- Time series: include a `timestamp` or `date` column
- Relational: include an `id` or unique key column for joining

### JSON Files
Can be:
- Array of objects: `[{...}, {...}]`
- Object with data array: `{ data: [{...}, {...}] }`
