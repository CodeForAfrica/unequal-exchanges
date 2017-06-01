import $                                from 'jquery'
import * as d3                          from 'd3'
import PubSub                           from 'pubsub-js'
import data                             from '../data/treemaps.json'
import throttle                         from '../utils/throttle.js'

const HIC_COLOR = '#ae3637'
const UMIC_COLOR = '#b9595a'
const LMIC_COLOR = '#c98586'
const color = {'HIC': HIC_COLOR, 'UMIC': UMIC_COLOR, 'LMIC': LMIC_COLOR}
const DATA = data[0]

class Treemap {
    constructor() {
        this.$page = $('.treemap')
        this.$container = this.$page.find('.treemap__container')
        this.container = d3.select('.treemap__container')
        this.width = this.$container.outerWidth()
        this.height = 0.58 * this.width
        this.modeSending = true
        this.$window = $(window)
        this.nodes = null
        this.treemap = null
        this.texts = null
        this.windowWidth = this.$window.outerWidth()
        this.root = null
        this.mobile = false
        this.tree = null
        this.data = DATA
        this.dataNode = null
        this.activeIncome = null
        this.$labels = this.$container.find('.treemap__label')
    }

    init() {
        if (window.matchMedia('(max-width: 1000px)').matches) {
            this.mobile = true
            this.height = 1.5 * this.width
        }

        this.setupGraph()
        this.$container.on('click', '.treemap__node', this.zoomIn.bind(this))
        this.$page.on('click', '.treemap__label:not(.treemap__label--active)', this.zoomIn.bind(this))
        this.$page.on('click', '.treemap__label--active', this.zoomOut.bind(this))

        PubSub.subscribe('keyChanged', this.switchMode.bind(this))

        throttle('resize', 'resize.treemap')
        this.$window.on('resize.treemap', this.resize.bind(this))

        throttle('mousemove', 'mousemove.treemap')
        this.$window.on('mousemove.treemap', this.positionTooltip.bind(this))
    }

    zoomIn(e) {
        e.stopPropagation()
        this.activeIncome = $(e.currentTarget).data('income')
        this.$page.addClass('active')
        this.$labels.addClass('treemap__label--active')
        this.resize()
        this.$container.addClass(`treemap__container--${this.activeIncome} treemap__container--active`)
        if (this.activeIncome === 'HIC') {
            this.data = DATA.children[0]
        } else if (this.activeIncome === 'UMIC') {
            this.data = DATA.children[1]
        } else {
            this.data = DATA.children[2]
        }
        this.update()
    }

    zoomOut() {
        this.$container.removeClass(`treemap__container--${this.activeIncome} treemap__container--active`)
        this.$labels.removeClass('treemap__label--active')
        this.$page.removeClass('active')
        this.resize()
        this.activeIncome = null
        this.data = DATA
        this.update()
    }

    positionTooltip(e) {
        const x = e.clientX
        const y = e.clientY
        
        if (x > this.windowWidth / 2) {
            this.$tooltips.css({
                top: y + 'px',
                left: (x - 20) + 'px',
                transform: 'translateX(-100%)'
            })
        } else {
            this.$tooltips.css({
                top: y + 'px',
                left: (x + 20) + 'px',
                transform: 'none'
            })
        }
    }

    resize() {
        this.width = this.$container.outerWidth()

        if (window.matchMedia('(max-width: 1000px)').matches) {
            this.mobile = true
            this.height = 1.5 * this.width
        } else {
            this.height = 0.58 * this.width    
        }
        
        this.treemap.size([this.width, this.height])
        this.treemap(this.root)

        this.nodes.style('left', (d) => d.x0 + 'px')
        this.nodes.style('top', (d) => d.y0 + 'px')
        this.nodes.style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
        this.nodes.style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
        this.windowWidth = this.$window.outerWidth()
    }

    setupGraph() {
        this.treemap = d3.treemap().size([this.width, this.height]).paddingOuter(5)

        this.root = d3.hierarchy(this.data, (d) => d.children)
            .sum((d) => {
                return this.modeSending ? d.sending : d.receiving
            })
        

        this.tree = this.treemap(this.root)

        this.dataNode = this.container.data([this.root]).selectAll('.treemap__node')
            .data(this.tree.leaves())

        const nodes = this.container.data([this.root]).selectAll('.treemap__node')
            .data(this.tree.leaves()).enter()
                .append('div')
                    .attr('class', (d) => `treemap__node treemap__node--${d.parent.data.name}`)
                    .attr('data-income', (d) => d.parent.data.name)
                    .style('left', (d) => d.x0 + 'px')
                    .style('top', (d) => d.y0 + 'px')
                    .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
                    .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
                    .style('background', (d) => color[d.parent.data.name])

        this.texts = nodes.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            }) 

        this.$tooltips = $('.treemap__node-text')
        this.nodes = d3.selectAll('.treemap__node')
    }

    update() {
        this.treemap = d3.treemap().size([this.width, this.height]).paddingOuter(5)

        this.root = d3.hierarchy(this.data, (d) => d.children)
            .sum((d) => {
                return this.modeSending ? d.sending : d.receiving
            })
        

        this.tree = this.treemap(this.root)

        this.dataNode = this.container.data([this.root]).selectAll('.treemap__node')
            .data(this.tree.leaves())

        const nodesEnter = this.dataNode.enter()
            .append('div')
                .attr('class', (d) => `treemap__node treemap__node--${d.parent.data.name}`)
                .attr('data-income', (d) => d.parent.data.name)
                .style('left', (d) => d.x0 + 'px')
                .style('top', (d) => d.y0 + 'px')
                .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
                .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
                .style('background', (d) => color[d.parent.data.name])

        nodesEnter.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            }) 

        this.dataNode.exit()
            .remove()

        this.dataNode.transition()
            .attr('class', (d) => `treemap__node treemap__node--${d.parent.data.name}`)
            .attr('data-income', (d) => d.parent.data.name)
            .style('left', (d) => d.x0 + 'px')
            .style('top', (d) => d.y0 + 'px')
            .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
            .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
            .style('background', (d) => color[d.parent.data.name])
            .selectAll('.treemap__node-text').remove()

        this.dataNode.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            }) 
        
        this.$tooltips = $('.treemap__node-text')
        this.nodes = d3.selectAll('.treemap__node')
    }

    switchMode() {
        this.modeSending = !this.modeSending
        this.update()
    }
}

export default Treemap
