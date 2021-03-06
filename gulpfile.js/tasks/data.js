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
                        countries[j].total += 1
                        countries[j].receiving_countries.push({
                            'id': null,
                            'name': data[i]['receiving_country'],
                            'value': 1
                        })
                        break;
                    }
                }
                if (!countryHasBeen) {
                    countries.push({
                        'id': null,
                        'name': data[i]['sending_country'],
                        'total': 1,
                        'receiving_total': 0,
                        'receiving_countries': [
                            {
                                'id': null,
                                'name': data[i]['receiving_country'],
                                'value': 1
                            }
                        ],
                        'sending_countries': []
                    });
                }
            }

            // countries.sort(function(a, b) {
            //     return parseFloat(b.total) - parseFloat(a.total);
            // });

            for (var m = 0; m < countries.length; m++) {
                countries[m].id = m
                ids[m] = countries[m].name
            }

            for(var k = 0; k < countries.length; k++) {
                for(var l = 0; l < countries[k].receiving_countries.length; l++) {
                    countries[k].receiving_countries[l].id = ids.indexOf(countries[k].receiving_countries[l].name);
                }
            }

            for(var i = 0; i < data.length; i++) {
                let index = countries.map(function(e) { return e.name; }).indexOf(data[i]['receiving_country']);
                countries[index].sending_countries.push({
                    'id': ids.indexOf(data[i]['sending_country']),
                    'name': data[i]['sending_country'],
                    'value': 1
                })
                countries[index].receiving_total += 1
            }

            fs.writeFile(join(config.scripts.src, 'data/transactions.json'), JSON.stringify(countries), function(err) {
                console.log(err);
            });
        });
    },

    treemaps: function() {
        var countries = [
            {'name': 'HIC', 'children': []},
            {'name': 'UMIC', 'children': []},
            {'name': 'LMIC', 'children': []}
        ]
        fs.readFile(join(config.scripts.src, 'data/chord-transactions.json'), 'utf8', function(err, data) {
            data = JSON.parse(data);
            for(var i = 0; i < data.length; i++) {
                var sendingIndex = countries.map(function(e) { return e.name; }).indexOf(data[i]['sending_income']);
                var receivingIndex = countries.map(function(e) { return e.name; }).indexOf(data[i]['receiving_income']);

                if (sendingIndex >= 0) {
                    var sendingExists = countries[sendingIndex].children.map(function(e) { return e.name; }).indexOf(data[i]['sending_country'])
                    if (sendingExists >= 0) {
                        countries[sendingIndex]['children'][sendingExists]['sending'] += 1
                    } else {
                        countries[sendingIndex]['children'].push({
                            'name': data[i]['sending_country'],
                            'sending': 1,
                            'receiving': 0,
                            'income': countries[sendingIndex]['name']
                        })
                    }
                }
                if (receivingIndex >= 0) {
                    var receivingExists = countries[receivingIndex].children.map(function(e) { return e.name; }).indexOf(data[i]['receiving_country'])
                    if (receivingExists >= 0) {
                        countries[receivingIndex]['children'][receivingExists]['receiving'] += 1
                    } else {
                        countries[receivingIndex]['children'].push({
                            'name': data[i]['receiving_country'],
                            'sending': 0,
                            'receiving': 1,
                            'income': countries[receivingIndex]['name']
                        })
                    }
                }
            }

            for(var j = 0; j < countries.length; j ++) {
                countries[j]['children'].sort(function(a, b) {
                    return parseFloat(b.sending) - parseFloat(a.sending);
                });
            }

            // console.log(sending[0].children.length + sending[1].children.length + sending[2].children.length) 
            // console.log(receiving[0].children.length + receiving[1].children.length + receiving[2].children.length)

            var trees = [
                {'name': 'Countries', 'children': countries}
            ]

            fs.writeFile(join(config.scripts.src, 'data/treemaps.json'), JSON.stringify(trees), function(err) {
                console.log(err);
            });
        })
    }
};
