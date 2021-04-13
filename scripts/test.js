var http = require('http');

var options = {
    host: 'https://www.wikidata.org',
    path: '/w/api.php?action=wbgetclaims&entity=Q2&format=json'
  };
  
callback = function(response) {
var str = '';

//another chunk of data has been received, so append it to `str`
response.on('data', function (chunk) {
    str += chunk;
});

//the whole response has been received, so we just print it out here
response.on('end', function () {
    console.log(str);
});
}

http.request(options, callback).end();
//xhr.setRequestHeader("origin", "*");

/*
SELECT ?label1 ?item ?label2 ?prop ?p WHERE {
  wd:Q2 ?prop ?item.
  ?item rdfs:label ?label1.
  ?p wikibase:directClaim ?prop.
  ?p rdfs:label ?label2.
  FILTER(LANG(?label1) = "fr").
  FILTER(LANG(?label2) = "fr").
 }
 */