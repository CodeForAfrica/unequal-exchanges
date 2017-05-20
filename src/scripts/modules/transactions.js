import $ from 'jquery'
import sendingCountries from '../data/transactions.json'

let MAX_TOTAL = 0

class Transactions {
    constructor() {
        this.container = $('.transactions__container')
    }
    init() {
        this.addCountries()
        this.mouseEvents()
    }

    addCountries() {
        $.each(sendingCountries, (index, country) => {
            const $countryDiv = $('<div><span class="transactions__name">' + country.name + '</span><span class="transactions__sending"></span><span class="transactions__receiving"></span></div>')
            $countryDiv.addClass('transactions__country')
            $countryDiv.attr('id', 'country-' + country.id)
            $countryDiv.attr('data-total', country.total)
            $countryDiv.attr('data-id', country.id)

            MAX_TOTAL = country.total > MAX_TOTAL ? country.total : MAX_TOTAL
            
            this.container.append($countryDiv)
        })
    }

    mouseEvents() {
        $('.transactions__country').on('mouseover', (e) => {
            const $target = $(e.currentTarget)
            const id = $target.data('id')
            const width = $target.outerWidth()
            const sendingWidth = width * Math.sqrt($target.data('total') / MAX_TOTAL)
            $target.find('.transactions__sending').css({
                'width': sendingWidth, 
                'height': sendingWidth
            })
            const receivingCountries = sendingCountries[id].receiving_countries
            $.each(receivingCountries, (index, country) => {
                const receivingWidth = width * Math.sqrt(country.value / MAX_TOTAL)
                $('#country-' + country.id).find('.transactions__receiving').css({
                    'width': receivingWidth,
                    'height': receivingWidth
                })
            }) 
        })

        $('.transactions__country').on('mouseout', () => { 
            $('.transactions__sending, .transactions__receiving').removeAttr('style')
        })
    }
}

export default Transactions
