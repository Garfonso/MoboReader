/**
    For simple applications, you might define all of your views in this file.
    For more complex applications, you might choose to separate these kind definitions
    into multiple files under this folder.
*/

enyo.kind({
    name: "moboreader.MainView",
    kind: "FittableRows",
    fit: true,
    published: {
        pocketDL: 0,
        spritzDL: 0
    },
    computed: {
        activity: ["pocketDL", "spritzDL", {cached: true}]
    },
    activity: function () { return this.pocketDL || this.spritzDL; },
    bindings: [
        {from: ".$.api.active", to: ".pocketDL" },
        {from: "^.moboreader.Spritz.numDownloading", to: ".spritzDL"},
        {from: ".activity", to: ".$.activitySpinner.showing"},
        {from: ".$.articleCollection.length", to: ".$.articleCount.content" }
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
            name: "articleCollection",
            kind: "moboreader.ArticleCollection",
            url: "pocket-unread-list"
        },
        {
            kind: "Signals",
            onAddArticle: "addArticle"
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.$.articleList.set("collection", this.$.articleCollection);
        //this.$.articleCollection.destroyAllLocal();
        this.$.articleCollection.fetch({strategy: "merge"});
        this.$.articleView.setApi(this.$.api);
        this.$.articleView.setCollection(this.$.articleCollection);

        this.$.authDialog.setApi(this.$.api);
    },

    showAuthDialog: function () {
        this.$.authDialog.doShow();
    },
    hideAuthDialog: function (inSender, inResponse) {
        if (inResponse.error) {
            this.$.authDialog.resultFail(this.$.api);
        } else {
            this.$.authDialog.resultOk(inResponse.username);
            this.$.api.downloadArticles(this.$.articleCollection);
        }
    },

    showAddDialog: function () {
        this.$.addDialog.doShow();
    },
    addArticle: function (inSendder, inEvent) {
        this.$.api.addArticle(inEvent.url, this.$.articleCollection);
    },

    refreshTap: function () {
        this.$.api.downloadArticles(this.$.articleCollection);
    },
    forceRefreshTap: function () {
        this.$.articleCollection.whipe();
        this.$.api.downloadArticles(this.$.articleCollection, true);
    },
    settingsTap: function () {
        this.$.settingsDialog.show();
    },

    articleSelected: function (inSender, inEvent) {
        this.lastIndex = inEvent.index;
        var model = this.$.articleList.selected();
        if (model) {
            this.$.articleView.setArticleModel(model);
            this.$.MainPanels.setIndex(1);
            this.$.articleList.deselectAll();
        }
    },
    handleBackGesture: function () {
        if (this.lastIndex) {
            if (this.lastIndex >= this.$.articleCollection.length) {
                this.lastIndex = this.$.articleCollection.length -1;
            }
            this.$.articleList.scrollToIndex(this.lastIndex);
        }
        this.$.MainPanels.setIndex(0);
    }
});

