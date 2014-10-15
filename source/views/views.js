/*global ArticleContentHandler */

enyo.kind({
    name: "moboreader.MainView",
    kind: "FittableRows",
    fit: true,
    published: {
        pocketDL: 0,
        spritzDL: 0,
        articleCollection: "",
        dbActivities: 0
    },
    computed: {
        activity: ["pocketDL", "spritzDL", "dbActivities", {cached: true}]
    },
    activity: function () { return this.pocketDL || this.spritzDL || this.dbActivities; },
    bindings: [
        {from: ".$.api.active", to: ".pocketDL" },
        {from: "^.moboreader.Spritz.numDownloading", to: ".spritzDL"},
        {from: ".activity", to: ".$.activitySpinner.showing"},
        {from: ".articleCollection.length", to: ".$.articleCount.content" },
        {from: ".$.ArticleContentHandler.dbActivities", to: ".dbActivities" }
    ],
    components: [
        {
            kind: "onyx.Spinner",
            name: "activitySpinner",
            showing: false,
            style: "position: absolute; right: 5px; top: 5px; margin: 0px; background-color: rgb(80,80,80); border-radius: 15px; z-index: 100;"
        },
        {
            kind: "enyo.Panels",
            fit: true,
            draggable: false,
            classes: "enyo-fill",
            name: "MainPanels",
            components: [
                {
                    name: "ArticleListPanel",
                    kind: "FittableRows",
                    classes: "enyo-fill enyo-fit",
                    components: [
                        {
                            kind: "onyx.Toolbar",
                            style: "text-align: center;",
                            components: [
                                {
                                    style: "text-align: center; margin: auto; float: left;",
                                    components: [
                                        {
                                            style: "font-size: 14px;",
                                            name: "articleCount",
                                            content: "0"
                                        },
                                        {
                                            style: "font-size: 10px;",
                                            content: "Articles"
                                        }
                                    ]
                                },
                                {content: "Mobo Reader"}
                            ]
                        },
                        {
                            kind: "enyo.DataList",
                            ontap: "articleSelected",
                            name: "articleList",
                            fit: true,
                            scrollerOptions: {
                                horizontal: "hidden",
                                touch: true
                            },
                            onScroll: "listScrolled",
                            fixedChildSize: 50,
                            components: [
                                {kind: "moboreader.ArticleListItem" }
                            ]
                        },
                        {
                            kind: "onyx.MoreToolbar",
                            components: [
                                {
                                    kind: "onyx.Button",
                                    content: "Refresh",
                                    ontap: "refreshTap"
                                },
                                {
                                    kind: "onyx.Button",
                                    content: "Add",
                                    ontap: "showAddDialog"
                                },
                                {
                                    kind: "onyx.Button",
                                    content: "Force Refresh",
                                    ontap: "forceRefreshTap"
                                },
                                {
                                    kind: "onyx.Button",
                                    content: "Settings",
                                    ontap: "settingsTap"
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "ArticleViewPanel",
                    classes: "enyo-fill enyo-fit",
                    onBack: "handleBackGesture",
                    components: [
                        {kind: "moboreader.ArticleView", name: "articleView", classes: "enyo-fill enyo-fit", onBack: "handleBackGesture"}
                    ]
                }
            ]
        },

        //non ui stuff:
        {
            name: "api",
            kind: "moboreader.Api"
        },
        {
            name: "addDialog",
            kind: "moboreader.AddDialog",
            onAdd: "addArticle"
        },
        {
            name: "settingsDialog",
            kind: "moboreader.SettingsDialog",
            onLogoutRequest: "logoutOfPocket"
        },
        {
            kind: "Signals",
            onAddArticle: "addArticle",
            onrelaunch: "addArticle",
            onactivate: "startRefreshTimer",
            ondeactivate: "stopRefreshTimer",
            onArticleOpReturned: "continueWipe",

            onNeedShowAuth: "showAuth",
            onAuthOk: "refreshTap",
            onHideAuth: "hideAuth"
        }
    ],
    create: function () {
        this.inherited(arguments);

        function fetchResult() {
            //do this after fetch to prevent empty list in UI.
            this.$.articleView.setCollection(this.articleCollection);
            this.$.articleList.set("collection", this.articleCollection);
            setTimeout(this.refreshTap.bind(this, null, null, true), 1000);

            if (window.PalmSystem) {
                window.PalmSystem.stageReady();
                if (window.PalmSystem.allowResizeOnPositiveSpaceChange) {
                    window.PalmSystem.allowResizeOnPositiveSpaceChange(false); //deactivate keyboard resizing our app.
                }
                console.error("Launch Params: " + JSON.stringify(webos.launchParams()));
                if (webos.launchParams().url) {
                    console.error("Adding article: " + webos.launchParams().url);
                    this.$.api.addArticle(webos.launchParams().url, this.articleCollection);
                }
            }
        }

        this.articleCollection = new moboreader.ArticleCollection({url: "pocket-unread-list"});
        this.articleCollection.set("url", "pocket-unread-list");
        this.articleCollection.fetch({strategy: "merge", success: fetchResult.bind(this), fail: fetchResult.bind(this)});
        this.$.articleView.setApi(this.$.api);
    },
    startRefreshTimer: function () {
        if (this.invervalId) {
            clearInterval(this.invervalId);
        }
        this.intervalId = setInterval(this.bindSafely("refreshTimerCalled"), 300000); //refresh all 5 min if active.
    },
    refreshTimerCalled: function () {
        if (!this.$.api.authModel.needLogin && !this.get("activity")) {
            this.refreshTap(null, null, true);
        } else {
            console.error("Are not authed (" + this.$.api.authModel.needLogin + ") or are active (" + this.pocketDL + ", " + this.spritzDL + ", " + this.dbActivities + ")");
        }
    },
    stopRefreshTimer: function () {
        if (this.invervalId) {
            clearInterval(this.invervalId);
        }
    },

    showAddDialog: function () {
        this.$.addDialog.doShow();
    },
    addArticle: function (inSendder, inEvent) {
        this.$.api.addArticle(inEvent.url, this.articleCollection);
    },

    refreshTap: function (inSender, inEvent, fastSync) {
        this.$.api.downloadArticles(this.articleCollection, !fastSync);
    },
    forceRefreshTap: function () {
        this.articleCollection.whipe();
        this.dbOpId = ArticleContentHandler.wipe();
    },
    continueWipe: function (inSender, inEvent) {
        if (inEvent.activityId === this.dbOpId) {
            if (this.loggingOut) {
                this.$.api.logout();
                this.loggingOut = false;
            } else {
                this.$.api.downloadArticles(this.articleCollection, true);
            }
        }
    },
    settingsTap: function () {
        this.$.settingsDialog.show();
    },
    logoutOfPocket: function () {
        this.loggingOut = true;
        this.forceRefreshTap();
    },

    articleSelected: function (inSender, inEvent) {
        this.lastIndex = inEvent.index;
        this.log("Stored ", this.lastIndex, " as last index.");
        this.scrolled = false;
        var model = this.$.articleList.selected();
        if (model) {
            this.$.articleView.setArticleModel(model);
            this.$.MainPanels.setIndex(1);
            this.$.articleList.deselectAll();
        }
    },
    listScrolled: function () {
        this.scrolled = true;
    },
    handleBackGesture: function () {
        if (this.$.MainPanels.getIndex() === 2) {
            this.log("In auth dialog, prevent back!");
            return;
        }

        this.$.MainPanels.setIndex(0);
        this.$.settingsDialog.hide();

        if (this.scrolled || enyo.webos.isPhone()) { //scroll to last index if list scrolled because of background operations.
            var scrollTo = this.lastIndex;
            if (this.lastIndex) {
                if (scrollTo >= this.articleCollection.length) {
                    scrollTo = this.articleCollection.length - 1;
                } else if (scrollTo < 0) {
                    scrollTo = 0;
                }
                this.log("Scrolling to ", scrollTo);
                this.$.articleList.scrollToIndex(scrollTo);
            } else {
                this.log("Lastindex not set ", this.lastIndex);
            }
        } else {
            this.log("List did not scroll");
        }
    },

    showAuth: function (inSender, inEvent) {
        if (!this.authCreated) {
            this.authCreated = true;
            var authDialog = this.$.MainPanels.createComponent({
                name: "AuthPanel",
                kind: "moboreader.AuthDialog"
            });
            this.$.MainPanels.render();
            //need to hand signal for auth dialog to catch it:
            authDialog.prepareAuthDialog(inSender, inEvent);
        }
        this.lastPanelIndex = this.$.MainPanels.getIndex();
        this.$.MainPanels.setIndex(2);
    },
    hideAuth: function (inSender, inEvent) {
        this.$.MainPanels.setIndex(this.lastPanelIndex || 0);
    }
});
