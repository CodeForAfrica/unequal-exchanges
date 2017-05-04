import $                                from 'jquery'
import * as d3                          from 'd3'
import * as topojson                    from 'topojson'
import world                            from '../data/countries.json'
import moneyData                        from '../data/map.json'
import countryNames                     from '../data/country-names.json'
import throttle                         from '../utils/throttle.js'

const COLOR_BG = '#EAEAEA'
const COLOR_GREY = '#4F4F5B'
const COLOR_GOLD = '#DBA42A'
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
            console.log(WINDOW_HEIGHT, CONTAINER_HEIGHT)
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
                .attr('fill', this.mode === 'receiving' ? COLOR_GOLD : COLOR_GREY)
    }

    drawMap() {
        const PROJECTION = d3.geoEquirectangular()

        const PATH = d3.geoPath()
            .projection(PROJECTION)

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
                        return `translate(${PROJECTION(MISSING_COUNTRIES[d.country])})`
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
                        return PROJECTION(MISSING_COUNTRIES[d.country])[0]
                    } else {
                        const COUNTRY_PATH = COUNTRY_PATHS.filter((i) => {
                            return i.name === d.country
                        })
                        
                        return PATH.centroid(COUNTRY_PATH.data()[0])[0]
                    }
                })
                .attr('data-y', (d) => {
                    if (d.country === 'Bonaire, Sint Eustatius and Saba' || d.country === 'Gibraltar' || d.country === 'Kosovo') {
                        return PROJECTION(MISSING_COUNTRIES[d.country])[1]
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
            .attr('fill', COLOR_GOLD)
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
        
        const MODE_STRING = d[`sending_${this.year}`] > 0 && d[`receiving_${this.year}`] > 0 ? 'Sending / receiving country' : d[`sending_${this.year}`] > 0 ? 'Sending country' : 'Receiving country'

        if ((X > 510 && X < WIDTH - 350) || X < 350) {
            this.overlay = this.svg.append('g')
                .attr('id', `overlay-${d.id}`)
                .attr('transform', `translate(${X}, ${Y})`)
                .attr('style', 'filter:url(#dropshadow)')

            this.overlay.append('rect')
                .attr('width', 160)
                .attr('height', 84)
                .attr('x', 20)
                .attr('y', -42)
                .attr('fill', COLOR_WHITE)
                

            this.overlay.append('polyline')
                .attr('fill', COLOR_WHITE)
                .attr('points', '12 0 21 -5 21 5')

            this.overlay.append('text')
                .text(d.country.toUpperCase())
                .attr('font-size', d.country.length > 22 ? '7' : '11')
                .attr('font-family', 'proxima-nova')
                .attr('x', 40)
                .attr('y', -25)
                .attr('fill', COLOR_TEXT)
                .attr('dominant-baseline', 'hanging')

            this.overlay.append('text')
                .text(MODE_STRING)
                .attr('font-family', 'proxima-nova')
                .attr('font-size', '9')
                .attr('x', 40)
                .attr('y', -12)
                .attr('fill', COLOR_TEXT)
                .attr('dominant-baseline', 'hanging')

            if (d[`sending_${this.year}`] > 0) {
                this.overlay.append('circle')
                    .attr('cx', 44)
                    .attr('cy', 8)
                    .attr('r', 4)
                    .attr('fill', COLOR_GREY)
                this.overlay.append('text')
                    .text(d[`sending_${this.year}`] === 1 ? d[`sending_${this.year}`] + ' transaction' : d[`sending_${this.year}`] + ' transactions')
                    .attr('font-family', 'proxima-nova')
                    .attr('font-size', '11')
                    .attr('x', 55)
                    .attr('y', 2)
                    .attr('fill', COLOR_TEXT)
                    .attr('dominant-baseline', 'hanging')

                if (d[`receiving_${this.year}`] > 0) {
                    this.overlay.append('circle')
                        .attr('cx', 44)
                        .attr('cy', 22)
                        .attr('r', 4)
                        .attr('fill', COLOR_GOLD)
                    this.overlay.append('text')
                        .text(d[`receiving_${this.year}`] === 1 ? d[`receiving_${this.year}`] + ' transaction' : d[`receiving_${this.year}`] + ' transactions')
                        .attr('font-family', 'proxima-nova')
                        .attr('font-size', '11')
                        .attr('x', 55)
                        .attr('y', 16)
                        .attr('fill', COLOR_TEXT)
                        .attr('dominant-baseline', 'hanging')
                }
            } else {
                this.overlay.append('circle')
                    .attr('cx', 44)
                    .attr('cy', 8)
                    .attr('r', 4)
                    .attr('fill', COLOR_GOLD)
                this.overlay.append('text')
                    .text(d[`receiving_${this.year}`] === 1 ? d[`receiving_${this.year}`] + ' transaction' : d[`receiving_${this.year}`] + ' transactions')
                    .attr('font-family', 'proxima-nova')
                    .attr('font-size', '11')
                    .attr('x', 55)
                    .attr('y', 2)
                    .attr('fill', COLOR_TEXT)
                    .attr('dominant-baseline', 'hanging')
            }
        } else {
            this.overlay = this.svg.append('g')
                .attr('id', `overlay-${d.id}`)
                .attr('transform', `translate(${X - 180}, ${Y})`)
                .attr('style', 'filter:url(#dropshadow)')

            this.overlay.append('rect')
                .attr('width', 160)
                .attr('height', 84)
                .attr('x', 0)
                .attr('y', -42)
                .attr('fill', COLOR_WHITE)
                

            this.overlay.append('polyline')
                .attr('fill', COLOR_WHITE)
                .attr('points', '159 -5 159 5 168 0')

            this.overlay.append('text')
                .text(d.country.toUpperCase())
                .attr('font-size', '11')
                .attr('x', 20)
                .attr('y', -25)
                .attr('fill', COLOR_TEXT)
                .attr('dominant-baseline', 'hanging')

            this.overlay.append('text')
                .text(MODE_STRING)
                .attr('font-family', 'proxima-nova')
                .attr('font-size', '9')
                .attr('x', 20)
                .attr('y', -12)
                .attr('fill', COLOR_TEXT)
                .attr('dominant-baseline', 'hanging')

            if (d[`sending_${this.year}`] > 0) {
                this.overlay.append('circle')
                    .attr('cx', 24)
                    .attr('cy', 8)
                    .attr('r', 4)
                    .attr('fill', COLOR_GREY)
                this.overlay.append('text')
                    .text(d[`sending_${this.year}`] === 1 ? d[`sending_${this.year}`] + ' transaction' : d[`sending_${this.year}`] + ' transactions')
                    .attr('font-family', 'proxima-nova')
                    .attr('font-size', '11')
                    .attr('x', 35)
                    .attr('y', 2)
                    .attr('fill', COLOR_TEXT)
                    .attr('dominant-baseline', 'hanging')

                if (d[`receiving_${this.year}`] > 0) {
                    this.overlay.append('circle')
                        .attr('cx', 24)
                        .attr('cy', 22)
                        .attr('r', 4)
                        .attr('fill', COLOR_GOLD)
                    this.overlay.append('text')
                        .text(d[`receiving_${this.year}`] === 1 ? d[`receiving_${this.year}`] + ' transaction' : d[`receiving_${this.year}`] + ' transactions')
                        .attr('font-family', 'proxima-nova')
                        .attr('font-size', '11')
                        .attr('x', 35)
                        .attr('y', 16)
                        .attr('fill', COLOR_TEXT)
                        .attr('dominant-baseline', 'hanging')
                }
            } else {
                this.overlay.append('circle')
                    .attr('cx', 24)
                    .attr('cy', 8)
                    .attr('r', 4)
                    .attr('fill', COLOR_GOLD)
                this.overlay.append('text')
                    .text(d[`receiving_${this.year}`] === 1 ? d[`receiving_${this.year}`] + ' transaction' : d[`receiving_${this.year}`] + ' transactions')
                    .attr('font-family', 'proxima-nova')
                    .attr('font-size', '11')
                    .attr('x', 35)
                    .attr('y', 2)
                    .attr('fill', COLOR_TEXT)
                    .attr('dominant-baseline', 'hanging')
            }
        }
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
