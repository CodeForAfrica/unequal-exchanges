import $                                from 'jquery'
import Key                              from './modules/key'
import Map                              from './modules/map'
import Transactions                     from './modules/transactions'

if ($('.exchanges__key').length > 0) {
    const key = new Key()
    key.init()
}

if ($('.map').length > 0) {
    const map = new Map()
    map.init()    
}

if ($('.transactions').length > 0) {
    const transactions = new Transactions()
    transactions.init()    
}
