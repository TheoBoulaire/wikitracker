var app = new Vue({
  el: "#app",
  data: {
    language: "fr",
    start: {id:"Q2", label:"Terre"},
    track: [],
    pos: 0,
    goal: {id: "Q11158", label: "Acide"},
    choices: [],
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
    hours: function() {
      return Math.floor(this.time / 3600);
    },
    minutes: function() {
      return Math.floor((this.time % 3600) / 60);
    },
    seconds: function() {
      return this.time % 60;
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
      if (this.pos !== this.track.length)
        this.track = this.track.slice(0, this.pos);
      let choice = this.choices[index];
      this.track.push(choice);
      this.pos++;
    },
    refreshChoices: function() {
      axios.get("https://query.wikidata.org/sparql?query=SELECT%20%3Flabel1%20%3Fitem%20%3Flabel2%20%3Fprop%20%3Fp%20WHERE%20%7B%0A%20%20wd%3A" + this.current.id + "%20%3Fprop%20%3Fitem.%0A%20%20%3Fitem%20rdfs%3Alabel%20%3Flabel1.%0A%20%20%3Fp%20wikibase%3AdirectClaim%20%3Fprop.%0A%20%20%3Fp%20rdfs%3Alabel%20%3Flabel2.%0A%20%20FILTER%28LANG%28%3Flabel1%29%20%3D%20%22" + this.language + "%22%29.%0A%20%20FILTER%28LANG%28%3Flabel2%29%20%3D%20%22" + this.language + "%22%29.%0A%20%7D&format=json")
        .then(this.handleResponseRefreshChoices);
    },
    handleResponseRefreshChoices: function(response) {
      this.choices = [];
      for (let line of response.data.results.bindings) {
        this.choices.push({
          item: {id: this.entityIDPattern.exec(line.item.value)[0], url: line.item.value, label: line.label1.value},
          property: {url: line.prop.value, label: line.label2.value}
        });
      }
    }
  },
  created: function () {
    this.entityIDPattern = /(P|Q)\d+/;

    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("start"))
      this.start = JSON.parse(urlParams.get("start"));
    if (urlParams.has("goal"))
      this.goal = JSON.parse(urlParams.get("goal"));
    this.refreshChoices();

    this.timer = window.setInterval(() => {
      this.time++;
    }, 1000);
  }
});