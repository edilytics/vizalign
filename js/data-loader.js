// Data loading and parsing functions

class DataLoader {
    constructor() {
        this.datasets = [];
    }

    // Load CSV file
    async loadCSV(url) {
        try {
            const data = await d3.csv(url);
            this.datasets.push({
                name: url.split('/').pop(),
                type: 'csv',
                data: data,
                loaded: new Date()
            });
            return data;
        } catch (error) {
            console.error('Error loading CSV:', error);
            throw error;
        }
    }

    // Load JSON file
    async loadJSON(url) {
        try {
            const data = await d3.json(url);
            this.datasets.push({
                name: url.split('/').pop(),
                type: 'json',
                data: data,
                loaded: new Date()
            });
            return data;
        } catch (error) {
            console.error('Error loading JSON:', error);
            throw error;
        }
    }

    // Get all loaded datasets
    getDatasets() {
        return this.datasets;
    }

    // Clear all datasets
    clear() {
        this.datasets = [];
    }
}

const dataLoader = new DataLoader();

console.log('Data loader initialized');
