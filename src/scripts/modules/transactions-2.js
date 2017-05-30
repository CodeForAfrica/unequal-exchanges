import $ from 'jquery'
import sendingCountries from '../data/transactions.json'
import * as d3 from 'd3'

let MAX_TOTAL = 0
const LINE_OPACITY = 0.2
let COUNTRY_WIDTH = 0
let COUNTRY_HEIGHT = 0
let CANVAS_ARRAY = []

class Transactions {
    constructor() {
        this.$container = $('.transactions__countries')
        this.$countries = null
        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.canvas = null
        this.customBase = null
        this.custom = null
    }

    init() {
        this.addCountries()
        this.mouseEvents()
        this.setupCanvas()
        this.databind()
        this.draw()
    }

    setupCanvas() {
        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.canvas = d3.select('.transactions__canvas-container')
            .append('canvas')
            .classed('transactions__canvas', true)
            .attr('width', this.width)
            .attr('height', this.height)
        this.customBase = document.createElement('custom')
        this.custom = d3.select(this.customBase)
    }

    databind() {
        let join = this.custom.selectAll('custom.line')
            .data(CANVAS_ARRAY)
        
        let enterSel = join.enter()
            .append('custom')
            .attr('class', 'line')
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return Math.floor($country.offset().left + COUNTRY_WIDTH / 2) + 0.5
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return Math.floor($country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('x2', (d) => {
                return Math.floor($(`#country-${d.receiving}`).offset().left + COUNTRY_WIDTH / 2) + 0.5
            })
            .attr('y2', (d) => {
                return Math.floor($(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('stroke-width', 1)
            .attr('opacity', (d) => {
                if (d.status === 'neutral') {
                    return LINE_OPACITY
                } else if (d.status === 'active') {
                    return 1
                } else {
                    return 0
                }
            })

        join.merge(enterSel)
            .transition()
            .attr('opacity', (d) => {
                if (d.status === 'neutral') {
                    return LINE_OPACITY
                } else if (d.status === 'active') {
                    return 1
                } else {
                    return 0
                }
            })
    }

    draw() {
        // build context
        let context = this.canvas.node().getContext('2d')

        // clear canvas
        context.clearRect(0, 0, this.width, this.height)

        const elements = this.custom.selectAll('custom.line')
        
        elements.each(function() { // for each virtual/custom element...
            const node = d3.select(this)
            context.strokeStyle = `rgba(70, 80, 100, ${node.attr('opacity')})`
            context.lineWidth = node.attr('stroke-width')
            context.beginPath()
            context.moveTo(node.attr('x1'), node.attr('y1'))
            context.lineTo(node.attr('x2'), node.attr('y2'))
            context.stroke()
        })
    }

    addCountries() {
        $.each(sendingCountries, (index, country) => {
            const $countryDiv = $(`<div><span class="transactions__name">${country.name}</span><span class="transactions__sending"></span><span class="transactions__receiving"></span></div>`)
            $countryDiv.addClass('transactions__country')
            $countryDiv.attr('id', 'country-' + country.id)
            $countryDiv.attr('data-total', country.total)
            $countryDiv.attr('data-id', country.id)
            $countryDiv.attr('data-receiving', () => {
                let receivingArray = []
                $.each(country.receiving_countries, (index, receivingCountry) => {
                    receivingArray.push(receivingCountry.id)
                    if ($.grep(CANVAS_ARRAY, (e) => {
                        return e.sending === receivingCountry.id && e.receiving === country.id
                    }).length <= 0) {
                        let bilateral = $.grep(country.sending_countries, (e) => {
                            return e.id === receivingCountry.id 
                        }).length > 0
                        CANVAS_ARRAY.push({
                            'sending': country.id, 
                            'receiving': receivingCountry.id, 
                            'bilateral': bilateral, 
                            'status': 'neutral'
                        })
                    }
                })
                return receivingArray
            })
            $countryDiv.attr('data-receiving-values', () => {
                let receivingArray = []
                $.each(country.receiving_countries, (index, receivingCountry) => {
                    receivingArray.push(receivingCountry.value)
                })
                return receivingArray
            })

            MAX_TOTAL = country.total > MAX_TOTAL ? country.total : MAX_TOTAL

            this.$container.append($countryDiv)           
        })

        this.$countries = $('.transactions__country')

        this.calculateSizes()
    }

    calculateSizes() {
        COUNTRY_WIDTH = this.$countries.first().outerWidth()
        COUNTRY_HEIGHT = this.$countries.first().outerHeight()

        $.each(sendingCountries, (index, country) => {
            const $country = $(`#country-${country.id}`)
            const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
            $country.find('.transactions__sending').css({
                'width': sendingWidth, 
                'height': sendingWidth
            })
        })

        this.height = this.$container.outerHeight()
    }

    refreshCanvas() {
        this.databind()

        let t = d3.timer((elapsed) => {
         
            this.draw()
      
            if (elapsed > 350) {
                t.stop()
            }
        })
    }

    mouseEvents() {
        this.$countries.on('mouseenter', (e) => {
            const $country = $(e.currentTarget)
            const id = $country.data('id')
            for(let i = 0; i < CANVAS_ARRAY.length; i++) {
                let entry = CANVAS_ARRAY[i]
                if (entry.sending === id || (e.receiving === id && e.bilateral)) {
                    CANVAS_ARRAY[i].status = 'active'
                }
            }
            this.refreshCanvas()
        })

        this.$countries.on('mouseout', () => { 
            for(let i = 0; i < CANVAS_ARRAY.length; i++) {
                CANVAS_ARRAY[i].status = 'neutral'
            }
            this.refreshCanvas()
        })

        // this.$countries.on('click.select', (e) => {
        //     this.$countries.off('mouseover')
        //     this.$countries.off('mouseout')
        //     this.$countries.off('click.select')
        //     const $country = $(e.currentTarget)
        //     const id = $country.data('id')
        //     this.$countries.not(`#country-${id}`).addClass('hide')
        //     const receivingIds = $(`#country-${id}`).data('receiving').toString().split(',')
        //     const receivingValues = $(`#country-${id}`).data('receivingValues').toString().split(',')
            
        //     $.each(receivingIds, (index, countryId) => {
        //         const $receivingCountry = $(`#country-${countryId}`)
        //         $receivingCountry.addClass('receiving')
        //         const receivingWidth = COUNTRY_WIDTH * Math.sqrt(receivingValues[index] / MAX_TOTAL)
        //         $receivingCountry.find('.transactions__sending').css({
        //             'width': receivingWidth,
        //             'height': receivingWidth
        //         })
        //     })

        //     d3.selectAll('.country__line')
        //         .filter(function(d) {
        //             return d.sending !== id && (d.receiving !== id || !d.bilateral)
        //         })
        //         .transition()
        //             .duration(350)
        //             .attr('opacity', 0)

            
        //     d3.selectAll('.country__line')
        //         .filter(function(d) {
        //             return d.sending === id || (d.receiving === id && d.bilateral)
        //         })
        //         .transition()
        //             .duration(350)
        //             .attr('opacity', 1)

        //     this.$countries.on('click.deselect', () => {
        //         this.$countries.off('click.deselect')
        //         this.$countries.removeClass('hide receiving')
        //         d3.selectAll('.country__line')
        //             .transition()
        //                 .duration(350)
        //                 .attr('opacity', LINE_OPACITY)
        //                 .on('end', (d, i) => {
        //                     if (i === this.$countries.length - 1) {
        //                         this.mouseEvents()
        //                     }
        //                 })
        //         $.each(receivingIds, (index, countryId) => {
        //             const $receivingCountry = $(`#country-${countryId}`)
        //             const sendingWidth = COUNTRY_WIDTH * Math.sqrt($receivingCountry.data('total') / MAX_TOTAL)
        //             $receivingCountry.find('.transactions__sending').css({
        //                 'width': sendingWidth,
        //                 'height': sendingWidth
        //             })
        //         })
        //     })
        // })
    }
}

export default Transactions
