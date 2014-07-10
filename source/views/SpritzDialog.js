enyo.kind({
    name: "SpritzDialog",
    kind: "onyx.Popup",
    scrim: false,
    modal: false,
    autoDismiss: false,
    floating: true,
    centered: true,
    showTransitions: true,
    style: "background-color: transparent; height: 100%; width: 100%; border: 0px; border-radius: 0px; margin: 0; position: fixed; top: 0; bottom: 0; left: 0; right: 0; padding: 0px;",

    events: {
        onScrollTo: ""
    },
    published: {
        running: "",
        downloading: -1
    },
    bindings: [
        {from: "^moboreader.Spritz.dlActivity", to: ".downloading"},
        {from: "^moboreader.Spritz.running", to: ".$.scrim.showing"}
    ],
    wpm: 300,
    minWpm: 300,
    maxWpm: 800,

    handlers: {
        //ontap: "onTap"
    },
    components: [
        {
            name: "scrim",
            style: "z-index: -1; background-color: darkgrey; width: 100%; padding: 0px; position: absolute; top: 0; bottom: 0; left: 0; right: 0;",
            ontap: "onTap"
            //ondragstart: "dragStart",
            //ondrag: "drag",
            //ondragfinish: "dragEnd"
        },
        {
            name: "transpScrim",
            style: "z-index: -2; background-color: darkgrey; width: 100%; padding: 0px; position: absolute; top: 0; bottom: 0; left: 0; right: 0; opacity: 0.5;",
            ontap: "onTap"
            //ondragstart: "dragStart",
            //ondrag: "drag",
            //ondragfinish: "dragEnd"
        },
        {
            name: "downloadingSpritzData",
            style: "background-color: #4c4c4c; text-align: center; font-size: 18px; padding: 30px 0px; position: absolute; top: 30%; width: 100%;",
            content: "Downloading spritz data..."
        },
        {
            id: "spritzer",
            classes: "spritz-container",
            name: "spritzer"
        },
        {
            name: "wpmDisplay",
            style: "text-align: center; color: black; padding: 10px; width: 100%; position: absolute; top: 30%",
            content: "",
            showing: true,
            ontap: "onTap"
        }
    ],

    prepareSpritz: function (articleModel) {
        this.show();

        this.articleModel = articleModel;
        this.dlId = moboreader.Spritz.start(this.articleModel);

        if (this.dlId < 0) {
            this.$.downloadingSpritzData.hide();
            this.$.spritzer.show();
            moboreader.Spritz.pause();
        } else {
            this.needDownload = true;
            this.$.downloadingSpritzData.show();
            this.$.spritzer.hide();
        }
    },
    downloadingChanged: function () {
        //this.log("Download done: ", this.downloading);
        if (this.downloading === this.dlId && this.dlId >= 0) {
            this.$.downloadingSpritzData.hide();
            this.$.spritzer.show();
            this.dlId = moboreader.Spritz.start(this.articleModel);
            moboreader.Spritz.pause();
        }
    },

    stopSpritz: function () {
        moboreader.Spritz.stop();
        this.hide();
    },
    onTap: function (inSender, inEvent) {
        if (this.dragging) {
            this.log("Dragging, ignore tap.");
            return;
        }

        if (moboreader.Spritz.isComplete() || !this.articleModel.spritzOk) {
            this.hide();
            return;
        }

        if (moboreader.Spritz.isRunning()) {
            moboreader.Spritz.pause();
            this.$.wpmDisplay.hide();
        } else {
            if (inEvent.clientY > this.node.clientHeight - 58) {
                this.hide();
                return;
            }
            this.calcWPM(inEvent.clientX);
            moboreader.Spritz.resume();
        }
        this.setRunning(moboreader.Spritz.isRunning());
    },
    calcWPM: function (clientX) {
        var ratio = clientX / this.node.clientWidth;
        this.wpm = (this.maxWpm - this.minWpm) * ratio + this.minWpm;

        var realWpm = moboreader.Spritz.setWpm(this.wpm);
        this.showWPM(Math.round(this.wpm), realWpm);
    },
    showWPM: function (wpm, realWpm) {
        this.$.wpmDisplay.setContent("Words per minute: " + realWpm + (wpm !== realWpm ? " (Login to go faster)" : ""));
        this.$.wpmDisplay.show();
        //setTimeout(function () {
        //    this.$.wpmDisplay.hide();
        //}.bind(this), 750);
    },


    drag: function (inSender, inEvent) {
        this.log("Dragging: ", inEvent);

        this.dragging = true;
        this.doScrollTo({dy: inEvent.dy});
        this.calcWPM(inEvent.clientX);
    },
    dragStart: function (inSender, inEvent) {
        this.log("Drag Start: ", inEvent);
        this.dragStart = {x: inEvent.clientX, y: inEvent.clientY};
        this.dragging = true;
    },
    dragEnd: function (inSender, inEvent) {
        this.log("Drag end: ", inEvent);

        this.doScrollTo({dy: inEvent.dy});
        this.calcWPM(inEvent.clientX);
        setTimeout(function () {
            this.dragging = false;
        }.bind(this), 500);
    }
});
