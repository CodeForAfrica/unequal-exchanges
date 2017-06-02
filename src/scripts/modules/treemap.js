import $                                from 'jquery'
import * as d3                          from 'd3'
import {COLOR_SENDING, COLOR_RECEIVING} from './globals'
import PubSub                           from 'pubsub-js'
import data                             from '../data/treemaps.json'
import throttle                         from '../utils/throttle'

const COLORS_SENDING = {'HIC': COLOR_SENDING, 'UMIC': '#71B9CB', 'LMIC': '#95CBD7'}
const COLORS_RECEIVING = {'HIC': COLOR_RECEIVING, 'UMIC': '#E3B753', 'LMIC': '#EBC97D'}
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
        this.windowWidth = this.$window.outerWidth()
        this.root = null
        this.mobile = false
        this.tree = null
        this.data = DATA
        this.dataNode = null
        this.activeIncome = null
        this.$labels = this.$container.find('.treemap__label')
        this.mouseX = 0
        this.mouseY = 0
    }

    init() {
        if (window.matchMedia('(max-width: 1000px)').matches) {
            this.mobile = true
            this.height = 1.5 * this.width
        }

        this.setupGraph()
        this.$container.on('click', '.treemap__node', this.zoomIn.bind(this))
        this.$page.on('click', '.treemap__label:not(.treemap__label--back)', this.zoomIn.bind(this))
        this.$page.on('click', '.treemap__label--back', this.zoomOut.bind(this))

        PubSub.subscribe('keyChanged', this.switchMode.bind(this))

        throttle('resize', 'resize.treemap')
        this.$window.on('resize.treemap', this.resize.bind(this))

        throttle('mousemove', 'mousemove.treemap')
        this.$window.on('mousemove.treemap', this.positionTooltip.bind(this))
    }

    zoomIn(e) {
        this.activeIncome = $(e.currentTarget).data('income')
        this.$page.addClass('active')
        this.resize()
        this.$container.addClass(`treemap__container--${this.activeIncome} treemap__container--active`)
        this.update()
    }

    zoomOut() {
        this.$container.removeClass(`treemap__container--${this.activeIncome} treemap__container--active`)
        this.$page.removeClass('active')
        this.resize()
        this.activeIncome = null
        this.update()
    }

    positionTooltip(e) {
        this.mouseX = e.clientX
        this.mouseY = e.clientY
        this.$tooltips.removeAttr('style')
        
        if (this.mouseX > this.windowWidth / 2) {
            this.$tooltips.css({
                top: this.mouseY + 'px',
                left: (this.mouseX - 20) + 'px',
                transform: 'translateX(-100%)'
            })
        } else {
            this.$tooltips.css({
                top: this.mouseY + 'px',
                left: (this.mouseX + 20) + 'px',
                transform: 'none'
            })
        }
    }

    resize() {
        this.width = this.$container.outerWidth()

        if (window.matchMedia('(max-width: 1000px)').matches) {
            this.mobile = true
            this.height = 1.5 * this.width
        } else if (this.$page.hasClass('active')) {
            this.height = 0.58 * (this.width - 145)
        } else {
            this.height = 0.58 * this.width
        }

        this.windowWidth = this.$window.outerWidth()
        this.update()
    }

    setupGraph() {
        this.treemap = d3.treemap().size([this.width, this.height]).paddingOuter(5).paddingInner(0)

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
                    .style('background', (d) => {
                        return this.modeSending ? COLORS_SENDING[d.parent.data.name] : COLORS_RECEIVING[d.parent.data.name]
                    })
                    .style('border', (d) => {
                        if (this.modeSending) {
                            return d.sending > 0 ? '1px solid white' : 'none'
                        } else {
                            return d.receiving > 0 ? '1px solid white' : 'none'
                        }
                    })

        nodes.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            })
            .style('display', 'none')

        nodes.append('span')
            .attr('class', 'treemap__country-name')
            .text((d) => {
                if (Math.max(0, d.x1 - d.x0 - 1) * Math.max(0, d.y1 - d.y0  - 1) > 4200) {
                    return d.data.name
                } else {
                    return ''
                }
            })


        this.$tooltips = $('.treemap__node-text')
        this.nodes = d3.selectAll('.treemap__node')
    }

    update() {
        this.treemap = d3.treemap().size([this.width, this.height]).paddingOuter(5).paddingInner(0)

        this.root = d3.hierarchy(this.data, (d) => d.children)
            .sum((d) => {
                if (this.activeIncome === null) {
                    return this.modeSending ? d.sending : d.receiving
                } else if (d.income === this.activeIncome) {
                    return this.modeSending ? d.sending : d.receiving
                } else {
                    return 0
                }
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
                .style('background', (d) => {
                    return this.modeSending ? COLORS_SENDING[d.parent.data.name] : COLORS_RECEIVING[d.parent.data.name]
                })
                .style('border', (d) => {
                    if (this.modeSending) {
                        return d.sending > 0 ? '1px solid white' : 'none'
                    } else {
                        return d.receiving > 0 ? '1px solid white' : 'none'
                    }
                })

        nodesEnter.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            })
            .style('display', 'none')

        nodesEnter.append('span')
            .attr('class', 'treemap__country-name')
            .text((d) => {
                if (Math.max(0, d.x1 - d.x0 - 1) * Math.max(0, d.y1 - d.y0  - 1) > 4200) {
                    return d.data.name
                } else {
                    return ''
                }
            })

        this.dataNode.exit()
            .remove()

        this.dataNode.transition().duration(350)
            .attr('class', (d) => `treemap__node treemap__node--${d.parent.data.name}`)
            .attr('data-income', (d) => d.parent.data.name)
            .style('left', (d) => d.x0 + 'px')
            .style('top', (d) => d.y0 + 'px')
            .style('width', (d) => Math.max(0, d.x1 - d.x0 - 1) + 'px')
            .style('height', (d) => Math.max(0, d.y1 - d.y0  - 1) + 'px')
            .style('background', (d) => {
                return this.modeSending ? COLORS_SENDING[d.parent.data.name] : COLORS_RECEIVING[d.parent.data.name]
            })
            .selectAll('.treemap__node-text, .treemap__country-name').remove()

        this.dataNode.append('span')
            .attr('class', 'treemap__node-text')
            .text((d) => {
                return this.modeSending ? `${d.data.name} ${d.data.sending} transactions` : `${d.data.name} ${d.data.receiving} transactions`
            })
            .style('display', 'none')

        this.dataNode.append('span')
            .attr('class', 'treemap__country-name')
            .text((d) => {
                if (Math.max(0, d.x1 - d.x0 - 1) * Math.max(0, d.y1 - d.y0  - 1) > 4200) {
                    return d.data.name
                } else {
                    return ''
                }
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
