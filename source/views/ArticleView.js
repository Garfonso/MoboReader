/*jslint sloppy: true, browser: true */
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
			onSpritzReady: "spritzReady",
			onSpritzTranslutient: "resizeOurself"
		},
		{
			kind: "enyo.Signals",
			onbackbutton: "handleBackGesture",
			//onArticleDownloaded: "contentReceived",
			onArticleOpReturned: "dbOp"
		},
		{
			kind: "moboreader.LinkPopup",
			name: "linkPopup",
			onButtonTapped: "resizeOurself" //somehow toolbar goes missing after click on add?
		}
	],
	bindings: [
		{from: "articleModel.title", to: "$.articleTitle.content"},
		{from: "^.moboreader.Spritz.available", to: "$.spritzBtn.showing"},

		{from: "articleModel.favorite", to: "$.favButton.content", transform: function (val) {
			return val ? "Unfavorite" : "Favorite";
		} },
		{from: "articleModel.archived", to: "$.archiveButton.content", transform: function (val) {
			return val ? "Re-Add" : "Archive";
		} },

		{from: "^.moboreader.Prefs.fontSize", to: "$.articleContent.style", transform: function (val) {
			return "font-size: " + val + "px;";
		}},

		{from: "^.moboreader.Spritz.wordCompleted", to: "currentWord" }
	],
	create: function () {
		this.inherited(arguments);

		if (window.PalmSystem && (enyo.webos.isPhone() || enyo.webos.isLuneOS())) {
			this.$.backBtn.hide();
		}
	},
	handleBackGesture: function (inSender, inEvent) {
		/*jslint unparam:true*/
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
			this.articleModel = false;
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

		if (this.oldListener) {
			oldValue.removeListener("destroy", this.oldListener);
		}
		delete this.oldListener;
	},
	articleModelChanged: function (oldValue) {
		this.$.spritzDialog.hide();
		if (oldValue) {
			this.cleanUpArticle(oldValue);
		}

		this.received = false;
		this.first = true;
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
		if (!this.articleModel) {
			return;
		}
		if (inEvent.id === this.articleModel.get(this.articleModel.primaryKey)) { //our article is affected
			if (inEvent.method === "getArticleContent") {
				if (inEvent.success && inEvent.content && inEvent.content.web) {
					this.contentReceived(inSender, inEvent);
				} else if (this.first) {
					this.$.articleContent.setContent("Need to download content...");
					this.downloadContent(); //don't set this directly.
					this.first = false; //prevent multiple downloads of one article.
				}
			} else if (inEvent.method === "storeArticleContent") {
				//do this in order to get modified article from DB that has image links directed to local storage
				this.articleOpId = ArticleContentHandler.getContent(this.articleModel);
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
				this.timeoutId = setTimeout(function () {
					this.$.scroller.$.strategy.verticalChanged();
					this.processChildren(this.$.articleContent.node);
					this.log("Scrolling to ", this.articleModel.get("scrollPos") || 1);
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
		var url = event.target.href;
		this.$.linkPopup.setUrl(url);
		this.$.linkPopup.showAtEvent(event);

		event.preventDefault();
	},
	closeToolbarPopup: function () {
		if (this && this.$ && this.$.moreToolbar && this.$.moreToolbar.$ && this.$.moreToolbar.$.menu) {
			this.$.moreToolbar.$.menu.hide();
		}
	},

	refreshTap: function () {
		this.$.articleContent.setContent("Re-Downloading content.");
		moboreader.Spritz.resetArticle(this.articleModel);
		this.api.getArticleContent(this.articleModel);
		this.closeToolbarPopup();
	},
	archiveTap: function () {
		if (moboreader.Prefs.getGoBackOnArchive()) {
			this.articleModel.showing = false;
			this.doBack();
		}
		this.articleModel.doArchive(this.api, this.collection);
		this.closeToolbarPopup();
	},
	favoriteTap: function () {
		this.articleModel.doFavorite(this.api, this.collection);
		this.closeToolbarPopup();
	},
	deleteTap: function () {
		this.doBack();
		this.articleModel.doDelete(this.api, this.collection);
		this.closeToolbarPopup();
	},
	copyTap: function () {
		enyo.webos.setClipboard(this.articleModel.get("url"));
		this.closeToolbarPopup();
	},

	spritzTap: function () {
		this.$.spritzDialog.prepareSpritz(this.articleModel);
		this.closeToolbarPopup();
	},
	currentWordChanged: function () {
		if (this.articleModel && this.articleModel.spritzOk && Math.abs(this.currentWord - this.lastScrollWord) > 20) {
			var ratio = this.currentWord / this.articleModel.spritzModel.getWordCount();
			this.$.scroller.scrollTo(0, this.$.scroller.getScrollBounds().maxTop * ratio);
			this.lastScrollWord = this.currentWord;
		}
	},
	scrollTo: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.$.scroller.scrollTo(0, this.$.scroller.scrollTop - inEvent.dy);
	},

	openUrl: function () {
		window.open(this.articleModel.get("url"));
	},

	spritzReady: function () {
		this.$.spritzBtn.addClass("onyx-affirmative");
	},
	resizeOurself: function () {
		setTimeout(this.resize.bind(this), 100);
	}
});
