var elasticsearch = require('elasticsearch');
var _ = require('underscore');

exports = module.exports = function(options) {

    // Reasonable defaults
    var options = _.extend({
        host: '127.0.0.1', port: '9200', index: '', type: 'page'
        //    fieldMap: {}
    }, options);

    return function(item, done) {
        try {
            var es = new elasticsearch.Client({
                "host": options.host + ':' + options.port
            })
        } catch (err) {
            done(err);
        }
        es.exists({
            'index': options.index,
            'type': options.type,
            'id': item.url
        }, function(err, exists) {
            if (exists === false) {
                es.create({
                    'index': options.index,
                    'type': options.type,
                    'id': item.url,
                    'body': {
                        'siteId': item.siteId,
                        'url': item.url,
                        'bodytext': item.bodytext,
                        'links': item.links,
                        'special': item.special
                    }
                }, function(err, response) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                })
            } else {
                done();
            }
        })
    };
}
