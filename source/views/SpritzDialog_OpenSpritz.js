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

    events: {
        onPartDone: ""
    },
    published: {
        running: ""
    },
    bindings: [
        {from: "$.spritz.running", to: "$.scrim.showing"},
        {from: "$.spritz.running", to: "running"}
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
                    style: "text-align: center; color: gray; background-color: white; padding: 10px;",
                    content: "",
                    showing: false
                }
            ]
        },
        {
            kind: "Spritz",
            onDone: "spritzPartDone"
        }
    ],
    parts: [],
    currentPart: 0,

    prepareParts: function (contents) {
        var text, i, elem;
        for (i = 0; i < contents.length; i += 1) {
            elem = contents[i];
            text = elem.textContent || "";
            text = text.trim();
            if (elem.tagName.charAt(0) === "H") {
                text += ".";
            } else if (elem.tagName === "IMG") {
                text = "Bild.";
            } else if (elem.tagName === "TABLE") {
                text = "Tabelle.";
            } else if (elem.childElementCount > 0) {
                this.prepareParts(elem.children);
            }

            text = text.replace(/\s+/g, ' '); // Shrink long whitespaces.
            text = text.replace(/\./g, '. '); // Make sure punctuation is apprpriately spaced.
            text = text.replace(/\?/g, '? ');
            text = text.replace(/\!/g, '! ');
            if (text !== "") {
                this.parts.push({text: text, node: elem});
            }
        }
    },

    prepareSpritz: function (contents) {
        this.show();
        this.log("Contents: ", contents);
        this.parts = [];

        this.prepareParts(contents);

        this.log("Generated parts: ", this.parts);

        this.currentPart = -1;
    },
    stopSpritz: function () {
        this.$.spritz.stopSpritz();
        this.hide();
    },
    onTap: function (inSender, inEvent) {
        /*jslint unparam:true*/
        if (this.$.spritz.running) {
            this.pause();
        } else {
            if (inEvent.clientY > this.node.clientHeight - 58) {
                this.hide();
                return;
            }

            var ratio = inEvent.clientX / this.node.clientWidth;
            this.wpm = (this.maxWpm - this.minWpm) * ratio + this.minWpm;

            this.showWPM(this.wpm);
            this.$.spritz.setWpm(this.wpm);
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
        this.$.spritz.stopSpritz();
    },
    resume: function () {
        if (this.currentPart < 0) {
            this.spritzPartDone();
        } else {
            this.$.spritz.startSpritz();
        }
    },

    spritzPartDone: function () {
        this.currentPart += 1;
        if (this.currentPart < this.parts.length) {
            var part = this.parts[this.currentPart].text;
            if (part === "") {
                this.spritzPartDone();
            } else {
                this.doPartDone({part: this.currentPart, node: this.parts[this.currentPart].node});
                this.$.spritz.spritzify(part, this.wpm);
                this.$.spritz.startSpritz();
            }
        } else {
            this.hide();
        }
    }
});
