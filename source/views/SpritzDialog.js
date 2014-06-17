enyo.kind({
    name: "SpritzDialog",
    kind: "onyx.Popup",
    scrim: false,
    modal: true,
    autoDismiss: false,
    floating: true,
    centered: true,
    showTransitions: true,
    style: "background-color: transparent; height: 100%; width: 100%; border: 0px; border-radius: 0px; margin: 0; position: fixed; top: 0; bottom: 0; left: 0; right: 0; padding: 0px;",

    published: {
        running: false,
        childIndex: 0
    },
    bindings: [
        {from: ".running", to: ".$.scrim.showing"}
    ],
    wpm: 300,
    minWpm: 300,
    maxWpm: 800,

    handlers: {
        ontap: "onTap"
    },
    components: [
        {
            kind: "onyx.Scrim",
            name: "scrim",
            classes: "spritz-scrim"
        },
        {
            kind: "onyx.Scrim",
            name: "scrimOpacity",
            classes: "spritz-scrim",
            showing: true,
            style: "opacity: 0.4"
        },
        {
            //let spritz read it's wpm from an invisible input.
            tag: "input",
            id: "spritz_selector",
            value: "",
            style: "display: none;"
        },
        {
            //have invisible button that pauses/resumes spritz
            tag: "button",
            type: "button",
            id: "spritz_toggle",
            style: "width: 0px; height: 0px; position: fixed; top: -10px;"
        },
        {
            tag: "div",
            id: "spritz_container",
            components: [
                {
                    tag: "div",
                    id: "guide_top",
                    allowHtml: true,
                    content: "――――――――――<span id=\"notch\">&#1092;</span>―――――――――――"
                },
                {
                    tag: "div",
                    id: "spritz_result",
                    content: "empty"
                },
                {
                    tag: "div",
                    id: "guide_bottom",
                    content: "――――――――――――――――――――――"
                },
                {
                    name: "wpmDisplay",
                    style: "text-align: center; color: gray",
                    content: "",
                    showing: false
                }
            ]
        }
    ],
    doShow: function () {
        this.show();
    },
    onTap: function (inSender, inEvent) {
        if (this.running) {
            this.pause();
        } else {
            var ratio = inEvent.clientX / this.node.clientWidth;
            this.wpm = (this.maxWpm - this.minWpm) * ratio + this.minWpm;
            this.log("WPM: ", this.wpm, " from ratio ", ratio);

            this.showWPM(this.wpm);
            this.resume();
        }
    },
    showWPM: function (wpm) {
        this.$.wpmDisplay.setContent("Words per minute: " + Math.round(wpm));
        this.$.wpmDisplay.show();
        setTimeout(function () {
            this.$.wpmDisplay.hide();
        }.bind(this), 500);
    },

    pause: function () {
        this.running = false;
    },
    resume: function () {
        this.running = true;
    }
});
