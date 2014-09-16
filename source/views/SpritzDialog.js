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
        running: "",
        preventBack: ""
    },
    bindings: [
        {from: "^moboreader.Spritz.running", to: ".$.scrim.showing"},
        {from: "^moboreader.Spritz.running", to: ".running"},
        {from: "^moboreader.Spritz.username", to: ".$.loginButton.content"},
        {from: ".$.downloadingSpritzData.showing", to: ".preventBack"}
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
            attributes: {"data-role": "spritzer"},
            name: "spritzer"
        },
        {
            name: "spritzControl",
            classes: "spritz-container",
            style: "text-align: center; color: black; padding: 10px 0;",
            components: [
                {
                    name: "wpmDisplay",
                    style: "display: inline-block; margin-left: 70px; padding-top: 4px;",
                    content: "",
                    showing: true,
                    ontap: "onTap"
                },
                {
                    name: "loginButton",
                    kind: "onyx.Button",
                    style: "display: inline-block; float: right; height: 1.5em; padding: 0px 5px; margin-right: 15px; max-width: 240px;",
                    content: "Login",
                    showing: true,
                    ontap: "startLogin"
                }
            ]
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
            this.$.spritzControl.show();
            this.dlId = moboreader.Spritz.start(this.articleModel);
            this.setWPM(this.wpm);
            this.doSpritzReady();
        } else {
            this.$.downloadingSpritzData.show();
            this.$.spritzer.hide();
            this.$.spritzControl.hide();
            this.doSpritzDownload();
        }
    },
    downloadingDone: function (inSender, inEvent) {
        if (inEvent.id === this.dlId) {
            if (inEvent.success) {
                this.$.downloadingSpritzData.hide();
                this.$.spritzer.show();
                this.$.spritzControl.show();
                this.setWPM(this.wpm);
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
        this.log("Real wpm: " + realWpm + " target was: " + this.wpm + " floored: " + Math.floor(this.wpm));
        this.showWPM(Math.floor(this.wpm), realWpm);
    },
    showWPM: function (wpm, realWpm) {
        this.$.wpmDisplay.setContent("WPM: " + realWpm + (wpm !== realWpm ? " (Login to go faster)" : ""));
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
    },

    startLogin: function (inSender, inEvent) {
        moboreader.Spritz.login();
    }
});
