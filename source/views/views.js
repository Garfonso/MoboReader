/*jslint sloppy: true, browser: true */
/*global ArticleContentHandler, enyo, webos, moboreader */

var LIST_ITEM_HEIGHT = 50;

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
		{from: "$.api.active", to: "pocketDL" },
		{from: "^.moboreader.Spritz.numDownloading", to: "spritzDL"},
		{from: "activity", to: "$.activitySpinner.showing"},
		{from: "articleCollection.length", to: "$.articleCount.content" },
		{from: "$.ArticleContentHandler.dbActivities", to: "dbActivities" }
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
							fixedChildSize: LIST_ITEM_HEIGHT,
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
									ontap: "refreshTap",
									onhold: "refreshHold"
								},
								{
									kind: "onyx.Button",
									content: "Add",
									ontap: "showAddDialog"
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
		{
			kind: "onyx.Popup",
			name: "refreshPopup",
			components: [
				{
					classes: "popup-buttons",
					kind: "onyx.Button",
					content: "Delete & refresh",
					ontap: "forceRefreshTap"
				},
				{
					classes: "popup-buttons",
					kind: "onyx.Button",
					content: "Full refresh",
					ontap: "refreshFullSyncTap"
				},
				{
					classes: "popup-buttons",
					kind: "onyx.Button",
					content: "Fast refresh",
					ontap: "refreshTap"
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
			onArticleOpReturned: "continueWipe",
			onunload: "cleanUpOnUnload",

			onNeedShowAuth: "showAuth",
			onAuthOk: "refreshTap",
			onHideAuth: "hideAuth"
		},
		{
			name: "keepServiceRunning",
			kind: "enyo.LunaService",
			service: "luna://info.mobo.moboreader.service",
			method: "keepRunning",
			onResponse: "gotPing",
			onError: "serviceError",
			subscribe: true,
			resubscribe: true
		}
	],
	create: function () {
		this.inherited(arguments);

		function fetchResult() {
			this.log("api collection fetch successful.");
			//do this after fetch to prevent empty list in UI.
			this.$.articleView.setCollection(this.articleCollection);
			this.$.articleList.set("collection", this.articleCollection);
			setTimeout(this.refreshTap.bind(this, null, null, false), 1000);

			if (window.PalmSystem) {
				window.PalmSystem.stageReady();
				if (window.PalmSystem.allowResizeOnPositiveSpaceChange) {
					window.PalmSystem.allowResizeOnPositiveSpaceChange(false); //deactivate keyboard resizing our app.
				}
				this.log("Launch Params: " + JSON.stringify(webos.launchParams()));
				if (webos.launchParams().url) {
					this.log("Adding article: " + webos.launchParams().url);
					this.$.api.addArticle(webos.launchParams().url, this.articleCollection);
				}
			}
		}

		this.articleCollection = new moboreader.ArticleCollection({url: "pocket-unread-list"});
		this.articleCollection.set("url", "pocket-unread-list");
		this.articleCollection.fetch({strategy: "merge", success: fetchResult.bind(this), fail: fetchResult.bind(this)});
		this.$.articleView.setApi(this.$.api);

		this.serviceError(); //take a shortcut here ;)
	},
	cleanUpOnUnload: function () {
		this.log("Cleaning up on unload.");
		this.articleCollection.storeWithChilds();
	},

	showAddDialog: function () {
		this.$.addDialog.doShow();
		this.closeToolbarPopup();
	},
	addArticle: function (inSender, inEvent) {
		/*jslint unparam:true*/
		if (!inEvent || !inEvent.url) {
			this.warn("No url supplied. Can't add article.");
		}
		this.$.api.addArticle(inEvent.url, this.articleCollection, inEvent.title);
		//this.resize();
	},

	refreshTap: function (inSender, inEvent, slowSync) {
		/*jslint unparam:true*/
		if (this.refreshHeld) {
			this.refreshHeld = false;
		} else {
			this.$.api.downloadArticles(this.articleCollection, slowSync);
			this.$.refreshPopup.hide();
		}
		this.closeToolbarPopup();
	},
	refreshFullSyncTap: function () {
		this.refreshTap(null, null, true);
		this.$.refreshPopup.hide();
	},
	refreshHold: function (inSender, inEvent) {
		this.refreshHeld = true;
		//show popup with more refresh options.
		this.$.refreshPopup.showAtEvent(inEvent);
	},
	forceRefreshTap: function () {
		this.articleCollection.whipe();
		this.dbOpId = ArticleContentHandler.wipe();
		this.$.refreshPopup.hide();
	},
	continueWipe: function (inSender, inEvent) {
		/*jslint unparam:true*/
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
		this.closeToolbarPopup();
	},
	logoutOfPocket: function () {
		this.loggingOut = true;
		this.forceRefreshTap();
	},

	articleSelected: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.lastArticle = this.$.articleList.selected();
		if (this.lastArticle) {
			this.$.articleView.setArticleModel(this.lastArticle);
			this.$.MainPanels.setIndex(1);
			this.$.articleList.deselectAll();
		}
	},
	handleBackGesture: function () {
		if (this.$.MainPanels.getIndex() === 2) {
			this.log("In auth dialog, prevent back!");
			return;
		}

		this.$.MainPanels.setIndex(0);
		this.$.settingsDialog.hide();

		//this only works, because I hacked enyo/source/ui/data/VerticalDelegate.js scrollToIndex to always scroll to top, i.e. replaced line 291 wiht list.$.scroller.scrollIntoView(c, true);
		if (this.lastArticle) {
			var scrollTo = this.articleCollection.indexOf(this.lastArticle),
				listHeight = this.$.articleList.getBounds().height,
				numArticlesOnScreen = listHeight / LIST_ITEM_HEIGHT;

			scrollTo -= Math.round((numArticlesOnScreen - 1) / 2); //list will scroll to top, allow some articles above it to show up, too.

			if (scrollTo >= this.articleCollection.length) {
				scrollTo = this.articleCollection.length - 1;
			} else if (scrollTo < 0) {
				scrollTo = 0;
			}
			this.$.articleList.scrollToIndex(scrollTo);
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
	hideAuth: function () {
		if (this.$.MainPanels.getIndex() === 2) {
			this.$.MainPanels.setIndex(this.lastPanelIndex || 0);
		}
	},
	closeToolbarPopup: function () {
		if (this && this.$ && this.$.moreToolbar && this.$.moreToolbar.$ && this.$.moreToolbar.$.menu) {
			this.$.moreToolbar.$.menu.hide();
		}
	},
	gotPing: function (inSender, inEvent) {
		//this.log("Got ping: ", inEvent.seq);
	},
	serviceError: function (inSender, inEvent) {
		if (inEvent) {
			this.error("Service Error: ", inEvent.message);
		}
		if (this.request) {
			this.request.cancel();
		}
		setTimeout(function () {
			this.request = this.$.keepServiceRunning.send({subscribe: true, resubscribe: true});
		}.bind(this), 1000);
	}
});
