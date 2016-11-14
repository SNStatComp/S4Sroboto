/*jslint node: true */
//var elasticsearch = require('elasticsearch'),
var async = require('async'),
	_ = require('underscore');
//    client = new elasticsearch.Client({
//       host: 'localhost:9200' //,
//      //log: 'trace'
//    });

var LinkSelector = function (options, ESclient) {
  	this._seen = [];
  	this._options = options;
  	this._ESclient = ESclient;
	var self = this;
  	return function(links, context, callback) {
		_Selector(self, links, context, callback)
	}
};

LinkSelector.prototype._select = function (url, search, maxLinks, cb) {
  var searchObject = {
    "fields": ["url", "linkText"],
    "size": maxLinks,
    "query": {
      "bool": {
        "must": [
          {
            "has_parent": {
              "parent_type": "page",
              "query": {
                "ids": {
                  "type": "page",
                  "values": [ url ]
                }
              }
            }
          },
          {
            "bool": {
              "should": [
                {
                  "match": {
                    "linkTextNgram": {
                      "query": search.substring,
                      "minimum_should_match": "80%"
                    }
                  }
		        },
                {
                  "match": { "linkText": search.terms }
                },
                {
                  "match": { "url": search.terms }
                }//,
//                {
//                  "match_phrase": { "linkText": search.phrase }
//                }
              ]
            }
          }
        ]
      }
    }
  };

  this._ESclient.search({
      index: this._ESIndex,
      body: searchObject
    },
    function (err, response) {
      var res = {
        urls: [],
        total: response.hits.total
      };
      async.each(response.hits.hits, function (hit) {
        res.urls.push(hit.fields.url[0]);
      });
      cb(res);
    });
};

var _Selector = function (self, links, context, callback) {
  var seen = self._seen,
    select = self._select,
    ESIndex = self._options.ESIndex,
    siteId = self._options.siteId,
    search = self._options.search,
    maxLinks = self._options.maxLinks,
	client = self._ESclient;
  client.create({
      'index': ESIndex,
      'type': 'page',
      'id': context.currentLink.href,
      'body': {
        'siteId': siteId,
        'url': context.currentLink.href,
        'body': context.response.body
      }
    },
    function (err, response) {
      async.eachSeries(links, function (link, cb) {
          if (!_.contains(seen, link.url)) {
            seen.push(link.url);
            client.create({
                'index': ESIndex,
                'type': 'link',
                'id': link.url,
                'parent': context.currentLink.href,
                'body': {
                  'siteId': siteId,
                  'url': link.url,
                  'linkText': link.linkText,
                  'linkTextNgram': link.linkText
                }
              },
              function (err, response) {
                if (err) {
                  return cb(err);
                }
                cb();
              });
          } else {
            cb();
          }
        },
        function (err) {
          if (err) {
            return callback([],err);
          }
          setTimeout(function () {
            select(
              context.currentLink.href,
              search,
              maxLinks,
              function (sel) {
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

    });
};

exports = module.exports = LinkSelector;
