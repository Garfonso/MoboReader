enyo.kind({
    name: "moboreader.ArticleView",
    kind: "FittableRows",
    published: {
        articleModel: "",
        api: "",
        collection: "",
        content: "",
        currentWord: ""
    },
    events: {
        onBack: ""
    },
    components: [
        {
            kind: "onyx.Toolbar",
            name: "articleTitle",
            style: "text-align: center; white-space: normal;",
            ontap: "openUrl"
        },
        {
            kind: "enyo.Scroller",
            name: "scroller",
            touch: true,
            fit: true,
            horizontal: "hidden",
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
                    name: "spritzBtn",
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
            onScrollTo: "scrollTo"
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture"
        },
        {
            kind: "moboreader.LinkPopup",
            name: "linkPopup"
        }
    ],
    bindings: [
        {from: ".articleModel.title", to: ".$.articleTitle.content"},
        {from: ".articleModel.content", to: ".$.articleContent.content"},
        {from: ".$.articleContent.content", to: ".content"},
        {from: "^moboreader.Prefs.useSpritz", to: ".$.spritzBtn.showing"},

        {from: ".articleModel.favorite", to: ".$.favButton.content", transform: function (val) {
            return val ? "Unfavorite" : "Favorite";
        } },
        {from: ".articleModel.archived", to: ".$.archiveButton.content", transform: function (val) {
            return val ? "Re-Add" : "Archive";
        } },

        {from: "^.moboreader.Prefs.fontSize", to: ".$.articleContent.style", transform: function (val) {
            this.log("Incomming: ", val);
            return "font-size: " + val + "px;";
        }},

        {from: "^.moboreader.Spritz.wordCompleted", to: ".currentWord" }
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
    processChildren: function (node) {
        var i,
            text,
            children = node.children,
            child,
            scroller;

        for (i = 0; i < children.length; i += 1) {
            child = children[i];
            this.processChildren(child);
        }

        if (node.scrollWidth > node.clientWidth) {
            console.log("Need scroller!");
            console.log("Processing node ", node);
            console.log("Width: ", node.scrollWidth, " > ", node.clientWidth, ": ", node.scrollWidth > node.clientWidth);

            scroller = new enyo.Scroller({
                touch: true,
                horizontal: "scroll",
                vertical: "hidden",
                thumb: false,
                classes: "enyo-fill",
                components: [
                    {allowHtml: true, content: node.innerHTML}
                ]
            });
            scroller.renderInto(node);

            //child.style.overflowWrap = "break-word";
            node.style.backgroundColor = "rgb(220, 220, 220)";

            console.log("Scroll width now is: ", node.scrollWidth);
        }

        if (node.tagName === "A") {
            node.onclick = this.linkClick.bind(this);
        }

        //maybe add . to end of headline.
        if (node.tagName.indexOf("H") === 0) {
            text = node.textContent.trim();
            if (text !== "" &&
                text.charAt(text.length - 1) !== "." &&
                text.charAt(text.length - 1) !== "?" &&
                text.charAt(text.length - 1) !== "!") {
                text += ".";
            }
        }
    },
    contentChanged: function () {
        this.log("ArticleContent changed.");

        setTimeout(function () {
            this.processChildren(this.$.articleContent.node);
        }.bind(this), 100);
    },
    linkClick: function (event) {
        this.log("Link clicked: ", event);
        var url = event.target.href;
        this.$.linkPopup.setUrl(url);
        this.$.linkPopup.showAtEvent(event);

        event.preventDefault();
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
        this.$.spritzDialog.prepareSpritz(this.articleModel);
    },
    currentWordChanged: function () {
        this.log("Current Word: ", this.currentWord, " model: ", this.articleModel, " spritz: ", this.articleModel.spritzOk);
        if (this.articleModel && this.articleModel.spritzOk) {
            var ratio = this.currentWord / this.articleModel.get("spritzModel").getWordCount();
            this.log("Ratio: ", ratio);
            this.log("Scroll Val: ", this.$.scroller.getScrollBounds().maxTop * ratio);
            this.$.scroller.scrollTo(0, this.$.scroller.getScrollBounds().maxTop * ratio);
        }
    },
    scrollTo: function (inSender, inEvent) {
        this.log("Incomming scroll event: ", inEvent);
        this.$.scroller.scrollTo(0, this.$.scroller.scrollTop - inEvent.dy);
    },

    openUrl: function () {
        window.open(this.articleModel.get("url"));
    }
});

