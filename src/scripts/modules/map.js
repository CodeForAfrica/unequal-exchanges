import $                                from 'jquery'
import * as d3                          from 'd3'
import * as topojson                    from 'topojson'
import world                            from '../data/countries.json'
import moneyData                        from '../data/map.json'
import countryNames                     from '../data/country-names.json'
import throttle                         from '../utils/throttle.js'
import {COLOR_SENDING, COLOR_RECEIVING} from './globals'

const COLOR_BG = '#EAEAEA'
const COLOR_WHITE = '#FFFFFF'
const COLOR_TEXT = '#3A3A3A'
const MAX_YEAR = 2018
const START_YEAR = 2010
const WIDTH = 960
const HEIGHT = 410
const MISSING_COUNTRIES = {
    'Bonaire, Sint Eustatius and Saba': [-68.2385, 12.1784],
    'Gibraltar': [-5.3525700, 36.1447400],
    'Kosovo': [20.9030, 42.6026]
}

class Map {
    constructor() {
        this.svg = d3.select('.map').attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
        this.radiusScale = d3.scaleLinear().domain([1, 113]).range([1, 15])
        this.mode = 'receiving'
        this.yearInterval = null
        this.year = START_YEAR
        this.$yearTracker = $('.map__year-tracker')
        this.$start = $('.map__start')
        this.circleGroups = null
        this.overlay = null
        this.startText = $('.map__start-text')
        this.$window = $(window)
        this.$infographic = $('.map__infographic')
        this.$timeline = $('.map__timeline')
        this.$container = $('.map__container')
    }

    init() {
        this.svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', COLOR_BG)
        this.drawMap()
        this.checkHeight()

        this.$start.on('click', this.timeline.bind(this))

        $('.map__key-item').on('click', this.switchMode.bind(this))

        $('.map__year-marker').on('click', (e) => {
            this.moveToYear($(e.currentTarget).data('year'))
        })

        this.$yearTracker.on('change', () => {
            this.moveToYear(this.$yearTracker.val())
        })

        throttle('resize', 'resize.map')
        this.$window.on('resize.map', () => {
            this.checkHeight()
        })
    }

    checkHeight() {
        const WINDOW_HEIGHT = this.$window.outerHeight()
        if (this.$infographic.outerHeight() > WINDOW_HEIGHT) {
            const CONTAINER_HEIGHT = this.$container.outerHeight()
            this.$infographic.css('height', WINDOW_HEIGHT > CONTAINER_HEIGHT ? WINDOW_HEIGHT : CONTAINER_HEIGHT)
            this.$timeline.addClass('absolute')
        } else {
            this.$infographic.removeAttr('style')
            this.$timeline.removeClass('absolute')
        }
    }

    switchMode(e) {
        const $TARGET = $(e.currentTarget)
        if ($TARGET.hasClass('active')) {
            return
        }

        $TARGET.addClass('active').siblings().removeClass('active')
        this.mode = this.mode === 'receiving' ? 'sending' : 'receiving'

        d3.selectAll('.map__marker')
            .transition()
            .duration(300)
                .attr('r', (d) => {
                    return d[`${this.mode}_${this.year}`] > 0 ? this.radiusScale(d[`${this.mode}_${this.year}`]) : 0
                })
                .attr('fill', this.mode === 'receiving' ? COLOR_RECEIVING : COLOR_SENDING)
    }

