import $                                from 'jquery'
import sendingCountries                 from '../data/transactions.json'
import * as d3                          from 'd3'
import PubSub                           from 'pubsub-js'
import throttle                         from '../utils/throttle.js'

let MAX_TOTAL = 0
let COUNTRY_WIDTH = 0
let COUNTRY_HEIGHT = 0
let CANVAS_ARRAY = []
const COLOR_LINES = 216
const COLOR_LINES_DARK = 165

class Transactions {
    constructor() {
        this.$container = $('.transactions__countries')
        this.$countries = null
        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.canvas = null
        this.customBase = null
        this.custom = null
        this.$canvas = $('.transactions__canvas-container')
        this.modeSending = true
        this.$active = $('.transactions__active')
        this.$activeName = $('.transactions__active__name')
        this.$activeTotal = $('.transactions__active__total')
        this.$activeClose = $('.transactions__active__close')
        this.$window = $(window)
        this.$instructions = $('.transactions__instruction')
        this.$circles = $('.transactions__sending')
    }

    init() {
        this.addCountries()
        this.calculateSizes()
        this.setupCanvas()
        this.databind()
        this.draw()
        this.mouseEvents()

        PubSub.subscribe('keyChanged', this.switchMode.bind(this))

        throttle('resize', 'resize.transactions')
        this.$window.on('resize.transactions', () => {
            this.resize()
        })
    }

    switchMode() {
        if (this.modeSending) {
            this.$circles.removeClass('transactions__sending').addClass('transactions__receiving')  
            this.$circles.each((index, element) => {
                const $circle = $(element)
                const $country = $circle.parents('.transactions__country')
                const receivingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('receivingTotal') / MAX_TOTAL)
                $circle.css({
                    'width': receivingWidth, 
                    'height': receivingWidth
                })
            })
        } else {
            this.$circles.addClass('transactions__sending').removeClass('transactions__receiving')  
            this.$circles.each((index, element) => {
                const $circle = $(element)
                const $country = $circle.parents('.transactions__country')
                const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
                $circle.css({
                    'width': sendingWidth, 
                    'height': sendingWidth
                })
            }) 
        }

        for(let i = 0; i < CANVAS_ARRAY.length; i++) {
            if (this.modeSending && !CANVAS_ARRAY[i].bilateral) {
                CANVAS_ARRAY[i].status = 'hidden'    
            } else {
                CANVAS_ARRAY[i].status = 'neutral'
            }
        }

        this.refreshCanvas()
        
