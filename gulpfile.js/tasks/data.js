// var data = require('../../src/scripts/data/chord-transactions.json');
var fs           = require("fs");
var join         = require('path').join;
var config       = require('../config');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
// var jsonfile = require('jsonfile');

module.exports = {
    sort: function() {
        var countries = new Array();
        var ids = new Array();
        fs.readFile(join(config.scripts.src, 'data/chord-transactions.json'), 'utf8', function(err, data) {
            data = JSON.parse(data);
            var total = 0;
            for(var i = 0; i < data.length; i++) {
                var countryHasBeen = false;
                for(var j = 0; j < countries.length; j++) {
                    if (countries[j].name === data[i]['sending_country']) {
                        console.log('match')
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
                        'id': total,
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
                    total += 1;
                    ids.push(data[i]['sending_country']);
                }
            }

            for(var k = 0; k < countries.length; k++) {
                for(var l = 0; l < countries[k].receiving_countries.length; l++) {
                    countries[k].receiving_countries[l].id = ids.indexOf(countries[k].receiving_countries[l].name);
                }
            }

                // if(typeof(countries[data[i]['sending_country']]) == 'undefined') {
                //     countries.push({
                //         'name': 
                //     })
                //     countries[data[i]['sending_country']] = new Array();
                //     countries[data[i]['sending_country']].total = parseInt([data[i]['sending_total']], 10);
                //     countries[data[i]['sending_country']].receiving_countries = new Array();
                //     countries[data[i]['sending_country']]['receiving_countries'][data[i]['receiving_country']] = parseInt([data[i]['sending_total']], 10);
                // } else {
                //     countries[data[i]['sending_country']].total += parseInt([data[i]['sending_total']], 10);
                //     countries[data[i]['sending_country']]['receiving_countries'][data[i]['receiving_country']] = parseInt([data[i]['sending_total']], 10);
                // }

            // console.log(countries)

            console.log(JSON.stringify(countries));
            fs.writeFile(join(config.scripts.src, 'data/transactions.json'), JSON.stringify(countries), function(err) {
                console.log(err);
            });
            
            // var file = join(config.scripts.src, 'data/transactions.json');
            // jsonfile.writeFileSync(file, JSON.stringify(countries));
        });

        // fs.readFile(join(config.scripts.src, 'data/transactions.json'), 'utf-8', function(err, data) {
        //     if (err) throw err

        //     var arrayOfObjects = JSON.parse(data)
        //     arrayOfObjects.users.push({
        //         name: "Mikhail",
        //         age: 24
        //     })

        //     console.log(arrayOfObjects)

        //     fs.writeFile(join(config.scripts.src, 'data/transactions.json'), JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
        //         if (err) throw err
        //         console.log('Done!')
        //     })
        // })
    }
};
