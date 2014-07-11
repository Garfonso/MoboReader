/*global SpritzLoginDialog, $ */

enyo.kind({
    name: "SpritzLoginDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%; z-index: 130",
    scrim: true,
    modal: true,
    autoDismiss: true,
    floating: true,
    centered: true,
    showTransitions: true,
    components: [
        {
            kind: "enyo.Scroller",
            classe: "enyo-fill",
            components: [
                {
                    name: "message",
                    content: "Loging in to spritz. Please log in to spritz in new window and copy result and paste it below."
                },
                {
                    kind: "onyx.InputDecorator",
                    style: "display: block; width: 90%; margin: 10px auto;",
                    components: [
                        {
                            classes: "enyo-fill",
                            name: "resultEntry",
                            kind: "onyx.Input",
                            placeholder: "Paste result here"
                        }
                    ]
                },
                {
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Button",
                    content: "Finish Auth",
                    name: "finishBtn",
                    ontap: "doFinish"
                },
                {
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Button",
                    content: "Retry",
                    name: "retryBtn",
                    ontap: "doRetry"
                }
            ]
        }
    ],
    published: {
        loginResult: false
    },
    doFinish: function () {
        var auth = this.$.resultEntry.getValue();
        if (auth) {
            this.loginResult = auth;
            SpritzClient.setAuthResponse(auth);
            moboreader.Spritz.init();
            this.hide();
        }
    },
    doRetry: function () {
        SpritzClient.userLogin();
    }
});

