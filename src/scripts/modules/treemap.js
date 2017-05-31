import $                                from 'jquery'
import * as d3                          from 'd3'
import PubSub                           from 'pubsub-js'
import data                             from '../data/tree.json'
import throttle                         from '../utils/throttle.js'

const HIC_COLOR = '#ae3637'
const UMIC_COLOR = '#b9595a'
const LMIC_COLOR = '#c98586'
const color = {'HIC': HIC_COLOR, 'UMIC': UMIC_COLOR, 'LMIC': LMIC_COLOR}
const SENDING_DATA = data[0]
const RECEIVING_DATA = data[1]


class Treemap {
    constructor() {
        this.$container = $('.treemap__container')
        this.container = d3.select('.treemap__container')
        this.width = this.$container.outerWidth()
        this.height = 0.58 * this.width
        this.modeSending = true
        this.$window = $(window)
        this.nodes = null
        this.treemap = null
    }

    init() {
        this.setupGraph()
        PubSub.subscribe('keyChanged', this.switchMode.bind(this))

        throttle('resize', 'resize.treemap')
        this.$window.on('resize.treemap', () => {
            this.resize()
        })
    }

    setupGraph() {
        
        this.treemap = d3.treemap().size([this.width - 10, this.height])

        const root = d3.hierarchy(SENDING_DATA, (d) => d.children)
            .sum((d) => d.size)
        

        const tree = this.treemap(root)

        this.nodes = this.container.datum(root).selectAll('.treemap__node')
            .data(tree.leaves())
            .enter().append('div')
            .attr('class', (d) => `treemap__node treemap__node--${d.parent.data.name}`)
            .style('left', (d) => d.x0 + 'px')
            .style('top', (d) => d.y0 + 'px')
            .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
            .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
            .style('background', (d) => color[d.parent.data.name])
            .text((d) => d.data.name)    
    }

    switchMode() {
        this.modeSending = !this.modeSending

        if (this.modeSending) {
            const newRoot = d3.hierarchy(SENDING_DATA, (d) => d.children)
                .sum((d) => d.size)

            this.nodes.data(this.treemap(newRoot).leaves())
                .transition()
                .duration(1500)
                .style('left', (d) => d.x0 + 'px')
                .style('top', (d) => d.y0 + 'px')
                .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
                .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
        } else {
            const newRoot = d3.hierarchy(RECEIVING_DATA, (d) => d.children)
                .sum((d) => d.size)

            this.nodes.data(this.treemap(newRoot).leaves())
                .transition()
                .duration(1500)
                .style('left', (d) => d.x0 + 'px')
                .style('top', (d) => d.y0 + 'px')
                .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
                .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
                .style('background', (d) => color[d.parent.data.name])
                .text((d) => d.data.name)
        }
    }
}

export default Treemap
