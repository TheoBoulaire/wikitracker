const entityIDPattern = /(P|Q)\d+/;

var app = new Vue({
  el: "#app",
  data: {
    language: "en",
    iStack: [{id: "Q2", label: "Terre"}],
    pStack: [],
    goal: {id: "Q1138571", label: "chêne"},
    choices: []
  },
  computed: {
    current: function() {
      return this.iStack[this.iStack.length - 1];
    },
    start: function() {
      return this.iStack[0];
    },
    previous: function() {
      if (this.iStack.length > 1)
        return this.iStack[this.iStack.length - 2];
      else
        return null;
    }
  },
  watch: {
    iStack: function(val) {
      if (val.length > 0) {
        this.refreshChoices();
      }
    }
  },
  methods: {
    choose: function(event, index) {
      let choice = this.choices[index];
      this.iStack.push(choice.item);
      this.pStack.push(choice.property);
    },
    back: function() {
      this.iStack.pop();
      this.pStack.pop();
    },
    refreshChoices: function() {
      axios.get("https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20wd%3A" + this.current.id + "%20%3Fprop%20%3Fitem.%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json")
        .then(this.handleResponseRefreshChoices);
    },
    handleResponseRefreshChoices: function(response) {
      this.choices = [];
      for (let line of response.data.results.bindings) {
        this.choices.push({
          item: {id: entityIDPattern.exec(line.item.value)[0], url: line.item.value, label: line.label1.value},
          property: {url: line.prop.value, label: line.label2.value}
        });
      }
    }
  },
  created: function () {
    this.refreshChoices();
  }
});
