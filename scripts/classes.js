const FIRST = 0;
const BODY = 1;
const LAST = 2;

class WikiEntity {
  id;
  url;
  label;
  constructor(url, label) {
    this.id = /(P|Q)\d+/.exec(url)[0];
    this.url = url;
    this.label = label;
  }
}

class WikiProperty extends WikiEntity {
  order = BODY;
}

class TrackNode {
  property;
  item;
  forward;
  constructor(property, item) {
    this.property = property;
    this.item = item;
  }
}
