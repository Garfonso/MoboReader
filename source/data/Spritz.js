/*jslint sloppy: true, browser: true */
/*global enyo, $, SpritzSettings, moboreader, SpritzClient, SPRITZ */

enyo.singleton({
	name: "moboreader.Spritz",

	published: {
		wordCompleted: 0,
		totalWords: 0,
		running: false,
		numDownloading: 0,
		available: false,
		username: "Login"
	},
	bindings: [
		{ from: "^.moboreader.Prefs.useSpritz", to: "available" }
	],
	dlCounter: 0,
	initialized: false,
	basePath: "",

	availableChanged: function () {
		this.log("Need to activate Spritz: ", moboreader.Prefs.useSpritz);
		if (moboreader.Prefs.useSpritz) {
			if (window.$ === undefined && !this.loadingJQuery) {
				//load jquery
				this.loadScript("jquery-2.1.0.min.js");
				this.loadingJQuery = true;
			}
			if (window.SpritzClient === undefined && !this.loadingSpritz) {
				if (window.$) {
					//load spritz
					this.loadScript("spritz.1.2.2.min.js", "spritzjs");
					this.loadingSpritz = true;
				} else {
					this.log("Delaying spritz loading until jquery is ready.");
					setTimeout(this.availableChanged.bind(this), 100);
				}
			}
		}
	},

	login: function () {
		if (SpritzClient.isUserLoggedIn()) {
			SpritzClient.userLogout();
		} else {
			SpritzClient.userLogout(); //sometimes spritz does not recognize a user to be logged in.
			var url = "https://api.spritzinc.com/api-server/v1/oauth/authorize?" +
				//c=Spritz_JSSDK_1.2.2
				"c=" + encodeURIComponent(SPRITZ.client.VersionInfo.name + "_" + SPRITZ.client.VersionInfo.version) + "&" +
				//response_type=token
				"response_type=token&" +
				//client_id= ....
				"client_id=" + SpritzSettings.clientId + "&" +
				//redirect_uri=...
				"redirect_uri=" + encodeURIComponent(SpritzSettings.redirectUri);

			enyo.Signals.send("onNeedShowAuth", {
				serviceName: "Spritz",
				redirectUrl: this.redirectUri,
				callback: this.bindSafely("finishLogin"),
				cancelable: true
			});

			enyo.Signals.send("onAuthURL", {
				url: url
			});
		}
	},
	finishLogin: function (title) {
		var auth, start;
		start = title.indexOf("token: #");
		if (start >= 0) {
			auth = title.substr(start + "token: #".length);
			this.log("Spritz got token: " + auth);
			SpritzClient.setAuthResponse(auth, moboreader.Spritz.updateUsername.bind(moboreader.Spritz));
			return true;
		}

		this.log("Spritz not logged in from ", title, " start: ", start);
		return "invalid";
	},

	loadScript: function (name, id) {
		this.log("Loading ", name);
		var head = document.getElementsByTagName("head")[0],
			script = document.createElement("script");
		script.type = "text/javascript";
		script.charset = "utf-8";
		script.src = this.basePath + "assets/jslibraries/" + name;
		this.log("Script source: " + script.src);
		if (id) {
			script.id = id;
		}
		head.appendChild(script);
	},

	updateUsername: function () {
		this.log("Updating username to " + SpritzClient.getUserName());
		this.setUsername(SpritzClient.getUserName() || "Login");
	},

	init: function () {
		var node = $("#spritzer"),
			options = {
				defaultSpeed: 500,
				speedItems: [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,  950, 1000],
				redicleWidth: window.PalmSystem ? node.width() : node.width() - 30,

				// These must correspond to controlTitles below
				controlButtons: ["rewind", "back", "pauseplay", "forward"],

				header: {
					close: false,
					login: false
				},
				controlTitles: {
					pause: "Pause",
					play: "Play",
					rewind: "Back to beginning",
					back: "Previous sentence",
					forware: "Next sentence"
				},
				placeholder: {
					startText: "Tap to spritz",
					endText: "Tap to close spritz dialog."
				}
			};
		if (!window.width) {
			window.width = node.width() + 30; //somehow this is not set on TP.
		}

		SPRITZ.utils.debugLevel = 10000000; //make spritz talk to us :)
		if (this.initialized) {
			this.spritzController.detach();
			delete this.spritzController;
		}

		this.spritzController = new SPRITZ.spritzinc.SpritzerController(options);
		this.spritzController.attach(node);
		this.spritzController.setProgressReporter(this.bindSafely("receiveProgress"));
		SpritzClient.registerLoginCallback(this.bindSafely("updateUsername"));
		SpritzClient.logoutCallback = this.bindSafely("updateUsername");

		this.initialized = true;
		this.updateUsername();

		setInterval(function () {
			this.setRunning(this.isRunning());
		}.bind(this), 100);
	},

	resetArticle: function (articleModel) {
		articleModel.spritzOk = false;
		delete articleModel.spritzModel;
		delete articleModel.spritzModelPersist;
	},

	receiveProgress: function (completed, total) {
		this.setWordCompleted(completed);
		this.setTotalWords(total);
	},

	start: function (articleModel, restart) {
		var spritzModel;

		if (!this.initialized) {
			this.init();
		}

		if (articleModel.spritzOk && articleModel.spritzModel) {
			spritzModel = articleModel.spritzModel;
		} else if (articleModel.spritzModelPersist) {
			articleModel.spritzModel = this.restoreSpritzModel(articleModel.spritzModelPersist);
			articleModel.spritzOk = true;
			spritzModel = articleModel.spritzModel;
			spritzModel.reset();
		} else {
			this.log("Need to download spritz model from ", articleModel.attributes.url);
			if (articleModel.spritzDownloading >= 0) {
				return articleModel.spritzDownloading;
			}

			return this.downloadSpritzModel(articleModel);
		}

		if (restart) {
			spritzModel.reset();
		}
		this.spritzController.startSpritzing(spritzModel);
		this.pause();

		return -1;
	},
	stop: function () {
		this.spritzController.stopSpritzing();
	},

	pause: function () {
		this.spritzController.pauseSpritzing();
	},
	resume: function () {
		this.spritzController.resumeSpritzing();
	},

	setWpm: function (wpm) {
		if (!this.spritzController.setSpeed(wpm)) {
			this.spritzController.setSpeed(SPRITZ.constants.Constants.MAX_SPEED);
		}
		return this.spritzController.getSpeed();
	},

	isRunning: function () {
		return this.spritzController.spritzPanel.isRunning();
	},
	isComplete: function () {
		return this.spritzController.spritzPanel.isCompleted();
	},

	downloadSpritzModel: function (articleModel, webContent) {
		if (!webContent) {
			webContent = articleModel.webContent;
		}
		this.dlCounter += 1;
		this.setNumDownloading(this.numDownloading + 1);
		articleModel.spritzDownloading = this.dlCounter;

		if (!webContent) {
			SpritzClient.fetchContents(articleModel.get ? articleModel.get("url") : articleModel.url,
									   this.bindSafely("fetchSuccess", articleModel, this.dlCounter, webContent),
									   this.bindSafely("fetchError", articleModel, this.dlCounter, webContent));
		} else {
			var locale = webContent,
				start = locale.indexOf("lang=\"") + 6,
				end = locale.indexOf("\"", start),
				tmpNode = document.createElement("div"),
				text = "";

			if (start >= 0 && end >= 0 && end > start) {
				locale = locale.substring(start, end);
				this.log("Extracted locale: ", locale);
			} else {
				locale = "en";
				this.error("Could not extract locale.");
			}

			//now get rid of HTML:
			tmpNode.innerHTML = webContent;
			text = tmpNode.innerText;

			SpritzClient.spritzify(text, locale,
								   this.bindSafely("fetchSuccess", articleModel, this.dlCounter, webContent),
								   this.bindSafely("fetchError", articleModel, this.dlCounter, webContent));
		}

		return this.dlCounter;
	},
	fetchSuccess: function (articleModel, dlId, webContent, result) {
		this.log("Got spritzData: ", result);
		if (!articleModel.attributes || !articleModel.previous) {
			this.log("Article was already destroyed.");
		} else {
			articleModel.spritzModel = result;
			articleModel.spritzOk = true;
		}
		delete articleModel.spritzDownloading;

		var spritzPersist = this.storeSpritzModel(result);

		enyo.Signals.send("onArticleDownloaded", {
			id: !!articleModel.get ? articleModel.get(articleModel.primaryKey) : articleModel.item_id,
			content: {
				web: webContent,
				spritz: spritzPersist
			},
			model: articleModel
		});

		enyo.Signals.send("onSpritzDL", {id: dlId, success: true});
		this.setNumDownloading(this.numDownloading - 1);
	},
	fetchError: function (articleModel, dlId) {
		this.log("Error fetching: ", (articleModel.get ? articleModel.get("url") : articleModel.url));
		enyo.Signals.send("onSpritzDL", {id: dlId, success: false});
		this.setNumDownloading(this.numDownloading - 1);
		delete articleModel.spritzDownloading;

		enyo.Signals.send("onArticleDownloaded", {
			id: !!articleModel.get ? articleModel.get(articleModel.primaryKey) : articleModel.item_id,
			content: {},
			model: articleModel
		});
	},

	storeSpritzModel: function (spritzModel) {
		var obj = {
			contentVersion: spritzModel.getContentVersionId(),
			words: spritzModel.getWords(),
			duration: spritzModel.getDuration(),
			locale: spritzModel.getLocale(),
			version: spritzModel.getVersion(),
			wordCount: spritzModel.getWordCount()
		};

		this.log("Created object: ", obj, " from ", spritzModel);

		return obj;
	},
	restoreSpritzModel: function (obj) {
		var words = [];
		obj.words.forEach(function (word, index) {
			words[index] = new SPRITZ.model.TimedWord(word.word, word.orp, word.multiplier, word.position, word.flags);
		});

		return new SPRITZ.model.SpritzText(obj.contentVersion, words, obj.duration, obj.locale, obj.version, obj.wordCount);
	}
});
