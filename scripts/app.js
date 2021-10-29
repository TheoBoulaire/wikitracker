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
    time: 0,
    timerOn: !document.cookie.includes("timerOff"),
    achievedMemory: false,
    errors: [],
    pending: {
      next: false,
      back: false,
      turn: false,
      node: null
    }
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
    forward: function() {
      return this.current.forward;
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
    timeDisplay: function() {
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
    achieved: function(val) {
      if (val) {
        window.clearInterval(this.timerInterval);
        this.achievedMemory = true;
        window.scrollTo(0, 0);
      }
    },
    choices: function(val) {
      window.scrollTo(0, 0);
    },
    timerOn: function(val) {
      if (!val) {
        const d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
        let expires = "expires=" + d.toUTCString();
        document.cookie = "timerOff" + "=" + true + ";" + expires + ";";
      } else {
        const d = new Date();
        d.setTime(0);
        let expires = "expires=" + d.toUTCString();
        document.cookie = "timerOff" + "=" + ";" + expires + ";";
      }
    }
  },
  methods: {
    getLabelOfItem: function(item) {
      fetch(getEntityUrl(item.id, this.language))
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
      if (event.ctrlKey) {
        let url = index > 0 ? this.track[index - 1].item.url : getPageUrl(this.start.id);
        window.open(url, "_blank");
      } else {
        this.tryPreviousNode(index);
      }
    },

    openWikidata: function(event) {
      if (event.ctrlKey) {
        window.open(getPageUrl(this.goal.id), "_blank");
      }
    },

    toggleTimerKeyboard: function(event) {
      if (event.keyCode === 13 || event.keyCode === 32)
        event.preventDefault();
        this.toggleTimerClick();
    },

    toggleTimerClick: function() {
      this.timerOn = !this.timerOn;
    },

    turnKeyboard: function(event) {
      if (event.keyCode === 13 || event.keyCode === 32)
        this.tryTurn();
    },

    handleClickRow: function(event, index) {
      let node = this.choices[index];
      if (event.ctrlKey) {
        window.open(node.item.url, "_blank");
      } else {
        if (this.pending.node === node)
          this.pending.node = null;
        else
          this.tryNextNode(node);
      }
    },
    handleKeyboardRow: function(event, index) {
      if (event.key === "Enter")
        this.handleClickRow(event, index);
    },

    tryPreviousNode: function(pos) {
      let node = pos === 0 ? this.start : this.track[pos - 1];
      this.pending.next = false;
      this.pending.turn = false;
      this.pending.node = node;
      this.pending.back = true;
      this.tryChangeNode(node, this.goToPreviousNode.bind(this, pos));
    },
    tryNextNode: function(node) {
      node.forward = this.forward;
      this.pending.back = false;
      this.pending.turn = false;
      this.pending.node = node;
      this.pending.next = true;
      this.tryChangeNode(node, this.goToNextNode.bind(this, node));
    },
    tryTurn: function() {
      let node = {...this.current, forward: !this.forward};
      this.pending.back = false;
      this.pending.next = false;
      this.pending.node = node;
      this.pending.turn = true;
      this.tryChangeNode(node, this.turn);
    },

    goToPreviousNode: function(pos) {
      this.pos = pos;
    },
    goToNextNode: function(node) {
      node.forward = this.forward;
      this.track.push(node);
      this.pos++;
    },
    turn: function() {
      this.current.forward = !this.current.forward;
    },

    tryChangeNode: function(node, callback) {
      let url = getLinkedEntitiesUrl(node.item.id, this.language, this.forward);

      fetch(url)
        .then(response => {
          if (!response.ok)
            throw new Error("HTTPS error, status = " + response.status);
          if (this.pending.node === node) {
            this.pending.node = null;
            this.pending.back = false;
            this.pending.next = false;
            this.pending.turn = false;
            return response.json();
          } else {
            throw new Error("[WT] The response arrived after the user chose an other path.");
          }
        })
        .then(data => {
          this.buildNewChoices(data.results.bindings);
          callback();
        })
        .catch(error => {
          if (!error.message.startsWith('[WT]'))
            this.errors.push(error.message);
        });
    },

    buildNewChoices: function(bindings) {
      let choicesGroupedByProp = new Map();
      for (let line of bindings) {
        let choice = new TrackNode(new WikiProperty(line.prop.value, line.label2.value), new WikiEntity(line.item.value, line.label1.value));
        
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
  created: function () {
    this.pending.node = this.current;

    this.tryChangeNode(this.current, () => {});
    this.getLabelOfItem(this.start);
    this.getLabelOfItem(this.goal);

    this.startTime = new Date().getTime();
    this.timerInterval = window.setInterval(() => {
      if (this.timerOn)
        this.time = new Date().getTime() - this.startTime;
    }, 100);
  }
});

// │ ├ ┴ ┬ ┤ ┐ ┌ └ ┘ ─ ┼ ╮ ╭ ╯ ╰ ╱ ╲ ╳
// ⏲ ↔ ↴ ↷ ⇄ ⇆ ⇋ ⇌ ⇔ 
// #490007 #003029 #334700