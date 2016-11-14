/*jslint node: true */
var roboto = require("./roboto.js"),
    ESlinkSelector = require('./linkSelectors/ESlinkSelector.js'),
    tldjs = require('tldjs'),
    csv = require('fast-csv'),
    async = require('async'),
    elasticsearch = require('elasticsearch'),
    EventEmitter = require('events');

/**
 * @classdesc Focused crawler based on roboto. Elasticsearch is used to select the most promissing outlinks
 * @extends EventEmitter
 */
class S4Scrawler extends EventEmitter {
    /**
     * Create instance of class S4Scrawler
     * @constructor
     * @param {none}
     *
     */
    constructor() {
        super();
        this._ESIndex = '';
        this._ESclient = null;
    }

    /**
     * Create a connection to the Elasticsearch cluster
     * @return {Promise|string} A promise returning a success or an error message
     */
    connectToES() {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!self._ESclient) {
                self._ESclient = new elasticsearch.Client({
                    host: 'localhost:9200'
                });
                self._ESclient.ping({requestTimeout: Infinity})
                .then(function (response) {
                    resolve('success')
                })
                .catch(function (err) {
                    if (err) {
                        self._ESclient = null;
                        reject('Elasticsearch cluster is down');
                    } else {
                        resolve('success');
                    }
                });
            } else {
                resolve('success');
            }
        })
    }

    /**
     * Set the Elasticsearch index to be used. This index must exist.
     * @param  {string} index The name of the index
     * @return {Promise|string} A promise returning the name of the index or an error message
     */
    useESIndex(index) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!self._ESclient) {
                reject('Not connected to Elasticsearch cluster');
            } else {
                self._ESclient.indices.exists({"index": index},
                    function(err, response, status) {
                        if (err) {
                            reject(err.message)
                        } else {
                            if (response === true) {
                                self._ESIndex = index;
                                resolve(index);
                            } else {
                                reject('Index ' + index + ' does not exist');
                            };
                        };
                });
            };
        });
    }

    /**
     * Create a new crawling index in Elasticsearch
     * @param  {index} index Name of the index
     * @return {Promise|string} A promise containing a success or an error message
     */
     createESIndex(index) {
        var self = this;
        return new Promise(
            function(resolve, reject) {
                if (!self._ESclient) {}
                self._ESclient = new elasticsearch.Client({
                    host: 'localhost:9200'
                });
                self._ESclient.indices.create({
                        index: index,
                        body: {
                            "mappings": {
                                "page": {
                                    "properties": {
                                        "siteId": { "type": "string" },
                                        "url": { "type": "string" },
                                        "body": { "type": "string" }
                                    }
                                },
                                "link": {
                                    "_parent": { "type": "page" },
                                    "properties": {
                                        "siteId": { "type": "string" },
                                        "url": { "type": "string" },
                                        "linkText": { "type": "string" },
                                        "linkTextNgram": {
                                            "type": "string",
                                            "analyzer": "trigrams"
                                        }
                                    }
                                }
                            },
                            "settings": {
                                "analysis": {
                                    "filter": {
                                        "trigrams_filter": {
                                            "type": "ngram",
                                            "min_gram": 3,
                                            "max_gram": 3
                                        }
                                    },
                                    "analyzer": {
                                        "trigrams": {
                                            "type": "custom",
                                            "tokenizer": "standard",
                                            "filter": ["trigrams_filter", "lowercase"]
                                        }
                                    }
                                }
                            }
                        }
                    })
                    .then(function(res) {
                        self._ESIndex = index;
                        resolve('Index ' + index + ' created.')
                    }, function(err) {
                        self.ESclient = null;
                        reject(err.message);
                    })
            })
    }

    /**
     * Crawling pages from a website starting with given url
     * @param  {string}   siteId   identification of the site being crawled
     * @param  {string}   url      The url to start with
     * @param  {Object}   search   Used to select the links to crawl next
     * @param  {integer}   depth   Crawled links deeper than this will be filtered
     * @param  {integer}   maxLinks Maximum number of selected links
     * @return  {Promise|string} A promise containing a success or an error message
     */
    fromURL(siteId, url, search, depth, maxLinks) {
        var self = this;
        return new Promise(
            function(resolve, reject) {
                if (self._ESIndex != '') {
                    var allowedDomain = tldjs.getDomain(url),
                        crawler = new roboto.Crawler({
                            startUrls: [url],
                            allowedDomains: [allowedDomain],
                            allowQueryParams: true,
                            //    userAgent: "Mozilla/5.0 (Windows NT 6.1; rv:29.0) Gecko/20100101 Firefox/36.0",
                            constrainToRootDomains: true,
                            requestDelay: 1000,
                            obeyRobotsTxt: true,
                            statsDumpInterval: 100,
                            maxDepth: depth,
                            logLevel: 'error'
                        }),
                        linkSelectorOptions = {
                            search: search,
                            siteId: siteId,
                            ESIndex: self._ESIndex,
                            maxLinks: maxLinks
                        };

                    crawler.linkSelector(ESlinkSelector(linkSelectorOptions, self._ESclient));

                    crawler.parseField('url', function(response) {
                        return response.url;
                    });

                    crawler.on('finish', function() {
                        resolve('Ready');
                    });

                    crawler.crawl();
                } else {
                    var err = new Error('Name of Elasticsearch index not set.');
                    reject(err);
                }
            }
        )
    };

    /**
     * [fromCSV description]
     * @param  {string}  file               Name of the csv file
     * @param  {Object}  search             Used to select the links to crawl next
     * @param  {string}  search.terms       Words to search for
     * @param  {string}  search.substring   Search for this string within a word
     * @param  {Object}  options
     * @param  {string}  options.idColumn   Column in csv file containing a unique id
     * @param  {string}  options.nameColumn Column containing a name (eg. nam of te Enterprise)
     * @param  {string}  options.url        Column containing the start url
     * @param  {integer} options.depth      Crawled links deeper than this will be filtered
     * @param  {integer} options.maxLinks   Maximum number of selected links
     * @param  {Object}  [options.format={headers: true, delimiter: ";", rowDelimiter: "\r\n", quoteColumns: true}]     Format of the csv file
     * @fires  S4Scrawler#success
     * @fires  S4Scrawler#error
     */
    fromCSV(file, search, options) {
        /**
         * @event S4Scrawler#success
         * @type {object}
         * @property {string} - Ready
         */
        /**
         * @event S4Scrawler#error
         * @type {object}
         * @property {string} - error message
         */
        var self = this;
        var sites = [];
        var EXCEL_CSV_NL = {
            headers: true,
            delimiter: ";",
            rowDelimiter: "\r\n",
            quoteColumns: true
        };
        var format = options.format || EXCEL_CSV_NL;
        csv
            .fromPath(file, format)
            .on("data", function(data) {
                sites.push(data);
            })
            .on("end", function() {
                async.eachSeries(sites, function(site, callback) {
                        var id = site[options.idColumn],
                            name = site[options.nameColumn],
                            url = site[options.urlColumn];
                        if (url != '') {
                            self.emit('record', 'crawling: ' + name);
                            self.fromURL(id, url, search, options.depth, options.maxLinks, callback)
                            .then(
                                function(res) {
                                    callback()
                                })
                            .catch(function(err) {
                                self.emit('error', 'Error downloading from ' + url)
                                callback()
                            });
                        } else {
                            callback();
                        }
                    },
                    function(err) {
                        if (err) {
                            self.emit('error', err.message);
                        } else {
                            self.emit('success', 'Ready');
                        }
                    })
            });
    }

    /**
     * Search for links in Elasticsearch using mainterm and terms en write results to a csv file
     * @param  {string} mainTerm Main term to search for
     * @param  {string} terms    Words to consider also
     * @param  {string} file     Name of the output file
     * @param  {Object} [format={headers: true, delimiter: ";", rowDelimiter: "\r\n", quoteColumns: true}]     Format of the output file
     */
    writeToCSV(mainTerm, terms, file, format) {
        var ESIndex = this._ESIndex,
            client = this._ESclient;

        var EXCEL_CSV_NL = {
            headers: true,
            delimiter: ";",
            rowDelimiter: "\r\n",
            quoteColumns: true
        };

        format = format || EXCEL_CSV_NL;

        var search = {
            "query": {
                "bool": {
                    "should": [{
                        "match": {
                            "link.url": terms
                        }
                    }, {
                        "match": {
                            "link.linkText": terms
                        }
                    }, {
                        "match": {
                            "linkTextNgram": {
                                "query": mainTerm,
                                "minimum_should_match": "80%"
                            }
                        }
                    }]
                }
            },
            "from": 0,
            "size": 5000
        };

        client.search({
                index: ESIndex,
                type: 'link',
                body: search
            },
            function(err, response) {
                var rows = [];
                response.hits.hits.forEach(function(row) {
                    var r = {
                        BerichtgeverCode: row._source.siteId,
                        link: row._source.url,
                        linkText: row._source.linkText
                    };
                    rows.push(r);
                });
                csv.writeToPath(file, rows, format)
                    .on("finish", function() {
                        console.log("done!");
                    });
            });
    };

}

module.exports = S4Scrawler