    drawMap() {
        const projection = d3.geoEquirectangular()

        const PATH = d3.geoPath()
            .projection(projection)

        const COUNTRIES = topojson.feature(world, world.objects.countries).features
        
        const COUNTRY_PATHS = this.svg.selectAll('.map__country')
            .data(COUNTRIES)
            .enter().append('path')
                .attr('class', 'map__country')
                .attr('d', PATH)
                .attr('stroke', COLOR_BG)
                .attr('fill', '#FFF')
                .attr('data-name', (d) => {
                    d.name = countryNames[0][d.id]
                    return countryNames[0][d.id]
                })

        this.circleGroups = this.svg.selectAll('.map__group')
            .data(moneyData)
            .enter().append('g')
                .attr('transform', (d) => {
                    if (d.country === 'Bonaire, Sint Eustatius and Saba' || d.country === 'Gibraltar' || d.country === 'Kosovo') {
                        return `translate(${projection(MISSING_COUNTRIES[d.country])})`
                    } else {
                        const COUNTRY_PATH = COUNTRY_PATHS.filter((i) => {
                            return i.name === d.country
                        })
                        
                        return `translate(${PATH.centroid(COUNTRY_PATH.data()[0])})`
                    }
                })
                .attr('data-country', (d) => d.country)
                .attr('data-x', (d) => {
                    if (d.country === 'Bonaire, Sint Eustatius and Saba' || d.country === 'Gibraltar' || d.country === 'Kosovo') {
                        return projection(MISSING_COUNTRIES[d.country])[0]
                    } else {
                        const COUNTRY_PATH = COUNTRY_PATHS.filter((i) => {
                            return i.name === d.country
                        })
                        
                        return PATH.centroid(COUNTRY_PATH.data()[0])[0]
                    }
                })
                .attr('data-y', (d) => {
                    if (d.country === 'Bonaire, Sint Eustatius and Saba' || d.country === 'Gibraltar' || d.country === 'Kosovo') {
                        return projection(MISSING_COUNTRIES[d.country])[1]
                    } else {
                        const COUNTRY_PATH = COUNTRY_PATHS.filter((i) => {
                            return i.name === d.country
                        })
                        
                        return PATH.centroid(COUNTRY_PATH.data()[0])[1]
                    }
                })
                .attr('class', 'map__group')
                .on('mouseover', this.showOverlay.bind(this))
                .on('mouseout', this.hideOverlay.bind(this))


        
        this.circleGroups.append('circle')
            .attr('r', (d) => {
                return d[`receiving_${START_YEAR}`] > 0 ? this.radiusScale(d[`receiving_${START_YEAR}`]) : 0
            })
            .attr('fill', COLOR_RECEIVING)
            .attr('class', 'map__marker')
            .attr('opacity', 0.7)
    }

    hideOverlay(d) {
        d3.select(`#overlay-${d.id}`).remove()
    }

    showOverlay(d) {
        if (window.matchMedia('(max-width: 640px)').matches) {
            return
        }
        
        const X = parseInt($(`[data-country="${d.country}"]`).data('x'))
        const Y = parseInt($(`[data-country="${d.country}"]`).data('y'))
        const SHOW_RIGHT = (X > 510 && X < WIDTH - 350) || X < 350

        this.addOverlayGroup(SHOW_RIGHT, X, Y, d)
        this.addOverlayBox(SHOW_RIGHT)
        this.addOverlayNubbin(SHOW_RIGHT)
        this.addOverlayCountryText(SHOW_RIGHT, d)
        this.addOverlayCountryType(SHOW_RIGHT, d)

        if (d[`sending_${this.year}`] > 0) {     
            this.addOverlayTransactionsCircle(COLOR_SENDING, 8, SHOW_RIGHT)       
            this.addOverlayTransactionsText(d[`sending_${this.year}`], 2, SHOW_RIGHT)

            if (d[`receiving_${this.year}`] > 0) {
                this.addOverlayTransactionsCircle(COLOR_RECEIVING, 22, SHOW_RIGHT)
                this.addOverlayTransactionsText(d[`receiving_${this.year}`], 16, SHOW_RIGHT)
            }
        } else {
            this.addOverlayTransactionsCircle(COLOR_RECEIVING, 8, SHOW_RIGHT)
            this.addOverlayTransactionsText(d[`receiving_${this.year}`], 2, SHOW_RIGHT)
        }
    }

    addOverlayGroup(SHOW_RIGHT, X, Y, d) {
        this.overlay = this.svg.append('g')
            .attr('id', `overlay-${d.id}`)
            .attr('transform', SHOW_RIGHT ? `translate(${X}, ${Y})` : `translate(${X - 180}, ${Y})`)
            .attr('style', 'filter:url(#dropshadow)')
    }

    addOverlayBox(SHOW_RIGHT) {
        this.overlay.append('rect')
            .attr('width', 160)
            .attr('height', 84)
            .attr('x', SHOW_RIGHT ? 20 : 0)
            .attr('y', -42)
            .attr('fill', COLOR_WHITE)
    }

