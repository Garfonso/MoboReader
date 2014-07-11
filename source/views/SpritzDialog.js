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
        onScrollTo: "",
        onSpritzReady: "",
        onSpritzDownload: ""
    },
    published: {
        running: ""
    },
    bindings: [
        {from: "^moboreader.Spritz.running", to: ".$.scrim.showing"},
        {from: "^moboreader.Spritz.running", to: ".running"}
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
            components: [
                {content: "Downloading spritz data..."},
                {
                    kind: "onyx.Button",
                    name: "retryBtn",
                    showing: false,
                    style: "margin: 20px auto 0px auto;",
                    content: "Retry",
                    ontap: "startDL"
                }
            ]
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
        },
        {
            kind: "Signals",
            onSpritzDL: "downloadingDone"
        }
    ],

    prepareSpritz: function (articleModel) {
        this.show();
        if (webos.setWindowProperties) {
            webos.setWindowProperties({ blockScreenTimeout: true});
        }

        if (articleModel !== this.articleModel) {
            this.articleModel = articleModel;
            this.startDL();
        }
    },
    startDL: function () {
        this.$.spritzer.show(); //this is important to not destroy canvas.
        this.dlId = moboreader.Spritz.start(this.articleModel);
        this.log("DlId: ", this.dlId);
        this.$.retryBtn.hide();

        if (this.dlId < 0) {
            this.$.downloadingSpritzData.hide();
            this.$.spritzer.show();
            this.$.wpmDisplay.show();
            this.dlId = moboreader.Spritz.start(this.articleModel);
            this.setWPM(this.wpm);
            this.doSpritzReady();
        } else {
            this.$.downloadingSpritzData.show();
            this.$.spritzer.hide();
            this.$.wpmDisplay.hide();
            this.doSpritzDownload();
        }
    },
    downloadingDone: function (inSender, inEvent) {
        if (inEvent.id === this.dlId) {
            if (inEvent.success) {
                this.$.downloadingSpritzData.hide();
                this.$.spritzer.show();
                this.dlId = moboreader.Spritz.start(this.articleModel);
                this.doSpritzReady();
            } else {
                this.$.retryBtn.show();
            }
        }
    },

    stopSpritz: function () {
        moboreader.Spritz.pause();
        this.hide();

        if (webos.setWindowProperties) {
            webos.setWindowProperties({ blockScreenTimeout: false});
        }
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
        } else {
            if (inEvent.clientY > this.node.clientHeight - 58) {
                this.hide();
                return;
            }
            this.calcWPM(inEvent.clientX);
            moboreader.Spritz.resume();
        }
    },
    calcWPM: function (clientX) {
        var ratio = clientX / this.node.clientWidth;
        this.wpm = (this.maxWpm - this.minWpm) * ratio + this.minWpm;

        this.setWPM(this.wpm);
    },
    setWPM: function (wpm) {
        this.wpm = wpm;
        var realWpm = moboreader.Spritz.setWpm(this.wpm);
        this.showWPM(Math.round(this.wpm), realWpm);
    },
    showWPM: function (wpm, realWpm) {
        this.$.wpmDisplay.setContent("Words per minute: " + realWpm + (wpm !== realWpm ? " (Login to go faster)" : ""));
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
