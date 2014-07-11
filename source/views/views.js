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
            kind: "moboreader.Api",
            onNeedAuth: "showAuthDialog",
            onAuthorized: "hideAuthDialog",
            onAuthFailed: "hideAuthDialog"
        },
        {
            name: "authDialog",
            kind: "moboreader.AuthDialog"
        },
        {
            name: "addDialog",
            kind: "moboreader.AddDialog",
            onAdd: "addArticle"
        },
        {
            name: "settingsDialog",
            kind: "moboreader.SettingsDialog"
        },
        {
            kind: "Signals",
            onAddArticle: "addArticle",
            onrelaunch: "addArticle",
            onactivate: "startRefreshTimer",
            ondeactivate: "stopRefreshTimer",
            onArticleOpReturned: "continueWipe"
        }
    ],
    create: function () {
        this.inherited(arguments);

        function fetchResult() {
            //do this after fetch to prevent empty list in UI.
            this.$.articleView.setCollection(this.articleCollection);
            this.$.articleList.set("collection", this.articleCollection);
            this.refreshTap(null, null, true);

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
        this.$.authDialog.setApi(this.$.api);
    },
    startRefreshTimer: function () {
        if (this.invervalId) {
            clearInterval(this.invervalId);
        }
        this.intervalId = setInterval(this.bindSafely("refreshTimerCalled"), 300000); //refresh all 5 min if active.
    },
    refreshTimerCalled: function () {
        if (!this.$.authDialog.showing && !this.get("activity")) {
            this.refreshTap(null, null, true);
        } else {
            console.error("Are not authed (" + this.$.authDialog.showing + ") or are active (" + this.get("activity") + ")");
        }
    },
    stopRefreshTimer: function () {
        if (this.invervalId) {
            clearInterval(this.invervalId);
        }
    },

    showAuthDialog: function () {
        this.$.authDialog.doShow();
    },
    hideAuthDialog: function (inSender, inResponse) {
        if (inResponse.error) {
            this.$.authDialog.resultFail(this.$.api);
        } else {
            this.$.authDialog.resultOk(inResponse.username);
            this.$.api.downloadArticles(this.articleCollection);
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
            this.$.api.downloadArticles(this.articleCollection, true);
        }
    },
    settingsTap: function () {
        this.$.settingsDialog.show();
    },

    articleSelected: function (inSender, inEvent) {
        this.lastIndex = inEvent.index + 4;
        var model = this.$.articleList.selected();
        if (model) {
            this.$.articleView.setArticleModel(model);
            this.$.MainPanels.setIndex(1);
            this.$.articleList.deselectAll();
        }
    },
    handleBackGesture: function () {
        this.$.MainPanels.setIndex(0);
        if (this.lastIndex) {
            this.log("Scrolling to ", this.lastIndex);
            if (this.lastIndex >= this.articleCollection.length) {
                this.lastIndex = this.articleCollection.length -1;
            }
            this.$.articleList.scrollToIndex(this.lastIndex);
        } else {
            this.log("Lastindex not set ", this.lastIndex);
        }
    }
});