enyo.singleton({
    name: "moboreader.Spritz",

    published: {
        wordCompleted: 0,
        totalWords: 0,
        running: false,
        numDownloading: 0,
        available: false
    },
    bindings: [
        { from: "^.moboreader.Prefs.useSpritz", to: ".available" }
    ],
    dlCounter: 0,
    initialized: false,

    availableChanged: function () {
        this.log("Need to activate Spritz: ", moboreader.Prefs.useSpritz);
        if (moboreader.Prefs.useSpritz) {
            if (window.$ === undefined && !this.loadingJQuery) {
                //load jquery
                this.loadScript("jquery-2.1.0.min.js");
                this.loadingJQuery = true;
            }
            if (window.SpritzClient === undefined && !this.loadingSpritz) {
                if (window.$) {
                    //load spritz
                    this.loadScript("spritz.1.2.min.js");
                    this.loadingSpritz = true;
                } else {
                    this.log("Delaying spritz loading until jquery is ready.");
                    setTimeout(this.availableChanged.bind(this), 100);
                }
            }
        }
    },

    login: function (popupWindow) {
        if (popupWindow) {
            SpritzClient.userLogin();
        }
        var dialog = new SpritzLoginDialog();
        dialog.show();
    },

    loadScript: function (name) {
        this.log("Loading ", name);
        var head = document.getElementsByTagName("head")[0],
            script = document.createElement("script");
        script.type = "text/javascript";
        script.charset = "utf-8";
        script.src = "assets/" + name;
        head.appendChild(script);
    },

    init: function () {
        var node = $("#spritzer"),
            options = {
                defaultSpeed: 500,
                speedItems: [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,  950, 1000],
                redicleWidth: node.width() - 10
            };

        if (this.initialized) {
            this.spritzController.detach();
            delete this.spritzController;
        }

        this.spritzController = new SPRITZ.spritzinc.SpritzerController(options);
        this.spritzController.attach(node);
        this.spritzController.setProgressReporter(this.bindSafely("receiveProgress"));

        this.initialized = true;

        //if (!SpritzClient.isUserLoggedIn()) {
            //this.login();
        var btn = document.getElementsByClassName("spritzer-login-btn")[0];
        if (btn) {
            btn.addEventListener("click", function () { this.login(false); }.bind(this));
        }
        //}

        setInterval(function () {
            this.setRunning(this.isRunning());
        }.bind(this), 100);
    },

    receiveProgress: function (completed, total) {
        this.setWordCompleted(completed);
        this.setTotalWords(total);
    },

    start: function (articleModel, restart) {
        var spritzModel;

        if (!this.initialized) {
            this.init();
        }

        if (articleModel.spritzOk && articleModel.spritzModel) {
            spritzModel = articleModel.spritzModel;
        } else if (articleModel.spritzModelPersist) {
            articleModel.spritzModel = this.restoreSpritzModel(articleModel.spritzModelPersist);
            articleModel.spritzOk = true;
            spritzModel = articleModel.spritzModel;
            spritzModel.reset();
        } else {
            this.log("Need to download spritz model from ", articleModel.attributes.url);
            if (articleModel.spritzDownloading >= 0) {
                return articleModel.spritzDownloading;
            } else {
                return this.downloadSpritzModel(articleModel);
            }
        }

        if (restart) {
            spritzModel.reset();
        }
        this.spritzController.startSpritzing(spritzModel);
        this.pause();

        return -1;
    },
    stop: function () {
        this.spritzController.stopSpritzing();
    },

    pause: function () {
        this.spritzController.pauseSpritzing();
    },
    resume: function () {
        this.spritzController.resumeSpritzing();
    },

    setWpm: function (wpm) {
        if (!this.spritzController.setSpeed(wpm)) {
            this.spritzController.setSpeed(this.spritzController.maxUnregisteredSpeed);
        }
        return this.spritzController.getSpeed();
    },

    isRunning: function () {
        return this.spritzController.spritzPanel.isRunning();
    },
    isComplete: function () {
        return this.spritzController.spritzPanel.isCompleted();
    },

    downloadSpritzModel: function (articleModel, webContent) {
        if (!webContent) {
            webContent = null;
        }
        this.dlCounter += 1;
        this.setNumDownloading(this.numDownloading + 1);
        articleModel.spritzDownloading = this.dlCounter;

        if (!articleModel.attributes.content) {
            SpritzClient.fetchContents(articleModel.get("url"),
                                       this.bindSafely("fetchSuccess", articleModel, this.dlCounter, webContent),
                                       this.bindSafely("fetchError", articleModel, this.dlCounter, webContent));
        } else {
            var locale = articleModel.attributes.content,
                start = locale.indexOf("lang=\"") + 6,
                end = locale.indexOf("\"", start),
                tmpNode = document.createElement("div"),
                text = "";

            if (start >= 0 && end >= 0 && end > start) {
                locale = locale.substring(start, end);
                this.log("Extracted locale: ", locale);
            } else {
                locale = "en";
                this.error("Could not extract locale.");
            }

            //now get rid of HTML:
            tmpNode.innerHTML = articleModel.attributes.content;
            text = tmpNode.innerText;

            SpritzClient.spritzify(text, locale,
                                   this.bindSafely("fetchSuccess", articleModel, this.dlCounter, webContent),
                                   this.bindSafely("fetchError", articleModel, this.dlCounter, webContent));
        }

        return this.dlCounter;
    },
    fetchSuccess: function (articleModel, dlId, webContent, result) {
        this.log("Got spritzData: ", result);
        if (!articleModel.attributes || !articleModel.previous) {
            this.log("Article was already destroyed.");
        } else {
            articleModel.spritzModel = result;
            articleModel.spritzOk = true;
        }
        delete articleModel.spritzDownloading;

        var spritzPersist = this.storeSpritzModel(result);

        enyo.Signals.send("onArticleDownloaded", {
            id: articleModel.get(articleModel.primaryKey),
            content: {
                web: webContent,
                spritz: spritzPersist
            },
            model: articleModel
        });

        enyo.Signals.send("onSpritzDL", {id: dlId, success: true});
        this.setNumDownloading(this.numDownloading - 1);
    },
    fetchError: function (articleModel, dlId) {
        this.log("Error fetching: ", articleModel.get("url"));
        enyo.Signals.send("onSpritzDL", {id: dlId, success: false});
        this.setNumDownloading(this.numDownloading - 1);
        delete articleModel.spritzDownloading;
        
        enyo.Signals.send("onArticleDownloaded", {
            id: articleModel.get(articleModel.primaryKey),
            content: {},
            model: articleModel
        });
    },

    storeSpritzModel: function (spritzModel) {
        var obj = {
            contentVersion: spritzModel.getContentVersionId(),
            words: spritzModel.getWords(),
            duration: spritzModel.getDuration(),
            locale: spritzModel.getLocale(),
            version: spritzModel.getVersion(),
            wordCount: spritzModel.getWordCount()
        };

        this.log("Created object: ", obj, " from ", spritzModel);

        return obj;
    },
    restoreSpritzModel: function (obj) {
        var words = [];
        obj.words.forEach(function (word, index) {
            words[index] = new SPRITZ.model.TimedWord(word.word, word.orp, word.multiplier, word.position, word.flags);
        });

        return new SPRITZ.model.SpritzText(obj.contentVersion, words, obj.duration, obj.locale, obj.version, obj.wordCount);
    }
});
