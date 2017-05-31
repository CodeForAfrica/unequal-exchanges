import $                                from 'jquery'
import sendingCountries                 from '../data/transactions.json'
import * as d3                          from 'd3'
import PubSub                           from 'pubsub-js'
import throttle                         from '../utils/throttle.js'

let MAX_TOTAL = 0
let COUNTRY_WIDTH = 0
let COUNTRY_HEIGHT = 0
let LINES_ARRAY = []
let MODE_SENDING = true
const COLOR_LINES = '#D8D8D8'
const COLOR_LINES_DARK = '#A5A5A5'


class Transactions {
    constructor() {
        this.$container = $('.transactions__countries')
        this.$countries = null
        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.svg = d3.select('.transactions__svg')
        this.$active = $('.transactions__active')
        this.$activeName = $('.transactions__active__name')
        this.$activeTotal = $('.transactions__active__total')
        this.$activeClose = $('.transactions__active__close')
        this.$window = $(window)
        this.$instructions = $('.transactions__instruction')
        this.$circles = $('.transactions__sending')
        this.lines = null
    }

    init() {
        this.addCountries()
        this.calculateSizes()
        this.drawLines()
        this.mouseEvents()

        PubSub.subscribe('keyChanged', this.switchMode.bind(this))

        throttle('resize', 'resize.transactions')
        this.$window.on('resize.transactions', () => {
            this.resize()
        })
    }

