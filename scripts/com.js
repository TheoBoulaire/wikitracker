function getQueryUrl(sparqlQuery) {
    return encodeURI(`https://query.wikidata.org/sparql?query=${sparqlQuery}&format=json`);
}

function getPageUrl(id) {
    return 'https://www.wikidata.org/wiki/' + id;
}

function getEntityUrl(id, lang) {
    let sparqlQuery = `SELECT ?label WHERE {
        wd:${id} rdfs:label ?label.
        FILTER(LANG(?label) = "${lang}")
    }`;
    return getQueryUrl(sparqlQuery);
}

function getLinkedEntitiesUrl(id, lang, forward = true) {
    let sparqlQuery = forward ?
    `SELECT ?label1 ?item ?label2 ?prop ?p WHERE {
        wd:${id} ?prop ?item.
        ?item rdfs:label ?label1.
        ?p wikibase:directClaim ?prop.
        ?p rdfs:label ?label2.
        FILTER(LANG(?label1) = "${lang}").
        FILTER(LANG(?label2) = "${lang}").
    }`:
    `SELECT ?label1 ?item ?label2 ?prop ?p WHERE {
        ?item ?prop wd:${id}.
        ?item rdfs:label ?label1.
        ?p wikibase:directClaim ?prop.
        ?p rdfs:label ?label2.
        FILTER(LANG(?label1) = "${lang}").
        FILTER(LANG(?label2) = "${lang}").
    }`;
    return getQueryUrl(sparqlQuery);
}
/*
URL pour query avec qualifiers
let url = this.forward ?
            "https://query.wikidata.org/sparql?query=SELECT%20%20%3Fstatement%20%3FstatementProperty%20%3FstatementValue%20%3FstatementPropertyLabel%20%3FstatementValueLabel%20%3FqualifierProperty%20%3FqualifierValue%20%3FqualifierPropertyLabel%20%3FqualifierValueLabel%20WHERE%20%7B%0A%20%20wd%3A" + this.current.item.id + "%20%3Fprop%20%3Fstatement%20.%0A%20%20%3Fstatement%20%3Fps%20%3FstatementValue%20.%0A%20%20%3FstatementProperty%20wikibase%3AstatementProperty%20%3Fps%20.%0A%20%20%3FstatementProperty%20wikibase%3ApropertyType%09wikibase%3AWikibaseItem%20.%0A%20%20OPTIONAL%20%7B%0A%20%20%20%20%3Fstatement%20%3Fpq%20%3FqualifierValue%20.%0A%20%20%20%20%3FqualifierProperty%20wikibase%3Aqualifier%20%3Fpq%20.%0A%20%20%20%20%3FqualifierProperty%20wikibase%3ApropertyType%09wikibase%3AWikibaseItem%20.%0A%20%20%7D%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%0A%20%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20%22" + this.language + "%22%20.%0A%20%20%7D%0A%7D&format=json":
            "https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20%3Fitem%20%3Fprop%20wd%3A" + this.current.item.id + ".%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json";
*/

// SELECT  ?prop ?statement ?statementValue ?qualifierValue ?property ?statementProperty ?qualifierPropery WHERE {
//   wd:Q12418 ?prop ?statement . 
//   ?statement ?ps ?statementValue . 
//   ?statement ?pq ?qualifierValue . 
//   ?property wikibase:claim ?prop . 
//   ?statementProperty wikibase:statementProperty ?ps .
//   ?qualifierPropery wikibase:qualifier ?pq .
//   }

// SELECT  ?statement ?statementProperty ?statementValue ?statementPropertyLabel ?statementValueLabel ?qualifierProperty ?qualifierValue ?qualifierPropertyLabel ?qualifierValueLabel WHERE {
//   wd:Q12418 ?prop ?statement .
//   ?statement ?ps ?statementValue .
//   ?statementProperty wikibase:statementProperty ?ps .
//   ?statementProperty wikibase:propertyType	wikibase:WikibaseItem .
//   OPTIONAL {
//     ?statement ?pq ?qualifierValue .
//     ?qualifierProperty wikibase:qualifier ?pq .
//     ?qualifierProperty wikibase:propertyType	wikibase:WikibaseItem .
//   }
//   SERVICE wikibase:label {
//      bd:serviceParam wikibase:language "fr" .
//   }
// }