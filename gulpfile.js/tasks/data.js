var fs           = require("fs");
var join         = require('path').join;
var config       = require('../config');

module.exports = {
    sort: function() {
        var countries = new Array();
        var ids = new Array();
        fs.readFile(join(config.scripts.src, 'data/chord-transactions.json'), 'utf8', function(err, data) {
            data = JSON.parse(data);
            
            for(var i = 0; i < data.length; i++) {
                var countryHasBeen = false;
                for(var j = 0; j < countries.length; j++) {
                    if (countries[j].name === data[i]['sending_country']) {
                        countryHasBeen = true
                        countries[j].total += parseInt(data[i]['sending_total'], 10)
                        countries[j].receiving_countries.push({
                            'id': null,
                            'name': data[i]['receiving_country'],
                            'value': parseInt(data[i]['sending_total'], 10)
                        })
                        break;
                    }
                }
                if (!countryHasBeen) {
                    countries.push({
                        'id': null,
                        'name': data[i]['sending_country'],
                        'total': parseInt(data[i]['sending_total'], 10),
                        'receiving_countries': [
                            {
                                'id': null,
                                'name': data[i]['receiving_country'],
                                'value': parseInt(data[i]['sending_total'], 10)
                            }
                        ]
                    });
                }
            }

            countries.sort(function(a, b) {
                return parseFloat(b.total) - parseFloat(a.total);
            });

            for (var m = 0; m < countries.length; m++) {
                countries[m].id = m
                ids[m] = countries[m].name
            }

            for(var k = 0; k < countries.length; k++) {
                for(var l = 0; l < countries[k].receiving_countries.length; l++) {
                    countries[k].receiving_countries[l].id = ids.indexOf(countries[k].receiving_countries[l].name);
                }
            }

            fs.writeFile(join(config.scripts.src, 'data/transactions.json'), JSON.stringify(countries), function(err) {
                console.log(err);
            });
        });
    }
};
