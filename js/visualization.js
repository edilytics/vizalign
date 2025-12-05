// D3.js visualization functions

class Visualizer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
    }

    // Clear the visualization
    clear() {
        this.container.selectAll('*').remove();
        this.svg = null;
    }

    // Create SVG canvas
    createSVG(width, height) {
        this.clear();

        this.svg = this.container
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        return this.svg
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    // Draw a scatter plot
    scatterPlot(data, xKey, yKey, options = {}) {
        const width = options.width || 800;
        const height = options.height || 600;
        const innerWidth = width - this.margin.left - this.margin.right;
        const innerHeight = height - this.margin.top - this.margin.bottom;

        const g = this.createSVG(width, height);

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[xKey]))
            .range([0, innerWidth])
            .nice();

        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[yKey]))
            .range([innerHeight, 0])
            .nice();

        // Axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis);

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Axis labels
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 45)
            .attr('text-anchor', 'middle')
            .text(options.xLabel || xKey);

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text(options.yLabel || yKey);

        // Points
        g.selectAll('.point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(+d[xKey]))
            .attr('cy', d => yScale(+d[yKey]))
            .attr('r', options.pointSize || 4)
            .attr('fill', options.color || 'steelblue')
            .attr('opacity', 0.7);
    }

    // Draw a line chart
    lineChart(data, xKey, yKey, options = {}) {
        const width = options.width || 800;
        const height = options.height || 600;
        const innerWidth = width - this.margin.left - this.margin.right;
        const innerHeight = height - this.margin.top - this.margin.bottom;

        const g = this.createSVG(width, height);

        // Parse x values (could be dates or numbers)
        const parseX = options.parseDate ? d3.timeParse(options.dateFormat || '%Y-%m-%d') : d => +d;

        // Scales
        const xScale = (options.parseDate ? d3.scaleTime() : d3.scaleLinear())
            .domain(d3.extent(data, d => parseX(d[xKey])))
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[yKey]))
            .range([innerHeight, 0])
            .nice();

        // Line generator
        const line = d3.line()
            .x(d => xScale(parseX(d[xKey])))
            .y(d => yScale(+d[yKey]));

        // Axes
        const xAxis = options.parseDate ? d3.axisBottom(xScale) : d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis);

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Draw line
        g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', options.color || 'steelblue')
            .attr('stroke-width', options.strokeWidth || 2)
            .attr('d', line);
    }
}

const visualizer = new Visualizer('viz-container');

console.log('Visualizer initialized');
