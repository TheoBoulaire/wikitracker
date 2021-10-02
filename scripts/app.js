const FIRST = 0;
const BODY = 1;
const LAST = 2;
const EXCLUSION = ["P301","P367","P373","P424","P443","P491","P692","P910","P935","P948","P971","P989","P990","P996","P1151","P1200","P1204","P1442","P1464","P1472","P1543","P1612","P1621","P1766","P1801","P1800","P1846","P1943","P1944","P2033","P2343","P2377","P2425","P2713","P2716","P2910","P3383","P3451","P3896","P3921","P4004","P4045","P4047","P4150","P4174","P4179","P4291","P4316","P4329","P4640","P4656","P4669","P4896","P5252","P5555","P5775","P5962","P6655","P6802","P7457","P7561","P7721","P7782","P7861","P7867","P8204","P8265","P8464","P8517","P8592","P8596","P8667","P8766","P8933","P8989","P9126","P9664","P9721","P9748","P9753","P10","P15","P14","P18","P41","P51","P94","P109","P117","P154","P158","P181","P207","P242","P360","P1423","P1424","P1465","P1740","P1753","P1754","P1791","P1792","P2354","P2517","P2667","P2817","P2875","P3709","P3713","P3734","P3876","P4195","P4224","P5008","P5996","P6104","P6112","P6186","P6365","P7084","P1343"];

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
    lengthGoal: urlParams.has("length") ? urlParams.get("length") : 0,
    canTurn: urlParams.has("turn"),
    track: [],
    pos: 0,
    choices: [],
    choicesLoadingProgress: 0,
    time: 0,
    timer: null,
    hasTimer: urlParams.has("timer"),
    achievedMemory: false,
    errors: [],
    forward: true
  },
  computed: {
    textContent: function () {
      if (this.language === "fr") {
        return {
          success: "\" est un chemin sémantique.",
          copyLink: "Copier le lien",
          error: "Erreur",
          breadcrumbLabel: "Fil d'Ariane",
          homeLabel: "Accueil",
          turnButtonLabel: "Changer de sens"
        };
      } else {
        return {
          success: "\" is a semantic path.",
          copyLink: "Copy link",
          error: "Error",
          breadcrumbLabel: "Breadcrumb",
          homeLabel: "Home",
          turnButtonLabel: "Switch direction"
        };
      }
    },
    current: function() {
      if (this.pos > 0)
        return this.track[this.pos - 1];
      else
        return {item: this.start, forward: true};
    },
    achieved: function() {
      return this.achievedMemory || this.current.item.id === this.goal.id;
    },
    distance: function() {
      return this.pos;
    },
    suboptimal: function() {
      return this.length > 0 && this.distance > this.length;
    },
    secondsTime: function() {
      return this.time / 1000;
    },
    minutesDisplay: function() {
      return Math.floor(this.secondsTime / 60);
    },
    secondsDisplay: function() {
      return this.secondsTime % 60;
    },
    clockX: function() {
      if (this.secondsDisplay < 15)
        return this.secondsDisplay / 15;
      else if (this.secondsDisplay < 30)
        return 1;
      else if (this.secondsDisplay < 45)
        return (45 - this.secondsDisplay) / 15;
      else
        return 0;
    },
    clockY: function() {
      if (this.secondsDisplay < 15)
        return 0;
      else if (this.secondsDisplay < 30)
        return (this.secondsDisplay - 15) / 15;
      else if (this.secondsDisplay < 45)
        return 1;
      else
        return (60 - this.secondsDisplay) / 15;
    },
    /*
    clockX: function() {
      let a = (this.time + 15) % 60;
      if (a < 30)
        return a / 30;
      else
        return (60 - a) / 30;
    },
    clockY: function() {
      let a = this.time % 60;
      if (a < 30)
        return a / 30;
      else
        return (60 - a) / 30;
    },
    */
    timeDisplay: function() {
      /*
      let hDigits = Math.floor(this.time / 3600);
      if (hDigits < 10)
        hDigits = "0" + hDigits;
        */
      let mDigits = this.minutesDisplay;
      if (mDigits < 10)
        mDigits = "0" + mDigits;
      let sDigits = this.secondsDisplay;
      if (sDigits < 10)
        sDigits = "0" + sDigits;
      return mDigits + ":" + sDigits;
    },
    shareUrl: function() {
      let url = window.location.href;
      if (!url.includes("length=")) {
        url += "&length=" + this.distance;
      }
      return url;
    }
  },
  watch: {
    current: function(val) {
      if (val.item.id !== this.goal.id) {
        this.refreshChoices();
      }
      this.forward = val.forward;
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
        this.navBreadCrumb(event, index);
    },
    navBreadCrumb: function(event, index) {
      this.pos = index;
    },
    chooseWithKeyboard: function(event, index) {
      if (event.key === "Enter")
        this.choose(event, index);
    },
    choose: function(event, index) {
      if (event.ctrlKey) {
        window.open(this.choices[index].item.url, "_blank");
      } else if (this.choicesLoadingProgress === 0) {
        if (this.pos !== this.track.length)
          this.track = this.track.slice(0, this.pos);
        let choice = this.choices[index];
        choice.forward = this.forward;
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
                  "https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20wd%3A" + this.current.item.id + "%20%3Fprop%20%3Fitem.%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json":
                  "https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20%3Fitem%20%3Fprop%20wd%3A" + this.current.item.id + ".%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json";
      
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
        
        if (!EXCLUSION.includes(choice.property.id)) {
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
    },
    copyLink: function() {
      let linkElem = document.querySelector("#share-game-link input");
      if (linkElem) {
        linkElem.disabled = false;
        linkElem.select();
        document.execCommand("copy");
        linkElem.disabled = true;
      }
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

    this.startTime = new Date().getTime();
    this.timer = window.setInterval(() => {
      this.time = new Date().getTime() - this.startTime;
    }, 100);
  }
});

// │ ├ ┴ ┬ ┤ ┐ ┌ └ ┘ ─ ┼ ╮ ╭ ╯ ╰ ╱ ╲ ╳
// ⏲ ↔ ↴ ↷ ⇄ ⇆ ⇋ ⇌ ⇔ 
// #490007 #003029 #334700