        this.modeSending = !this.modeSending
    }

    resize() {
        COUNTRY_WIDTH = this.$countries.first().outerWidth()
        COUNTRY_HEIGHT = this.$countries.first().outerHeight()

        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()

        this.canvas.attr('width', this.width * 2)
            .attr('height', this.height * 2)

        const $activeCountry = $('.transactions__country.active')
        let receivingIds = null
        let receivingValues = null
        if ($activeCountry.length > 0) {
            receivingIds = $('.transactions__country.active').data('receiving').toString().split(',')
            receivingValues = $('.transactions__country.active').data('receivingValues').toString().split(',')    
        }
        
        $('.transactions__sending').each((index, element) => {
            const $circle = $(element)
            const $country = $circle.parents('.transactions__country')
            if ($country.hasClass('linked')) {
                const rIndex = receivingIds.indexOf($country.data('id'))
                const receivingWidth = COUNTRY_WIDTH * Math.sqrt(receivingValues[rIndex] / MAX_TOTAL)
                $country.find('.transactions__sending, .transactions__receiving').css({
                    'width': receivingWidth,
                    'height': receivingWidth
                })
            } else if (!$country.hasClass('hide')) {
                const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
                $country.find('.transactions__sending, .transactions__receiving').css({
                    'width': sendingWidth, 
                    'height': sendingWidth
                })
            }
        })

        this.refreshCanvas()
    }

    setupCanvas() {
        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.canvas = d3.select('.transactions__canvas-container')
            .append('canvas')
            .classed('transactions__canvas', true)
            .attr('width', this.width * 2)
            .attr('height', this.height * 2)
        this.customBase = document.createElement('custom')
        this.custom = d3.select(this.customBase)
    }

    databind() {
        let join = this.custom.selectAll('custom.line')
            .data(CANVAS_ARRAY)

        const canvasLeft = this.$canvas.offset().left
        
        let enterSel = join.enter()
            .append('custom')
            .attr('class', 'line')
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return 2 * Math.floor($country.offset().left + COUNTRY_WIDTH / 2 - canvasLeft) + 0.5
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return 2 * Math.floor($country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('x2', (d) => {
                return 2 * Math.floor($(`#country-${d.receiving}`).offset().left + COUNTRY_WIDTH / 2 - canvasLeft) + 0.5
            })
            .attr('y2', (d) => {
                return 2 * Math.floor($(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('stroke-width', 1)
            .attr('stroke', (d) => {
                if (d.status === 'active') {
                    return COLOR_LINES_DARK
                } else {
                    return COLOR_LINES
                }
            })
            .attr('opacity', (d) => {
                if (d.status === 'hidden') {
                    return 0
                } else {
                    return 1
                }
            })

        join.merge(enterSel)
            .transition()
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return 2 * Math.floor($country.offset().left + COUNTRY_WIDTH / 2 - canvasLeft) + 0.5
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return 2 * Math.floor($country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('x2', (d) => {
                return 2 * Math.floor($(`#country-${d.receiving}`).offset().left + COUNTRY_WIDTH / 2 - canvasLeft) + 0.5
            })
            .attr('y2', (d) => {
                return 2 * Math.floor($(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2) + 0.5
            })
            .attr('stroke', (d) => {
                if (d.status === 'active') {
                    return COLOR_LINES_DARK
                } else {
                    return COLOR_LINES
                }
            })
            .attr('opacity', (d) => {
                if (d.status === 'hidden') {
                    return 0
                } else {
                    return 1
                }
            })
    }

    draw() {
        // build context
        let context = this.canvas.node().getContext('2d')

        // clear canvas
        context.clearRect(0, 0, this.width * 2, this.height * 2)

        const elements = this.custom.selectAll('custom.line')
        
        elements.each(function() { // for each virtual/custom element...
            const node = d3.select(this)
            context.strokeStyle = `rgba(${node.attr('stroke')}, ${node.attr('stroke')}, ${node.attr('stroke')}, ${node.attr('opacity')})`
            context.lineWidth = node.attr('stroke-width')
            context.beginPath()
            context.moveTo(node.attr('x1'), node.attr('y1'))
            context.lineTo(node.attr('x2'), node.attr('y2'))
            context.stroke()
        })
    }

    addCountries() {
        $.each(sendingCountries, (index, country) => {
            const $countryDiv = $(`<div><span class="transactions__name">${country.name}</span><span class="transactions__count"></span><span class="transactions__sending"></span></div>`)
            $countryDiv.addClass('transactions__country')
            $countryDiv.attr('id', 'country-' + country.id)
            $countryDiv.attr('data-total', country.total)
            $countryDiv.attr('data-receiving-total', country.receiving_total)
            $countryDiv.attr('data-id', country.id)
            $countryDiv.attr('data-name', country.name)
            $countryDiv.attr('data-sending-country-count', country.sending_countries.length)
            $countryDiv.attr('data-receiving-country-count', country.receiving_countries.length)
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
            $countryDiv.attr('data-sending', () => {
                let sendingArray = []
                $.each(country.sending_countries, (index, sendingCountry) => {
                    sendingArray.push(sendingCountry.id)
                })
                return sendingArray
            })
            $countryDiv.attr('data-sending-values', () => {
                let sendingArray = []
                $.each(country.sending_countries, (index, sendingCountry) => {
                    sendingArray.push(sendingCountry.value)
                })
                return sendingArray
            })

            MAX_TOTAL = country.total > MAX_TOTAL ? country.total : MAX_TOTAL
            MAX_TOTAL = country.receiving_total > MAX_TOTAL ? country.receiving_total : MAX_TOTAL

            this.$container.append($countryDiv)           
        })

        this.$circles = $('.transactions__sending')
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

    refreshCanvas(callback = false) {
        this.databind()

        let t = d3.timer((elapsed) => {
         
            this.draw()
      
            if (elapsed > 350) {
                t.stop()

                if (callback !== false) {
                    callback()
                }
            }
        })
    }

    mouseEvents() {
        this.$countries.on('mouseenter', (e) => {
            const $country = $(e.currentTarget)
            const id = $country.data('id')
            for(let i = 0; i < CANVAS_ARRAY.length; i++) {
                let entry = CANVAS_ARRAY[i]
                if (this.modeSending) {
                    if (entry.sending === id || (entry.receiving === id && entry.bilateral)) {
                        CANVAS_ARRAY[i].status = 'active'
                    }
                } else {
                    if (entry.receiving === id || (entry.sending === id && entry.bilateral)) {
                        CANVAS_ARRAY[i].status = 'active'
                    }
                }
            }
            this.refreshCanvas()
        })

        this.$countries.on('mouseleave', () => { 
            for(let i = 0; i < CANVAS_ARRAY.length; i++) {
                if (this.modeSending || CANVAS_ARRAY[i].bilateral) {
                    CANVAS_ARRAY[i].status = 'neutral'
                }
            }
            this.refreshCanvas()
        })

        this.$countries.on('click.select', (e) => {
            this.$countries.off('mouseenter')
            this.$countries.off('mouseleave')
            this.$countries.off('click.select')
            
            const $country = $(e.currentTarget).addClass('active')
            const id = $country.data('id')
            const modeString = this.modeSending ? 'receiving' : 'sending'
            this.$activeName.text($country.data('name'))
            const count = $country.data(`${modeString}CountryCount`)
            const countString =  count > 1 ? `${count} countries` : `${count} country`
            if (this.modeSending) {
                this.$activeTotal.text(`reports to send ${$country.data('total')} transactions to ${countString}`)
            } else {
                this.$activeTotal.text(`reports to receive ${$country.data('receivingTotal')} transactions from ${countString}`)
            }
            this.$active.addClass('active')
            this.$instructions.addClass('hide')
            this.$countries.not(`#country-${id}`).addClass('hide')
                .find('.transactions__sending, .transactions__receiving').css({
                    'width': 0,
                    'height': 0
                })
            const $activeCountry = $(`#country-${id}`)
            
            const linkedIds = $activeCountry.data(modeString).toString().split(',')
            const linkedValues = $activeCountry.data(`${modeString}Values`).toString().split(',')
            
            $.each(linkedIds, (index, countryId) => {
                const $linkedCountry = $(`#country-${countryId}`)
                $linkedCountry.addClass('linked').removeClass('hide')
                $linkedCountry.find('.transactions__count').text(`${linkedValues[index]}`)
                const linkedWidth = COUNTRY_WIDTH * Math.sqrt(linkedValues[index] / MAX_TOTAL)
                $linkedCountry.find('.transactions__sending, .transactions__receiving').css({
                    'width': linkedWidth,
                    'height': linkedWidth
                })
            })

            for(let i = 0; i < CANVAS_ARRAY.length; i++) {
                const d = CANVAS_ARRAY[i]
                if(this.modeSending) {
                    if (d.sending !== id && (d.receiving !== id || !d.bilateral)) {
                        CANVAS_ARRAY[i].status = 'hidden'
                    }
                } else {
                    if (d.receiving !== id && (d.sending !== id || !d.bilateral)) {
                        CANVAS_ARRAY[i].status = 'hidden'
                    }
                }
            }

            this.refreshCanvas()

            this.$active.on('click.deselect', () => {
                this.deselect()
            })

            $('.transactions__country.hide').on('click.deselect', () => {
                this.deselect()
            })
        })
    }

    deselect() {
        this.$countries.off('click.select')
        this.$active.off('click.deselect')
        $('.transactions__country.hide').off('click.deselect')
        this.$active.removeClass('active')
        this.$countries.removeClass('hide linked active')
        this.$instructions.removeClass('hide')

        for(let i = 0; i < CANVAS_ARRAY.length; i++) {
            const d = CANVAS_ARRAY[i]
            if (this.modeSending) {
                CANVAS_ARRAY[i].status = 'neutral'
            } else {
                if (d.bilateral) {
                    CANVAS_ARRAY[i].status = 'neutral'
                } else {
                    CANVAS_ARRAY[i].status = 'hidden'
                }
            }
        }

        this.refreshCanvas(this.mouseEvents.bind(this))

        // $.each(receivingIds, (index, countryId) => {
        this.$circles.each((index, element) => {
            const $circle = $(element)
            const $country = $circle.parents('.transactions__country')
            let circleWidth = COUNTRY_WIDTH * Math.sqrt($country.data('receivingTotal') / MAX_TOTAL)
            if (this.modeSending) {
                circleWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
            }
            $circle.css({
                'width': circleWidth, 
                'height': circleWidth
            })
        })
    }
}

export default Transactions
