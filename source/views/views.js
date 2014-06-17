/**
    For simple applications, you might define all of your views in this file.
    For more complex applications, you might choose to separate these kind definitions
    into multiple files under this folder.
*/

enyo.kind({
    name: "moboreader.MainView",
    kind: "FittableRows",
    fit: true,
    bindings: [
        {from: ".$.api.active", to: ".$.activitySpinner.showing"}
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
                            style: "text-align: center",
                            components: [
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
                            fixedChildSize: 30, //fill with something useful
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
            name: "articleCollection",
            kind: "moboreader.ArticleCollection",
            url: "pocket-unread-list"
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.$.articleCollection.fetch();
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

    articleSelected: function (inSender, inEvent) {
        var model = this.$.articleList.selected();
        if (model) {
            this.$.articleView.setArticleModel(model);
            this.$.MainPanels.setIndex(1);
            this.$.articleList.deselectAll();
        }
    },
    handleBackGesture: function () {
        this.$.MainPanels.setIndex(0);
    }
});

