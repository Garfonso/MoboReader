enyo.kind({
    name: "moboreader.ArticleView",
    kind: "FittableRows",
    published: {
        articleModel: "",
        api: "",
        collection: ""
    },
    events: {
        onBack: ""
    },
    components: [
        {
            kind: "onyx.Toolbar",
            name: "articleTitle",
            style: "text-align: center",
            ontap: "openUrl"
        },
        {
            kind: "enyo.Scroller",
            name: "scroller",
            touch: true,
            fit: true,
            classes: "enyo-fill",
            components: [
                {
                    name: "articleContent",
                    allowHtml: true,
                    fit: true,
                    classes: "enyo-fill enyo-fit article-container"
                }
            ]
        },
        {
            kind: "onyx.MoreToolbar",
            components: [
                {
                    kind: "onyx.Grabber"
                },
                {
                    kind: "onyx.Button",
                    content: "Spritz",
                    ontap: "spritzTap"
                },
                {
                    kind: "onyx.Button",
                    name: "archiveButton",
                    content: "Archive",
                    ontap: "archiveTap"
                },
                {
                    kind: "onyx.Button",
                    name: "favButton",
                    content: "Favorite",
                    ontap: "favoriteTap"
                },
                {
                    kind: "onyx.Button",
                    name: "copyButton",
                    content: "Copy URL",
                    ontap: "copyTap"
                },
                {
                    kind: "onyx.Button",
                    content: "Refresh",
                    ontap: "refreshTap"
                },
                {
                    kind: "onyx.Button",
                    content: "Delete",
                    ontap: "deleteTap"
                }
            ]
        },
        {
            name: "spritzDialog",
            kind: "SpritzDialog",
            onPartDone: "scrollToPart"
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture"
        }
    ],
    bindings: [
        {from: ".articleModel.title", to: ".$.articleTitle.content"},
        {from: ".articleModel.content", to: ".$.articleContent.content"},

        {from: ".articleModel.favorite", to: ".$.favButton.content", transform: function (val) {
            return val ? "Unfavorite" : "Favorite";
        } },
        {from: ".articleModel.archived", to: ".$.archiveButton.content", transform: function (val) {
            return val ? "Re-Add" : "Archive";
        } }
    ],
    handleBackGesture: function (inSender, inEvent) {
        this.log("Incomming back gesture!!");
        if (this.$.spritzDialog.running) {
            this.$.spritzDialog.stopSpritz();
        } else if (this.$.spritzDialog.showing) {
            this.$.spritzDialog.hide();
        } else {
            this.doBack();
        }

        inEvent.preventDefault();
    },
    articleModelChanged: function (oldValue) {
        this.$.spritzDialog.hide();
        this.log("oldValue: ", oldValue);
        if (oldValue && this.oldListener) {
            oldValue.removeListener("destroy", this.oldListener);
        }

        if (!this.articleModel.get("content") && this.api) {
            this.log("Downloading article content.");
            this.api.getArticleContent(this.articleModel);
        }

        this.oldListener = this.articleModel.addListener("destroy", this.bindSafely("doBack"));
    },
    refreshTap: function () {
        this.api.getArticleContent(this.articleModel);
    },
    archiveTap: function () {
        this.doBack();
        this.articleModel.doArchive(this.api, this.collection);
    },
    favoriteTap: function () {
        this.articleModel.doFavorite(this.api, this.collection);
    },
    deleteTap: function () {
        this.doBack();
        this.articleModel.doDelete(this.api, this.collection);
    },
    copyTap: function () {

    },

    spritzTap: function () {
        this.$.spritzDialog.prepareSpritz(this.$.articleContent.node.children[0].children);
    },
    scrollToPart: function (inSender, inEvent) {
        this.log("Trying to scroll to ", inEvent.part, " = ", inEvent.node);
        this.$.scroller.scrollToNode(inEvent.node, false);
    },

    openUrl: function () {
        window.open(this.articleModel.get("url"));
    }
});

