/*jslint sloppy: true, browser: true, devel: true */
/*global enyo, $, SpritzSettings, moboreader, SpritzClient, SPRITZ, ArticleContentHandler */

enyo.singleton({
	name: "moboreader.Spritz",

	published: {
		wordCompleted: 0,
		totalWords: 0,
		running: false,
		numDownloading: 0,
		available: false,
		requested: false,
		username: "Login"
	},
	bindings: [
		{ from: "^.moboreader.Prefs.useSpritz", to: "requested" }
	],
	dlCounter: 0,
	initialized: false,
	spritzPath: ArticleContentHandler.isWebos ? "file:///media/internal/.moboreader/assets/jslibraries/spritz.1.2.2.min.js" : "http://sdk.spritzinc.com/js/1.2.2/js/spritz.min.js",
	jqueryPath: ArticleContentHandler.isWebos ? "file:///media/internal/.moboreader/assets/jslibraries/jquery-2.1.1.min.js" : "http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js",

	create: function () {
		this.inherited(arguments);

		//load webos specific sprite CSS:
		if (ArticleContentHandler.isWebos && !enyo.webos.isLuneOS()) {
			this.loadCSS("webos-spritz-sprite", "assets/sprite.css");
		}

		//load spritz-container CSS:
		if (enyo.webos.isPhone()) {
			this.loadCSS("webos-spritz-container-css", "assets/spritz-container-webos-phone.css");
		} else if (enyo.webos.isTablet()) {
			this.loadCSS("webos-spritz-container-css", "assets/spritz-container-tp.css");
		} else {
			this.loadCSS("webos-spritz-container-css", "assets/spritz-container-modern.css");
		}
	},

	loadCSS: function (id, src) {
		if (!document.getElementById(id)) {
			var head = document.getElementsByTagName("head")[0],
				link = document.createElement("link");
			link.id = id;
			link.rel = "stylesheet";
			link.type = "text/css";
			link.href = src;
			link.media = "all";
			head.appendChild(link);
		}
	},

	requestedChanged: function () {
		if (moboreader.Prefs.useSpritz) {
			this.log("Need to activate Spritz: ", moboreader.Prefs.useSpritz);
			if (ArticleContentHandler.isWebos) {
				this.req = new enyo.ServiceRequest({
					service: "info.mobo.moboreader.service",
					method: "downloadSpritz"
				});
				this.req.response(this.loadScripts.bind(this));
				this.req.error(this.loadScripts.bind(this));

				this.req.go({});
			} else {
				setTimeout(this.loadScripts.bind(this), 500);
			}
		}
	},

	loadScripts: function () {
		if (this.loadingJQuery) {
			this.log("Already loading jQuery, wait for that to finish.");
			return;
		}
		if (window.$ === undefined) {
			//load jquery
			this.log("Trigger loading jQuery");
			this.loadScript({filename: this.jqueryPath, callback: this.jqueryLoaded.bind(this)});
			this.loadingJQuery = true;
			return;
		}

		if (this.loadingSpritz) {
			this.log("Already loading spritz. Wait for that to finish.");
			return;
		}

		if (window.SpritzClient === undefined) {
			this.log("Trigger loading spritz script.");
			this.loadScript({filename: this.spritzPath, id: "spritzjs", callback: this.spritzLoaded.bind(this)});
			this.loadingSpritz = true;
			return;
		}

		this.warn("Uhm?? Should never reach here.");
	},
	jqueryLoaded: function (result) {
		this.loadingJQuery = false;
		if (result) {
			this.log("jQuery load successful.");
			this.loadScript({filename: this.spritzPath, id: "spritzjs", callback: this.spritzLoaded.bind(this)});
			this.loadingSpritz = true;
		} else {
			this.error("Could not load jQuery, spritz will fail also.");
			moboreader.Prefs.setUseSpritz(false);
			this.setRequested(false);
		}
	},
	spritzLoaded: function (result) {
		this.loadingSpritz = false;
		if (result) {
			this.log("Spritz loaded.");
			this.setAvailable(true);
		} else {
			this.error("Could not load Spritz.");
			moboreader.Prefs.setUseSpritz(false);
			this.setRequested(false);
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
			SpritzClient.setAuthResponse(auth, function () {
				if (this.initialized) {
					this.spritzController.detach();
					delete this.spritzController;
				}
				this.initialized = false;
				this.updateUsername();
			}.bind(moboreader.Spritz)); //can set error callback as 3rd param.
			return true;
		}

		this.log("Spritz not logged in from ", title, " start: ", start);
		return "invalid";
	},

	/*
	 * params = { filename: "", id: "", callback: function() }
	 */
	loadScript: function (params) {
		var head = document.getElementsByTagName("head")[0],
			script = document.createElement("script");
		script.type = "text/javascript";
		script.charset = "utf-8";
		script.src = params.filename;
		this.log("Loading ", params.filename, " from ", script.src);
		if (params.id) {
			script.id = params.id;
		}
		script.onload = function () { if (params.callback) { params.callback(true); } };
		script.onerror = function () { console.log("Script " + params.filename + " failed."); head.removeChild(script); if (params.callback) { params.callback(false); } };
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
		this.spritzController.showSpritzer();
		this.pause();

		//update progress
		this.setWordCompleted(spritzModel.getCurrentIndex());
		this.setTotalWords(spritzModel.getWordCount());

		return -1;
	},
	stop: function () {
		if (this.spritzController) {
			this.spritzController.stopSpritzing();
		}
	},
	seek: function (val) {
		return this.spritzController.seek(val);
	},

	pause: function () {
		if (this.spritzController) {
			this.spritzController.pauseSpritzing();
		}
	},
	resume: function () {
		if (this.spritzController) {
			this.spritzController.resumeSpritzing();
		}
	},

	setWpm: function (wpm) {
		if (this.spritzController) {
			if (!this.spritzController.setSpeed(wpm)) {
				this.spritzController.setSpeed(SPRITZ.constants.Constants.MAX_SPEED);
			}
			return this.spritzController.getSpeed();
		}
		return 0;
	},

	isRunning: function () {
		return this.spritzController ? this.spritzController.spritzPanel.isRunning() : false;
	},
	isComplete: function () {
		return this.spritzController ? this.spritzController.spritzPanel.isCompleted() : false;
	},

	downloadSpritzModel: function (articleModel, content) {
		var articleHtml, locale, start, end, tmpNode, text;
		if (!content) {
			content = { web: articleModel.webContent };
		}
		articleHtml = content.web;
		this.dlCounter += 1;
		this.setNumDownloading(this.numDownloading + 1);
		articleModel.spritzDownloading = this.dlCounter;

		if (!articleHtml) {
			SpritzClient.fetchContents(articleModel.get ? articleModel.get("url") : articleModel.url,
									   this.bindSafely("fetchSuccess", articleModel, this.dlCounter, content),
									   this.bindSafely("fetchError", articleModel, this.dlCounter, content));
		} else {
			locale = articleHtml;
			start = locale.indexOf("lang=\"") + 6;
			end = locale.indexOf("\"", start);
			tmpNode = document.createElement("div");
			text = "";

			if (start >= 0 && end >= 0 && end > start) {
				locale = locale.substring(start, end);
				this.log("Extracted locale: ", locale);
			} else {
				locale = "en";
				this.error("Could not extract locale.");
			}

			//now get rid of HTML:
			tmpNode.innerHTML = articleHtml;
			text = tmpNode.innerText;

			SpritzClient.spritzify(text, locale,
								   this.bindSafely("fetchSuccess", articleModel, this.dlCounter, content),
								   this.bindSafely("fetchError", articleModel, this.dlCounter, content));
		}

		return this.dlCounter;
	},
	fetchSuccess: function (articleModel, dlId, content, result) {
		this.log("Got spritzData: ", result);
		if (!articleModel.attributes || !articleModel.previous) {
			this.log("Article was already destroyed.");
		} else {
			articleModel.spritzModel = result;
			articleModel.spritzOk = true;
		}
		delete articleModel.spritzDownloading;

		var spritzPersist = this.storeSpritzModel(result);
		content.spritz = spritzPersist;

		enyo.Signals.send("onArticleDownloaded", {
			id: !!articleModel.get ? articleModel.get(articleModel.primaryKey) : articleModel.item_id,
			content: content,
			model: articleModel
		});

		enyo.Signals.send("onSpritzDL", {id: dlId, success: true});
		this.setNumDownloading(this.numDownloading - 1);
	},
	fetchError: function (articleModel, dlId, content) {
		this.log("Error fetching: ", (articleModel.get ? articleModel.get("url") : articleModel.url));
		enyo.Signals.send("onSpritzDL", {id: dlId, success: false});
		this.setNumDownloading(this.numDownloading - 1);
		delete articleModel.spritzDownloading;

		enyo.Signals.send("onArticleDownloaded", {
			id: !!articleModel.get ? articleModel.get(articleModel.primaryKey) : articleModel.item_id,
			content: content,
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
