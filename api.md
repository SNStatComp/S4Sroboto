<a name="S4Scrawler"></a>

## S4Scrawler
**Extends:** <code>EventEmitter</code>  
Focused crawler based on roboto. Elasticsearch is used to select the most promissing outlinks


* [S4Scrawler](#S4Scrawler)

    * [new S4Scrawler()](#new_S4Scrawler_new)

    * [.connectToES()](#S4Scrawler+connectToES)

    * [.useESIndex(index)](#S4Scrawler+useESIndex)

    * [.createESIndex(index)](#S4Scrawler+createESIndex)

    * [.fromURL(siteId, url, search, depth, maxLinks)](#S4Scrawler+fromURL)

    * [.fromCSV(file, search, options)](#S4Scrawler+fromCSV)

    * [.writeToCSV(mainTerm, terms, file, [format])](#S4Scrawler+writeToCSV)

    * ["success"](#S4Scrawler+event_success)

    * ["error"](#S4Scrawler+event_error)


<a name="new_S4Scrawler_new"></a>

### new S4Scrawler()
**Params**

-  <code>none</code>

Create instance of class S4Scrawler

<a name="S4Scrawler+connectToES"></a>

### *s4Scrawler*.connectToES()
Create a connection to the Elasticsearch cluster

**Returns**: <code>Promise</code> &#124; <code>string</code> - A promise returning a success or an error message  
<a name="S4Scrawler+useESIndex"></a>

### *s4Scrawler*.useESIndex(index)
**Params**

- index <code>string</code> - The name of the index

Set the Elasticsearch index to be used. This index must exist.

**Returns**: <code>Promise</code> &#124; <code>string</code> - A promise returning the name of the index or an error message  
<a name="S4Scrawler+createESIndex"></a>

### *s4Scrawler*.createESIndex(index)
**Params**

- index <code>index</code> - Name of the index

Create a new crawling index in Elasticsearch

**Returns**: <code>Promise</code> &#124; <code>string</code> - A promise containing a success or an error message  
<a name="S4Scrawler+fromURL"></a>

### *s4Scrawler*.fromURL(siteId, url, search, depth, maxLinks)
**Params**

- siteId <code>string</code> - identification of the site being crawled
- url <code>string</code> - The url to start with
- search <code>Object</code> - Used to select the links to crawl next
- depth <code>integer</code> - Crawled links deeper than this will be filtered
- maxLinks <code>integer</code> - Maximum number of selected links

Crawl pages from a website starting with given url

**Returns**: <code>Promise</code> &#124; <code>string</code> - A promise containing a success or an error message  
<a name="S4Scrawler+fromCSV"></a>

### *s4Scrawler*.fromCSV(file, search, options)
**Emits**: <code>[success](#S4Scrawler+event_success)</code>, <code>[error](#S4Scrawler+event_error)</code>  
**Params**

- file <code>string</code> - Name of the csv file
- search <code>Object</code> - Used to select the links to crawl next
    - .terms <code>string</code> - Words to search for
    - .substring <code>string</code> - Search for this string within a word
- options <code>Object</code>
    - .idColumn <code>string</code> - Column in csv file containing a unique id
    - .nameColumn <code>string</code> - Column containing a name (eg. name of the Enterprise)
    - .url <code>string</code> - Column containing the start url
    - .depth <code>integer</code> - Crawled links deeper than this will be filtered
    - .maxLinks <code>integer</code> - Maximum number of selected links
    - [.format] <code>Object</code> <code> = {headers: true, delimiter: &quot;;&quot;, rowDelimiter: &quot;\r\n&quot;, quoteColumns: true}</code> - Format of the csv file

Crawl pages from websites using start urls contained in the given csv file

<a name="S4Scrawler+writeToCSV"></a>

### *s4Scrawler*.writeToCSV(mainTerm, terms, file, [format])
**Params**

- mainTerm <code>string</code> - Main term to search for
- terms <code>string</code> - Words to consider also
- file <code>string</code> - Name of the output file
- [format] <code>Object</code> <code> = {headers: true, delimiter: &quot;;&quot;, rowDelimiter: &quot;\r\n&quot;, quoteColumns: true}</code> - Format of the output file

Search for links in Elasticsearch using mainterm and terms, write results to a csv file

<a name="S4Scrawler+event_success"></a>

### "success"
- Ready

<a name="S4Scrawler+event_error"></a>

### "error"
- Error message

