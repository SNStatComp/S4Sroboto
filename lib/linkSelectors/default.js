var LinkSelector = function (options, client) {
    return function (links, context, callback) {
        var urls = links.map(function (link) {return link.url})
        callback(urls, null);
    }
}

exports = module.exports = LinkSelector;
