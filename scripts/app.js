const FIRST = 0;
const BODY = 1;
const LAST = 2;

var app = new Vue({
  el: "#app",
  data: {
    language: "fr",
    start: {id:"Q2", label:"Terre"},
    track: [],
    pos: 0,
    goal: {id: "Q11158", label: "Acide"},
    choices: [],
    choicesLoadingProgress: 0,
    time: 0,
    timer: null,
    achievedMemory: false
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
    timeDisplay: function() {
      let hDigits = Math.floor(this.time / 3600);
      if (hDigits < 10)
        hDigits = "0" + hDigits;
      let mDigits = Math.floor((this.time % 3600) / 60);
      if (mDigits < 10)
        mDigits = "0" + mDigits;
      let sDigits = this.time % 60;
      if (sDigits < 10)
        sDigits = "0" + sDigits;
      return hDigits + ":" + mDigits + ":" + sDigits;
    },
    choicesLoadingBarWidth: function() {
      return "width: " + this.choicesLoadingProgress + "%;"
    },
    choicesLoadingProgressVisibility: function() {
      return this.choicesLoadingProgress > 0 ? "height: 20px;" : "height: 20px; visibility: hidden;";
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
      }
    }
  },
  methods: {
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
      axios.get("https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20wd%3A" + this.current.id + "%20%3Fprop%20%3Fitem.%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json")
        .then(this.handleResponseRefreshChoices);
    },
    handleResponseRefreshChoices: function(response) {
      let choicesGroupedByProp = new Map();
      for (let line of response.data.results.bindings) {
        let choice = {
          item: {id: this.entityIDPattern.exec(line.item.value)[0], url: line.item.value, label: line.label1.value},
          property: {url: line.prop.value, label: line.label2.value, order: BODY}
        };
        // Premier choix d'une propriété
        if (!choicesGroupedByProp.has(choice.property.url)) {
          choice.property.order = FIRST;
          choicesGroupedByProp.set(choice.property.url, [choice]);
        } else {
          choicesGroupedByProp.get(choice.property.url).push(choice);
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
  created: function () {
    this.entityIDPattern = /(P|Q)\d+/;

    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("start"))
      this.start = JSON.parse(urlParams.get("start"));
    if (urlParams.has("goal"))
      this.goal = JSON.parse(urlParams.get("goal"));
    if (urlParams.has("lang"))
        this.language = urlParams.get("lang");
    this.refreshChoices();

    this.timer = window.setInterval(() => {
      this.time++;
    }, 1000);

    // Initialisation des valeurs de la barre de chargement logarithmique
    this.progressTab1s = [];
    for (let i = 1; i <= 40; i++) {
      this.progressTab1s.push(Math.floor(Math.log(i)*27));
    }
  }
});

//├─ └─  ┣━ ┗━