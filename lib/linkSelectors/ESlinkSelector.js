/*jslint node: true */
//var elasticsearch = require('elasticsearch'),
var async = require('async'),
    _ = require('underscore');
//    client = new elasticsearch.Client({
//       host: 'localhost:9200' //,
//      //log: 'trace'
//    });

var LinkSelector = function(options, ESclient) {
    this._seen = [];
    this._options = options;
    this._ESclient = ESclient;
    var self = this;
    return function(links, context, callback) {
        _Selector(self, links, context, callback)
    }
};

var _select = function(self, url, search, maxLinks, cb) {
		var ESIndex = self._options.ESIndex,
			client = self._ESclient;

    var should = search.map(function (phrase) {
      return {"match_phrase": {"linkText": phrase}}
    });

    search.forEach(function (phrase) {
      should.push({"match": {"url": phrase}})
    });

    var searchObject = {
        "query": {
            "bool": {
                "should": should,
                //  [
                //     {
                //     //     "match": {
                //     //         "linkText.ngram": {
                //     //             "query": search.substring,
                //     //             "minimum_should_match": "80%"
                //     //         }
                //     //     }
                //     // }, {
                //         "match": { "linkText": search.terms }
                //     }, {
                //         "match": { "url": search.terms }
                //     } //,
                //     //                {
                //     //                  "match_phrase": { "linkText": search.phrase }
                //     //                }
                // ],
                "filter":
                  {
                    "term": { "pageUrl": url }
                  }
            }
        }
    };
    var res = {
      urls: [],
      total: response.hits.total
    };

    client.search({
        index: ESIndex,
        scroll: '30s',
        body: searchObject
    }, function getMoreUntilDone(err, response) {
        var maxHits;
        async.each(response.hits.hits, function(hit) {
            res.urls.push(hit._source.url);
        });
        if (maxLinks != '') {
          maxHits = Math.min(response.hits.total,maxLinks);
        } else {
          maxHits = response.hits.total;
        }
        if (maxHits > res.urls.length) {
          // ask elasticsearch for the next set of hits from this search
          client.scroll({
            scrollId: response._scroll_id,
            scroll: '30s'
          }, getMoreUntilDone);
        } else {
          cb(res);
        }
    });
};

var _Selector = function(self, links, context, callback) {
    var seen = self._seen,
        select = self._select,
        ESIndex = self._options.ESIndex,
        siteId = self._options.siteId,
        search = self._options.search,
        maxLinks = self._options.maxLinks,
				client = self._ESclient;

        async.eachSeries(links, function(link, cb) {
            if (!_.contains(seen, link.url)) {
                seen.push(link.url);
                client.create({
                    'index': ESIndex,
                    'type': 'link',
                    'id': link.url,
                    'body': {
                        'siteId': siteId,
												'pageUrl': context.currentLink.href,
                        'url': link.url,
                        'linkText': link.linkText
                    }
                }, function(err, response) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
            } else {
                cb();
            }
        }, function(err) {
            if (err) {
                return callback([], err);
            }
            setTimeout(function() {
                _select(self, context.currentLink.href, search, maxLinks, function(sel) {
                    //                console.log(sel);
                    callback(sel.urls, null);
                });
            }, 2000);
        });
        /*
              return links.map(function (link) {
                return link.url;
              });
      */
};

exports = module.exports = LinkSelector;