    switchMode() {
        if (MODE_SENDING) {
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
            
            this.lines.attr('opacity', (d) => {
                if (d.bilateral) {
                    return 1
                } else {
                    return 0
                }
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

            this.lines.attr('opacity', 1)
        }
        
        MODE_SENDING = !MODE_SENDING
    }

    resize() {
        COUNTRY_WIDTH = this.$countries.first().outerWidth()
        COUNTRY_HEIGHT = this.$countries.first().outerHeight()

        this.width = this.$container.outerWidth()
        this.height = this.$container.outerHeight()
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`)

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

        this.lines
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().left + COUNTRY_WIDTH / 2 - this.$container.offset().left
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('x2', (d) => {
                return $(`#country-${d.receiving}`).offset().left - this.$container.offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y2', (d) => {
                return $(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
    }

    drawLines() {
        let lines = this.svg.selectAll('.country__line')
            .data(LINES_ARRAY)

        lines.enter()
            .append('line')
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().left + COUNTRY_WIDTH / 2 - this.$container.offset().left
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('x2', (d) => {
                return $(`#country-${d.receiving}`).offset().left - this.$container.offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y2', (d) => {
                return $(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('stroke', COLOR_LINES)
            .attr('stroke-width', 1)
            .attr('class', 'country__line') 
        
        this.lines = d3.selectAll('.country__line')
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
            $countryDiv.attr('data-receiving', () => {
                let receivingArray = []
                $.each(country.receiving_countries, (index, receivingCountry) => {
                    receivingArray.push(receivingCountry.id)
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

        this.$countries = $('.transactions__country')
        this.$circles = $('.transactions__sending')
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
            
            $.each(country.receiving_countries, (i, receivingCountry) => {
                if (LINES_ARRAY.find((e) => {
                    return e.sending === receivingCountry.id && e.receiving === country.id
                }) === undefined) {
                    let bilateral = $.grep(country.sending_countries, (e) => {
                        return e.id === receivingCountry.id 
                    }).length > 0
                    LINES_ARRAY.push({
                        'sending': country.id, 
                        'receiving': receivingCountry.id, 
                        'bilateral': bilateral, 
                        'status': 'neutral'
                    })
                }
            })
        })
        this.height = this.$container.outerHeight()
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`)
    }

    mouseEvents() {
        this.$countries.on('mouseover', (e) => {
            const $country = $(e.currentTarget)

            this.lines
                .filter(function(d) {
                    let id = $country.data('id')
                    if (MODE_SENDING) {
                        return d.sending === id || (d.receiving === id && d.bilateral)
                    } else {
                        return d.receiving === id || (d.sending === id && d.bilateral)
                    }
                })
                .raise()
                .transition()
                    .duration(350)
                    .attr('stroke', COLOR_LINES_DARK)
                    // .attr('opacity', (d) => {
                    //     if (MODE_SENDING) {
                    //         return 1
                    //     } else {
                    //         if (d.bilateral) {
                    //             return 1
                    //         } else {
                    //             return 0
                    //         }
                    //     }
                    // })
        })

        this.$countries.on('click.select', (e) => {
            this.$countries.off('mouseover')
            this.$countries.off('mouseout')
            this.$countries.off('click.select')
            const $country = $(e.currentTarget).addClass('active')
            const id = $country.data('id')
            this.$activeName.text($country.data('name'))
            if (MODE_SENDING) {
                this.$activeTotal.text(`${$country.data('total')} transactions`)
            } else {
                this.$activeTotal.text(`${$country.data('receivingTotal')} transactions`)
            }
            this.$active.addClass('active')
            this.$instructions.addClass('hide')
            this.$countries.not(`#country-${id}`).addClass('hide')
                .find('.transactions__sending, .transactions__receiving').css({
                    'width': 0,
                    'height': 0
                })
            const $activeCountry = $(`#country-${id}`)
            const modeString = MODE_SENDING ? 'receiving' : 'sending'
            const linkedIds = $activeCountry.data(modeString).toString().split(',')
            const linkedValues = $activeCountry.data(`${modeString}Values`).toString().split(',')
            
            $.each(linkedIds, (index, countryId) => {
                const $linkedCountry = $(`#country-${countryId}`)
                $linkedCountry.addClass('linked').removeClass('hide')
                $linkedCountry.find('.transactions__count').text(`${linkedValues[index]} transactions`)
                const linkedWidth = COUNTRY_WIDTH * Math.sqrt(linkedValues[index] / MAX_TOTAL)
                $linkedCountry.find('.transactions__sending, .transactions__receiving').css({
                    'width': linkedWidth,
                    'height': linkedWidth
                })
            })

            this.lines
                .filter(function(d) {
                    if (MODE_SENDING) {
                        return d.sending !== id && (d.receiving !== id || !d.bilateral)
                    } else {
                        return d.receiving !== id && (d.sending !== id || !d.bilateral)
                    }
                })
                .transition()
                    .duration(350)
                    .attr('opacity', 0)

            
            this.lines
                .filter(function(d) {
                    if (MODE_SENDING) {
                        return d.sending === id || (d.receiving === id && d.bilateral)
                    } else {
                        return d.receiving === id || (d.sending === id && d.bilateral)
                    }
                })
                .transition()
                    .duration(350)
                    .attr('opacity', 1)
                    .attr('stroke', COLOR_LINES)

            this.$active.on('click.deselect', () => {
                this.$active.off('click.deselect')
                this.$active.removeClass('active')
                this.$countries.removeClass('hide linked active')
                this.$instructions.removeClass('hide')
                this.lines
                    .transition()
                        .duration(350)
                        .attr('opacity', (d) => {
                            if (MODE_SENDING) {
                                return 1
                            } else {
                                if (d.bilateral) {
                                    return 1
                                } else {
                                    return 0
                                }
                            }
                        })
                        .attr('stroke', COLOR_LINES)
                        .on('end', (d, i) => {
                            if (i === this.$countries.length - 1) {
                                this.mouseEvents()
                            }
                        })
                // $.each(receivingIds, (index, countryId) => {
                this.$circles.each((index, element) => {
                    const $circle = $(element)
                    const $country = $circle.parents('.transactions__country')
                    let circleWidth = COUNTRY_WIDTH * Math.sqrt($country.data('receivingTotal') / MAX_TOTAL)
                    if (MODE_SENDING) {
                        circleWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
                    }
                    $circle.css({
                        'width': circleWidth, 
                        'height': circleWidth
                    })
                })
            })
        })

        this.$countries.on('mouseout', () => { 
            this.lines
                .transition()
                    .duration(350)
                    .attr('opacity', (d) => {
                        if (MODE_SENDING) {
                            return 1
                        } else {
                            if (d.bilateral) {
                                return 1
                            } else {
                                return 0
                            }
                        }
                    })
                    .attr('stroke', COLOR_LINES)
        })
    }
}

export default Transactions
