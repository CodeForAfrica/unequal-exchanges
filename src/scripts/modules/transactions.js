import $                                from 'jquery'
import sendingCountries                 from '../data/transactions.json'
import * as d3                          from 'd3'
import {COLOR_SENDING}                  from './globals'
import throttle                         from '../utils/throttle.js'

let MAX_TOTAL = 0
const LINE_OPACITY = 0.2
let COUNTRY_WIDTH = 0
let COUNTRY_HEIGHT = 0
let LINES_ARRAY = []

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
    }

    init() {
        this.addCountries()
        this.calculateSizes()
        this.drawLines()
        this.mouseEvents()

        throttle('resize', 'resize.transactions')
        this.$window.on('resize.transactions', () => {
            this.resize()
        })
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
            if ($country.hasClass('receiving')) {
                const rIndex = receivingIds.indexOf($country.data('id'))
                const receivingWidth = COUNTRY_WIDTH * Math.sqrt(receivingValues[rIndex] / MAX_TOTAL)
                $country.find('.transactions__sending').css({
                    'width': receivingWidth,
                    'height': receivingWidth
                })
            } else if (!$country.hasClass('hide')) {
                const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
                $country.find('.transactions__sending').css({
                    'width': sendingWidth, 
                    'height': sendingWidth
                })
            }
        })

        d3.selectAll('.country__line')
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('x2', (d) => {
                return $(`#country-${d.receiving}`).offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y2', (d) => {
                return $(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
    }

    drawLines() {
        let lines = this.svg.selectAll('.country__line')
            .data(LINES_ARRAY)

        let enterSel = lines.enter()
            .append('line')
            .attr('x1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y1', (d) => {
                let $country = $(`#country-${d.sending}`)
                return $country.offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('x2', (d) => {
                return $(`#country-${d.receiving}`).offset().left + COUNTRY_WIDTH / 2
            })
            .attr('y2', (d) => {
                return $(`#country-${d.receiving}`).offset().top - this.$container.offset().top + 11 + COUNTRY_HEIGHT / 2
            })
            .attr('stroke', COLOR_SENDING)
            .attr('stroke-width', 1)
            .attr('opacity', LINE_OPACITY)
            .attr('class', 'country__line') 
        lines.merge(enterSel)
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

    addCountries() {
        $.each(sendingCountries, (index, country) => {
            const $countryDiv = $(`<div><span class="transactions__name">${country.name}</span><span class="transactions__sending"></span><span class="transactions__receiving"></span></div>`)
            $countryDiv.addClass('transactions__country')
            $countryDiv.attr('id', 'country-' + country.id)
            $countryDiv.attr('data-total', country.total)
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

            MAX_TOTAL = country.total > MAX_TOTAL ? country.total : MAX_TOTAL

            this.$container.append($countryDiv)           
        })

        this.$countries = $('.transactions__country')
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
            d3.selectAll('.country__line')
                .filter(function(d) {
                    let id = $country.data('id')
                    return d.sending === id || (d.receiving === id && d.bilateral)
                })
                .transition()
                    .duration(350)
                    .attr('opacity', 1)
        })

        this.$countries.on('click.select', (e) => {
            this.$countries.off('mouseover')
            this.$countries.off('mouseout')
            this.$countries.off('click.select')
            const $country = $(e.currentTarget).addClass('active')
            const id = $country.data('id')
            this.$activeName.text($country.data('name'))
            this.$activeTotal.text($country.data('total'))
            this.$active.addClass('active')
            this.$countries.not(`#country-${id}`).addClass('hide')
                .find('.transactions__sending').css({
                    'width': 0,
                    'height': 0
                })
            const receivingIds = $(`#country-${id}`).data('receiving').toString().split(',')
            const receivingValues = $(`#country-${id}`).data('receivingValues').toString().split(',')
            
            $.each(receivingIds, (index, countryId) => {
                const $receivingCountry = $(`#country-${countryId}`)
                $receivingCountry.addClass('receiving').removeClass('hide')
                const receivingWidth = COUNTRY_WIDTH * Math.sqrt(receivingValues[index] / MAX_TOTAL)
                $receivingCountry.find('.transactions__sending').css({
                    'width': receivingWidth,
                    'height': receivingWidth
                })
            })

            d3.selectAll('.country__line')
                .filter(function(d) {
                    return d.sending !== id && (d.receiving !== id || !d.bilateral)
                })
                .transition()
                    .duration(350)
                    .attr('opacity', 0)

            
            d3.selectAll('.country__line')
                .filter(function(d) {
                    return d.sending === id || (d.receiving === id && d.bilateral)
                })
                .transition()
                    .duration(350)
                    .attr('opacity', 1)

            this.$active.on('click.deselect', () => {
                this.$active.off('click.deselect')
                this.$active.removeClass('active')
                this.$countries.removeClass('hide receiving active')
                d3.selectAll('.country__line')
                    .transition()
                        .duration(350)
                        .attr('opacity', LINE_OPACITY)
                        .on('end', (d, i) => {
                            if (i === this.$countries.length - 1) {
                                this.mouseEvents()
                            }
                        })
                // $.each(receivingIds, (index, countryId) => {
                $('.transactions__sending').each((index, element) => {
                    const $circle = $(element)
                    const $country = $circle.parents('.transactions__country')
                    const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
                    $country.find('.transactions__sending').css({
                        'width': sendingWidth, 
                        'height': sendingWidth
                    })
                })
            })
        })

        this.$countries.on('mouseout', () => { 
            d3.selectAll('.country__line')
                .transition()
                    .duration(350)
                    .attr('opacity', LINE_OPACITY)
        })
    }
}

export default Transactions
