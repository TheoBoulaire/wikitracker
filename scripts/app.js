const FIRST = 0;
const BODY = 1;
const LAST = 2;

const urlParams = new URLSearchParams(window.location.search);

var app = new Vue({
  el: "#app",
  data: {
    language: urlParams.has("lang") ? urlParams.get("lang") : "fr",
    start: {
      id: urlParams.has("start") ? urlParams.get("start") : "Q2",
      label: "?"
    },
    goal: {
      id: urlParams.has("goal") ? urlParams.get("goal") : "Q11158",
      label: "?"
    },
    length: urlParams.has("length") ? urlParams.get("length") : 0,
    track: [],
    pos: 0,
    choices: [],
    choicesLoadingProgress: 0,
    time: 0,
    timer: null,
    achievedMemory: false,
    errors: [],
    forward: true
  },
  computed: {
    current: function() {
      if (this.pos > 0)
        return this.track[this.pos - 1].item;
      else
        return this.start;
    },
    achieved: function() {
      return this.achievedMemory || this.current.id === this.goal.id;
    },
    distance: function() {
      return this.pos;
    },
    suboptimal: function() {
      return this.length > 0 && this.distance > this.length;
    },
    timeDisplay: function() {
      /*
      let hDigits = Math.floor(this.time / 3600);
      if (hDigits < 10)
        hDigits = "0" + hDigits;
        */
      let mDigits = Math.floor((this.time % 3600) / 60);
      if (mDigits < 10)
        mDigits = "0" + mDigits;
      let sDigits = this.time % 60;
      if (sDigits < 10)
        sDigits = "0" + sDigits;
      return mDigits + ":" + sDigits;
    }
  },
  watch: {
    current: function(val) {
      if (val.id !== this.goal.id)
        this.refreshChoices();
    },
    achieved: function(val) {
      if (val) {
        window.clearInterval(this.timer);
        this.achievedMemory = true;
        window.scrollTo(0, 0);
      }
    },
    forward: function(val) {
      this.refreshChoices();
    },
    choices: function(val) {
      window.scrollTo(0, 0);
    }
  },
  methods: {
    getLabelOfItem: function(item) {
      fetch("https://query.wikidata.org/sparql?query=SELECT%20%3Flabel%20WHERE%20%7Bwd%3A" + item.id + "%20rdfs%3Alabel%20%3Flabel.FILTER(LANG(%3Flabel)%20%3D%20%22" + this.language + "%22)%7D&format=json")
        .then(response => {
          if(!response.ok)
            throw new Error("HTTP error, status = " + response.status);
          return response.json();
        })
        .then(data => {
          if(data.results.bindings.length > 0) {
            item.label = data.results.bindings[0].label.value;
          } else {
            this.errors.push("L'objet WikiData " + item.id + " n'existe pas ou n'a pas de label en français.");
            item.label = "∅";
          }
        })
        .catch(error => this.errors.push("Ereur de connexion avec WikiData."));
    },
    navBreadCrumbWithKeyboard: function(event, index) {
      if (event.key === "Enter")
        this.pos = index;
    },
    chooseWithKeyboard: function(event, index) {
      if (event.key === "Enter")
        this.choose(event, index);
    },
    choose: function(event, index) {
      if (this.choicesLoadingProgress === 0) {
        if (this.pos !== this.track.length)
          this.track = this.track.slice(0, this.pos);
        let choice = this.choices[index];
        this.track.push(choice);
        this.pos++;
      }
    },
    refreshChoices: function() {
      this.choicesLoadingProgress = 5;
      let i = 0;
      this.choicesLoadingProgressInterval = window.setInterval(() => {
        if (i < 40) {
          this.choicesLoadingProgress = this.progressTab1s[i];
          i++;
        }
      }, 25);
      let url = this.forward ?
                  "https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20wd%3A" + this.current.id + "%20%3Fprop%20%3Fitem.%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json":
                  "https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20%3Fitem%20%3Fprop%20wd%3A" + this.current.id + ".%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json";
      
      fetch(url)
        .then(response => {
          if (!response.ok)
            throw new Error("HTTPS error, status = " + response.status);
          return response.json();
        })
        .then(this.handleResponseRefreshChoices)
        .catch(error => this.errors.push(error.message));
    },
    handleResponseRefreshChoices: function(data) {
      let choicesGroupedByProp = new Map();
      for (let line of data.results.bindings) {
        let choice = {
          item: {id: this.entityIDPattern.exec(line.item.value)[0], url: line.item.value, label: line.label1.value},
          property: {id: this.entityIDPattern.exec(line.prop.value)[0], url: line.prop.value, label: line.label2.value, order: BODY}
        };
        
        if (!exclusion.includes(choice.property.id)) {
          if (!choicesGroupedByProp.has(choice.property.url)) {
            // Premier choix d'une propriété
            choice.property.order = FIRST;
            choicesGroupedByProp.set(choice.property.url, [choice]);
          } else {
            choicesGroupedByProp.get(choice.property.url).push(choice);
          }
        }
      }
      // Insertion des choix groupés par propriété
      this.choices = [];
      choicesGroupedByProp.forEach(choicesForOneProp => {
        // Marquage des derniers choix de chaque propriété multichoix
        if (choicesForOneProp.length > 1)
          choicesForOneProp[choicesForOneProp.length - 1].property.order = LAST;
        choicesForOneProp.forEach(choice => 
          this.choices.push(choice)
        );
      });
      // Gestion de la barre de chargement
      window.clearInterval(this.choicesLoadingProgressInterval);
      this.choicesLoadingProgress = 100;
      this.choicesLoadingProgress = 0;
    }
  },
  beforeCreate: function() {
    this.entityIDPattern = /(P|Q)\d+/;

    // Initialisation des valeurs de la barre de chargement logarithmique
    this.progressTab1s = [];
    for (let i = 1; i <= 40; i++) {
      this.progressTab1s.push(Math.floor(Math.log(i)*27));
    }
  },
  created: function () {
    this.refreshChoices();
    this.getLabelOfItem(this.start);
    this.getLabelOfItem(this.goal);

    this.timer = window.setInterval(() => {
      this.time++;
    }, 1000);
  }
});

// │ ├ ┴ ┬ ┤ ┐ ┌ └ ┘ ─ ┼ ╮ ╭ ╯ ╰ ╱ ╲ ╳
// ⏲ ↔ ↴ ↷ ⇄ ⇆ ⇋ ⇌ ⇔ 
// #490007 #003029 #334700