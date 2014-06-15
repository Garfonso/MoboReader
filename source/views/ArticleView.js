enyo.kind({
    name: "moboreader.ArticleView",
    kind: "FittableRows",
    published: {
        articleModel: "",
        api: "",
        collection: ""
    },
    components: [
        {
            kind: "onyx.Toolbar",
            name: "articleTitle",
            style: "text-align: center"
        },
        {
            kind: "enyo.Scroller",
            touch: true,
            fit: true,
            classes: "enyo-fill",
            components: [
                {
                    name: "articleContent",
                    allowHtml: true,
                    fit: true,
                    classes: "enyo-fill enyo-fit ",
                    style: "width: 90%; height: 100%; max-width: 600px; margin: 0 auto;"
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
                    content: "Archive",
                    ontap: "archiveTap"
                },
                {
                    kind: "onyx.Button",
                    content: "Favorite",
                    ontap: "favoriteTap"
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
        }
    ],
    bindings: [
        {from: ".articleModel.resolved_title", to: ".$.articleTitle.content"},
        {from: ".articleModel.content", to: ".$.articleContent.content"}
    ],
    articleModelChanged: function () {
        if (!this.articleModel.get("content") && this.api) {
            this.log("Downloading article content.");
            this.api.getArticleContent(this.articleModel);
        }
    },
    refreshTap: function () {
        this.api.getArticleContent(this.articleModel);
    },
    archiveTap: function () {
        this.api.articleAction(this.articleModel, "archive", this.collection);
    },
    favoriteTap: function () {
        if (this.articleModel.get("favorite") === "0") {
            this.api.articleAction(this.articleModel, "favorite", this.collection);
        } else {
            this.api.articleAction(this.articleModel, "unfavorite", this.collection);
        }
    },
    deleteTap: function () {
        this.api.articleAction(this.articleModel, "delete", this.collection);
    },

    spritzTap: function () {
        //need to implement!!
    }
});

