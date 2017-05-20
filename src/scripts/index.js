import $                                from 'jquery'
import Map                              from './modules/map'
import Transactions                     from './modules/transactions'

if ($('.map').length > 0) {
    const map = new Map()
    map.init()    
}

if ($('.transactions').length > 0) {
    const transactions = new Transactions()
    transactions.init()    
}
