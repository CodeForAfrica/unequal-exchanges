import $ from 'jquery'
import sendingCountries from '../data/transactions.json'
import * as d3 from 'd3'
import {COLOR_SENDING} from './globals'

let MAX_TOTAL = 0
const LINE_OPACITY = 0.2
let COUNTRY_WIDTH = 0

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
    }

    init() {
        this.addCountries()
        this.mouseEvents()
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

        this.calculateSizes()
    }

    calculateSizes() {
        COUNTRY_WIDTH = this.$countries.first().outerWidth()
        const linesList = new Array(sendingCountries.length)

        $.each(sendingCountries, (index, country) => {
            const $country = $(`#country-${country.id}`)
            const sendingWidth = COUNTRY_WIDTH * Math.sqrt($country.data('total') / MAX_TOTAL)
            $country.find('.transactions__sending').css({
                'width': sendingWidth, 
                'height': sendingWidth
            })

            const countryLeft = $country.offset().left + COUNTRY_WIDTH / 2
            const countryTop = $country.offset().top - this.$container.offset().top + 11 + $country.outerHeight() / 2 
    
            $.each(country.receiving_countries, (i, receivingCountry) => {
                const $receivingCountry = $(`#country-${receivingCountry.id}`)
                if (linesList[country.id] === undefined && linesList[receivingCountry.id] === undefined || 
                linesList[country.id] === undefined && linesList[country.id] !== undefined && !linesList[receivingCountry.id].includes(country.id) ||
                linesList[country.id] !== undefined && !linesList[country.id].includes(receivingCountry.id) && linesList[receivingCountry.id] === undefined ||
                linesList[country.id] !== undefined && linesList[receivingCountry.id] !== undefined && !linesList[country.id].includes(receivingCountry.id) && !linesList[receivingCountry.id].includes(country.id)) {
                    let bilateral = false
                    if(country.sending_countries.find((e) => { 
                        return e.id === receivingCountry.id 
                    }) !== undefined) {
                        bilateral = true
                    }
                    this.svg.append('line')
                        .attr('x1', countryLeft)
                        .attr('y1', countryTop)
                        .attr('x2', $receivingCountry.offset().left + COUNTRY_WIDTH / 2)
                        .attr('y2', $receivingCountry.offset().top - this.$container.offset().top + 11 + $country.outerHeight() / 2)
                        .data([{'sending': country.id, 'receiving': receivingCountry.id, 'bilateral': bilateral}])
                        .attr('stroke', COLOR_SENDING)
                        .attr('stroke-width', 1)
                        .attr('opacity', LINE_OPACITY)
                        .attr('class', 'country__line')
                    if (linesList[country.id] === undefined) {
                        linesList[country.id] = new Array(sendingCountries.length)
                    }
                    linesList[country.id].push(receivingCountry.id)
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
            const receivingIds = $(`#country-${id}`).data('receiving').toString().split(',')
            const receivingValues = $(`#country-${id}`).data('receivingValues').toString().split(',')
            
            $.each(receivingIds, (index, countryId) => {
                const $receivingCountry = $(`#country-${countryId}`)
                $receivingCountry.addClass('receiving')
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
                $.each(receivingIds, (index, countryId) => {
                    const $receivingCountry = $(`#country-${countryId}`)
                    const sendingWidth = COUNTRY_WIDTH * Math.sqrt($receivingCountry.data('total') / MAX_TOTAL)
                    $receivingCountry.find('.transactions__sending').css({
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
