/*jslint sloppy: true */
/*global ArticleContentHandler, enyo, moboreader */

enyo.kind({
    name: "moboreader.ArticleView",
    kind: "FittableRows",
    published: {
        articleModel: "",
        api: "",
        collection: "",
        content: "",
        currentWord: "",
        lastScrollWord: 0
    },
    events: {
        onBack: ""
    },
    handlers: {
        onunload: "cleanUpOnUndload"
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
            thumb: true,
            fit: true,
            strategyKind: "TouchScrollStrategyWithThumbs",
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
                    kind: "onyx.Button",
                    name: "backBtn",
                    content: "Back",
                    ontap: "handleBackGesture"
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
            onScrollTo: "scrollTo",
            onSpritzReady: "spritzReady"
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture",
            onArticleDownloaded: "contentReceived",
            onArticleOpReturned: "dbOp"
        },
        {
            kind: "moboreader.LinkPopup",
            name: "linkPopup"
        }
    ],
    bindings: [
        {from: ".articleModel.title", to: ".$.articleTitle.content"},
        {from: "^moboreader.Prefs.useSpritz", to: ".$.spritzBtn.showing"},

        {from: ".articleModel.favorite", to: ".$.favButton.content", transform: function (val) {
            return val ? "Unfavorite" : "Favorite";
        } },
        {from: ".articleModel.archived", to: ".$.archiveButton.content", transform: function (val) {
            return val ? "Re-Add" : "Archive";
        } },

        {from: "^.moboreader.Prefs.fontSize", to: ".$.articleContent.style", transform: function (val) {
            return "font-size: " + val + "px;";
        }},

        {from: "^.moboreader.Spritz.wordCompleted", to: ".currentWord" }
    ],
    create: function () {
        this.inherited(arguments);

        if (window.PalmSystem && (enyo.webos.isPhone() || enyo.webos.isLuneOS())) {
            this.$.backBtn.hide();
        }
    },
    handleBackGesture: function (inSender, inEvent) {
        /*jslint unparam:true*/
        this.log("Incomming back gesture!! showing: ", this.$.spritzDialog.showing, " running: ", this.$.spritzDialog.running);
        if (this.$.spritzDialog.showing) {
            if (!this.$.spritzDialog.preventBack) {
                if (this.$.spritzDialog.running) {
                    this.$.spritzDialog.stopSpritz();
                }
                this.$.spritzDialog.hide();
            }
        } else {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            if (this.articleModel) {
                this.cleanUpArticle(this.articleModel);
            }
            this.doBack();
        }

        inEvent.preventDefault();
    },
    cleanUpArticle: function (oldValue) {
        //keep memory footprint small:
        delete oldValue.webContent;
        delete oldValue.spritzModelPersist;

        if (oldValue && oldValue.attributes && oldValue.previous) {
            oldValue.set("scrollPos", this.$.scroller.scrollTop);
            oldValue.showing = false;
            oldValue.commit();
        }
    },
    articleModelChanged: function (oldValue) {
        this.$.spritzDialog.hide();
        if (oldValue) {
            if (this.oldListener) {
                oldValue.removeListener("destroy", this.oldListener);
            }

            this.cleanUpArticle(oldValue);
        }

        this.received = false;
        this.$.scroller.$.strategy.hideThumbs();
        this.$.spritzBtn.removeClass("onyx-affirmative");
        this.$.spritzBtn.setDisabled(true);
        this.lastScrollWord = 0;
        this.$.articleContent.destroyClientControls();
        this.$.articleContent.setContent("Asking db for content...");

        enyo.Signals.send("onStartDBActivity", {});
        this.articleOpId = ArticleContentHandler.getContent(this.articleModel);

        this.articleModel.showing = true;
        //this.oldListener = this.articleModel.addListener("destroy", this.bindSafely("doBack"));
    },
    downloadContent: function () {
        this.log("Downloading article content.");
        this.api.getArticleContent(this.articleModel);
    },
    processChildren: function (node) {
        var i,
            children = node.children,
            child,
            scroller;

        for (i = 0; i < children.length; i += 1) {
            child = children[i];
            this.processChildren(child);
        }

        if (node.scrollWidth > node.clientWidth) {
            scroller = this.$.articleContent.createComponent({
                kind: "enyo.Scroller",
                touch: true,
                horizontal: "scroll",
                vertical: "hidden",
                thumb: false,
                preventDragPropagation: false,
                preventScrollPropagation: false,
                classes: "enyo-fill",
                components: [
                    {allowHtml: true, content: node.innerHTML}
                ]
            });
            scroller.renderInto(node);

            //child.style.overflowWrap = "break-word";
            node.style.backgroundColor = "rgb(220, 220, 220)";
        }

        if (node.tagName === "A") {
            node.onclick = this.linkClick.bind(this);
        }
    },
    dbOp: function (inSender, inEvent) { //filter events here.
        if (inEvent.activityId === this.articleOpId) {
            if (inEvent.success && inEvent.content && inEvent.content.web) {
                this.contentReceived(inSender, inEvent);
            } else {
                this.$.articleContent.setContent("Need to download content...");
                this.downloadContent();
            }
        }
    },
    contentReceived: function (inSender, inEvent) {
        /*jslint unparam:true*/
        if (this.articleModel && this.articleModel.get && this.articleModel.get(this.articleModel.primaryKey) === inEvent.id) {
            this.log("ArticleContent changed: ", inEvent);
            this.$.spritzBtn.setDisabled(false);

            if (inEvent.content.spritz) {
                this.articleModel.spritzModelPersist = inEvent.content.spritz;
            }
            if (inEvent.content.web) {
                this.log("Updating content...");
                this.articleModel.webContent = inEvent.content.web;
                this.$.articleContent.setContent(inEvent.content.web);
                this.received = true;

                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }
                this.timeoutID = setTimeout(function () {
                    this.processChildren(this.$.articleContent.node);
                    this.log("Scrolling to " + this.articleModel.get("scrollPos"));
                    this.$.scroller.setScrollTop(this.articleModel.get("scrollPos") || 1);
                    this.$.scroller.$.strategy.showThumbs();
                }.bind(this), 300);
            } else {
                this.log("No web content?");
                if (!this.received) {
                    this.$.articleContent.setContent("Download failed. Please try again later.");
                }
            }

            if (!this.received) {
                this.$.articleContent.setContent("Content download failed, please press refresh to retry.");
            }
        }
    },
    linkClick: function (event) {
        this.log("Link clicked: ", event);
        var url = event.target.href;
        this.$.linkPopup.setUrl(url);
        this.$.linkPopup.showAtEvent(event);

        event.preventDefault();
    },

    refreshTap: function () {
        moboreader.Spritz.resetArticle(this.articleModel);
        this.api.getArticleContent(this.articleModel);
    },
    archiveTap: function () {
        this.articleModel.doArchive(this.api, this.collection);
        if (moboreader.Prefs.getGoBackOnArchive()) {
            this.doBack();
        }
    },
    favoriteTap: function () {
        this.articleModel.doFavorite(this.api, this.collection);
    },
    deleteTap: function () {
        this.doBack();
        this.articleModel.doDelete(this.api, this.collection);
    },
    copyTap: function () {
        return undefined;
    },

    spritzTap: function () {
        this.$.spritzDialog.prepareSpritz(this.articleModel);
    },
    currentWordChanged: function () {
        this.log("Current Word: ", this.currentWord, " model: ", this.articleModel, " spritz: ", this.articleModel.spritzOk);
        if (this.articleModel && this.articleModel.spritzOk && this.currentWord - this.lastScrollWord > 20) {
            var ratio = this.currentWord / this.articleModel.spritzModel.getWordCount();
            this.log("Ratio: ", ratio);
            this.log("Scroll Val: ", this.$.scroller.getScrollBounds().maxTop * ratio);
            this.$.scroller.scrollTo(0, this.$.scroller.getScrollBounds().maxTop * ratio);
            this.lastScrollWord = this.currentWord;
        }
    },
    scrollTo: function (inSender, inEvent) {
        /*jslint unparam:true*/
        this.log("Incomming scroll event: ", inEvent);
        this.$.scroller.scrollTo(0, this.$.scroller.scrollTop - inEvent.dy);
    },

    openUrl: function () {
        window.open(this.articleModel.get("url"));
    },

    spritzReady: function () {
        this.$.spritzBtn.addClass("onyx-affirmative");
    }
});
