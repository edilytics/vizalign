// Data alignment algorithms

class DataAligner {
    constructor() {
        this.alignedData = null;
    }

    // Align two datasets by a common key
    alignByKey(data1, data2, key) {
        const map = new Map();

        // Index first dataset
        data1.forEach(row => {
            const keyValue = row[key];
            if (!map.has(keyValue)) {
                map.set(keyValue, { key: keyValue });
            }
            Object.assign(map.get(keyValue), this.prefixKeys(row, 'data1_'));
        });

        // Merge second dataset
        data2.forEach(row => {
            const keyValue = row[key];
            if (!map.has(keyValue)) {
                map.set(keyValue, { key: keyValue });
            }
            Object.assign(map.get(keyValue), this.prefixKeys(row, 'data2_'));
        });

        this.alignedData = Array.from(map.values());
        return this.alignedData;
    }

    // Align by time window
    alignByTime(data1, data2, timeKey, windowMs = 1000) {
        // Group data2 by time buckets
        const timeBuckets = new Map();

        data2.forEach(row => {
            const time = new Date(row[timeKey]).getTime();
            const bucket = Math.floor(time / windowMs);

            if (!timeBuckets.has(bucket)) {
                timeBuckets.set(bucket, []);
            }
            timeBuckets.get(bucket).push(row);
        });

        // Find matches for data1
        const aligned = [];
        data1.forEach(row => {
            const time = new Date(row[timeKey]).getTime();
            const bucket = Math.floor(time / windowMs);

            const matches = timeBuckets.get(bucket) || [];
            if (matches.length > 0) {
                matches.forEach(match => {
                    aligned.push({
                        ...this.prefixKeys(row, 'data1_'),
                        ...this.prefixKeys(match, 'data2_')
                    });
                });
            }
        });

        this.alignedData = aligned;
        return aligned;
    }

    // Helper to prefix object keys
    prefixKeys(obj, prefix) {
        const result = {};
        Object.keys(obj).forEach(key => {
            result[prefix + key] = obj[key];
        });
        return result;
    }

    // Get aligned data
    getAlignedData() {
        return this.alignedData;
    }
}

const dataAligner = new DataAligner();

console.log('Data aligner initialized');