    addOverlayNubbin(SHOW_RIGHT) {
        this.overlay.append('polyline')
            .attr('fill', COLOR_WHITE)
            .attr('points', SHOW_RIGHT ? '12 0 21 -5 21 5' : '159 -5 159 5 168 0')
    }

    addOverlayCountryText(SHOW_RIGHT, d) {
        this.overlay.append('text')
            .text(d.country.toUpperCase())
            .attr('font-size', d.country.length > 22 ? '7' : '11')
            .attr('font-family', 'proxima-nova')
            .attr('x', SHOW_RIGHT ? 40 : 20)
            .attr('y', -25)
            .attr('fill', COLOR_TEXT)
            .attr('dominant-baseline', 'hanging')
    }

    addOverlayCountryType(SHOW_RIGHT, d) {
        const MODE_STRING = d[`sending_${this.year}`] > 0 && d[`receiving_${this.year}`] > 0 ? 'Sending / receiving country' : d[`sending_${this.year}`] > 0 ? 'Sending country' : 'Receiving country'
        this.overlay.append('text')
            .text(MODE_STRING)
            .attr('font-family', 'proxima-nova')
            .attr('font-size', '9')
            .attr('x', SHOW_RIGHT ? 40 : 20)
            .attr('y', -12)
            .attr('fill', COLOR_TEXT)
            .attr('dominant-baseline', 'hanging')
    }

    addOverlayTransactionsCircle(color, y, SHOW_RIGHT) {
        this.overlay.append('circle')
            .attr('cx', SHOW_RIGHT ? 44 : 24)
            .attr('cy', y)
            .attr('r', 4)
            .attr('fill', color)
    }

    addOverlayTransactionsText(value, y, SHOW_RIGHT) {
        this.overlay.append('text')
            .text(value === 1 ? value + ' transaction' : value + ' transactions')
            .attr('font-family', 'proxima-nova')
            .attr('font-size', '11')
            .attr('x', SHOW_RIGHT ? 55 : 35)
            .attr('y', y)
            .attr('fill', COLOR_TEXT)
            .attr('dominant-baseline', 'hanging')
    }

    timeline(e) {
        const $TARGET = $(e.currentTarget)
        
        if ($TARGET.hasClass('pause')) {
            $TARGET.removeClass('pause')
            clearInterval(this.yearInterval)
            if (this.year === MAX_YEAR) {
                $TARGET.addClass('reset')
                this.startText.text('Reset')
            } else {
                $TARGET.removeClass('reset')
                this.startText.text('Animate')
            }
        } else if ($TARGET.hasClass('reset')) {
            this.moveToYear(START_YEAR)
        } else {
            $TARGET.removeClass('reset')
            $TARGET.addClass('pause')
            this.startText.text('Pause')
            this.yearInterval = setInterval(() => {
                this.year += 1
                d3.selectAll('.map__marker')
                    .transition()
                        .duration(1000)
                        .attr('r', (d) => d[`${this.mode}_${this.year}`] > 0 ? this.radiusScale(d[`${this.mode}_${this.year}`]) : 0)

                this.$yearTracker.val(this.year)

                if(this.year >= MAX_YEAR) { 
                    clearInterval(this.yearInterval) 
                    $TARGET.removeClass('pause')
                    this.startText.text('Reset')
                    $TARGET.addClass('reset')
                }
            }, 1000)
        }
    }

    moveToYear(year) {
        this.year = parseInt(year)
        clearInterval(this.yearInterval)
        this.$start.removeClass('pause')
        if (this.year === MAX_YEAR) {
            this.$start.addClass('reset')
            this.startText.text('Reset')
        } else {
            this.$start.removeClass('reset')
            this.startText.text('Animate')
        }
        
        d3.selectAll('.map__marker')
            .transition()
                .duration(1000)
                .attr('r', (d) => d[`${this.mode}_${this.year}`] > 0 ? this.radiusScale(d[`${this.mode}_${this.year}`]) : 0)

        this.$yearTracker.val(this.year)
    }
}

export default Map
