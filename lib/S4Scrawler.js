/*jslint node: true */
var roboto = require("./roboto.js"),
    ESlinkSelector = require('./linkSelectors/ESlinkSelector.js'),
    LinkExtractor = require('./linkExtractor.js'),
    tldjs = require('tldjs'),
    elasticsearch = require('elasticsearch');

var linkExtractor = new LinkExtractor;

/**
 * @classdesc Focused crawler based on roboto. Elasticsearch is used to select the most promissing outlinks
 */
class S4Scrawler {
    /**
     * Create instance of class S4Scrawler
     * @constructor
     * @param {none}
     *
     */
    constructor() {
        this._ESIndex = '';
        this._ESclient = null;
        this._crawler = null;
        this._currentId = '';
    }

    /**
     * Get the roboto package. This allows you to use all the features of jculvey roboto package.
     * @return {Object} The roboto object
     */
    getRoboto() {
      return roboto;
    }
    /**
     * Attach the crawler to be used
     * @param  {Object} crawler The (roboto) crawler
     */
    useCrawler(crawler) {
      this._crawler = crawler;
    }

    /**
     * Create a connection to the Elasticsearch cluster
     * @return {Promise|string} A promise returning a success or an error message
     */
    connectToES() {
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!self._ESclient) {
                self._ESclient = new elasticsearch.Client({host: 'localhost:9200'});
                self._ESclient
                  .ping({requestTimeout: Infinity})
                  .then(function(response) {
                    resolve('success')
                  })
                  .catch(function(err) {
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
        return new Promise(function(resolve, reject) {
            if (!self._ESclient) {
                reject('Not connected to Elasticsearch cluster');
            } else {
                self._ESclient.indices.exists({
                    "index": index
                }, function(err, response, status) {
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
        return new Promise(function(resolve, reject) {
            if (!self._ESclient) {}
            self._ESclient = new elasticsearch.Client({host: 'localhost:9200'});
            self._ESclient.indices.create({
                index: index,
                body: {
                    "mappings": {
                        "link": {
                            "properties": {
                                "siteId": {
                                    "type": "keyword"
                                },
                                "pageUrl": {
                                    "type": "keyword"
                                },
                                "url": {
                                    "type": "text"
                                },
                                "linkText": {
                                    "type": "text",
                                    "fields": {
                                        "ngram": {
                                            "type": "text",
                                            "analyzer": "trigrams"
                                        }
                                    }
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
            }).then(function(res) {
                self._ESIndex = index;
                resolve('Index ' + index + ' created.')
            }, function(err) {
                self.ESclient = null;
                reject(err.message);
            })
        })
    }

    /**
     * Crawl pages from a website starting with given url
     * @param  {string}   siteId   identification of the site being crawled
     * @param  {Object}   search   Used to select the links to crawl next
     * @param  {integer|''}   maxLinks Maximum number of selected links, "" = all links
     * @return  {Promise|string} A promise containing a success or an error message
     */
    crawl(siteId, search, maxLinks) {
        var self = this;
        maxLinks = maxLinks || '';
        this._currentId = siteId;
        return new Promise(function(resolve, reject) {
            if (self._ESIndex != '') {
                var linkSelectorOptions = {
                    search: search,
                    siteId: siteId,
                    ESIndex: self._ESIndex,
                    maxLinks: maxLinks
                };
                self._crawler.linkSelector(ESlinkSelector(linkSelectorOptions, self._ESclient));

                self._crawler.on('finish', function() {
                    resolve('Ready');
                });

                self._crawler.crawl();
            } else {
                var err = new Error('Name of Elasticsearch index not set.');
                reject(err);
            }
        })
    };

    /**
     * Get all outgoing links of a webpage
     * @param  {Object} response The response after requesting a webpage
     * @param  {Object} $        A cheerio object containing the response
     * @return {Array}           Array of links. Every link is an object containing the url (link.url) and the text of of the link (link.linkText)
     */
    getLinks(response, $) {
        return this._crawler._linkExtractor.extractLinks(response, $);
    }

    /**
     * Get the id of the site being crawled
     * @return {string}         The id of the site
     */
    getCurrentId() {
      return this._currentId;
    }

}

module.exports = S4Scrawler
