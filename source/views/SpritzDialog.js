/*jslint sloppy: true, browser: true, devel: true*/
/*global enyo, webos, moboreader*/

enyo.kind({
	name: "SpritzDialog",
	kind: "onyx.Popup",
	scrim: false,
	modal: false,
	autoDismiss: false,
	floating: true,
	centered: true,
	showTransitions: true,
	style: "background-color: transparent; height: 100%; width: 100%; border: 0px; border-radius: 0px; margin: 0; position: fixed; top: 0; bottom: 0; left: 0; right: 0; padding: 0px;",

	events: {
		onScrollTo: "",
		onSpritzReady: "",
		onSpritzDownload: "",
		onSpritzTranslutient: ""
	},
	published: {
		running: "",
		preventBack: "",
		currentWord: "",
		totalWords: ""
	},
	bindings: [
		{from: "^.moboreader.Spritz.running", to: "$.scrim.showing"},
		{from: "^.moboreader.Spritz.running", to: "running"},
		{from: "^.moboreader.Spritz.username", to: "$.loginButton.content"},
		{from: "$.downloadingSpritzData.showing", to: "preventBack"},
		{from: "^.moboreader.Spritz.running", to: "$.exitButton.showing", transform: function (val) { return !val; } },
		{from: "^.moboreader.Spritz.running", to: "$.fasterText.showing", transform: function (val) { return !val; } },
		{from: "^.moboreader.Spritz.running", to: "$.slowerText.showing", transform: function (val) { return !val; } },
		{from: "^.moboreader.Spritz.wordCompleted", to: "currentWord" },
		{from: "^.moboreader.Spritz.totalWords", to: "totalWords" }
	],
	wpm: 300,
	minWpm: 300,
	maxWpm: 800,
	lastAnimateWord: 0,
	wpmPrefix: "WPM: ",

	handlers: {
		onresize: "resizeHandler"
	},
	components: [
		{
			name: "scrim",
			style: "z-index: -1; background-color: darkgrey; width: 100%; padding: 0px; position: absolute; top: 0; bottom: 0; left: 0; right: 0;",
			ontap: "onTap"
			//ondragstart: "dragStart",
			//ondrag: "drag",
			//ondragfinish: "dragEnd"
		},
		{
			name: "transpScrim",
			classes: "spritz-transparent-scrim",
			ontap: "onTap"
			//ondragstart: "dragStart",
			//ondrag: "drag",
			//ondragfinish: "dragEnd"
		},
		{
			name: "downloadingSpritzData",
			style: "background-color: #4c4c4c; text-align: center; font-size: 18px; padding: 30px 0px; position: absolute; top: 30%; width: 100%;",
			components: [
				{content: "Downloading spritz data..."},
				{
					kind: "onyx.Button",
					name: "retryBtn",
					showing: false,
					style: "margin: 20px auto 0px auto;",
					content: "Retry",
					ontap: "startDL"
				}
			]
		},
		{
			id: "spritzer",
			classes: "spritz-container",
			attributes: {"data-role": "spritzer"},
			name: "spritzer"
		},
		{
			name: "exitButton",
			classes: "spritz-dialog-exit",
			kind: "onyx.Button",
			ontap: "stopSpritz",
			content: "X"
		},
		{
			name: "slowerText",
			content: 300 + " wpm",
			classes: "spritz-dialog-slower-text",
			ontap: "onTap"
		},
		{
			name: "fasterText",
			content: 800 + " wpm",
			classes: "spritz-dialog-faster-text",
			ontap: "onTap"
		},
		{
			name: "spritzControl",
			classes: "spritz-container",
			components: [
				{
					name: "loginButton",
					kind: "onyx.Button",
					classes: "spritz-login-button",
					content: "Login",
					showing: true,
					ontap: "startLogin"
				},
				{
					name: "wpmDisplay",
					classes: "spritz-wpm-text",
					content: "Words per minute: ",
					showing: true,
					allowHtml: true,
					ontap: "onTap"
				},
				{
					kind: "onyx.ProgressBar",
					name: "spritzTextProgress",
					progress: 0,
					ontap: "onTap",
					showStripes: false,
					animateStripes: false,
					classes: "spritz-text-progressbar"
				}
			]
		},
		{
			kind: "Signals",
			onSpritzDL: "downloadingDone"
		}
	],
	prepareSpritz: function (articleModel) {
		this.show();

		if (articleModel !== this.articleModel || moboreader.Spritz.username !== this.lastUsername) {
			this.articleModel = articleModel;
			this.startDL();
			this.lastUsername = moboreader.Spritz.username;
			this.lastAnimateWord = 0;
			this.hasNode();
		} else {
			if (moboreader.Spritz.isComplete()) {
				moboreader.Spritz.seek(0); //rewind if compelted.
			}
		}
	},
	startDL: function () {
		this.$.spritzer.show(); //this is important to not destroy canvas.
		this.dlId = moboreader.Spritz.start(this.articleModel);
		this.$.retryBtn.hide();

		if (this.dlId < 0) {
			this.$.downloadingSpritzData.hide();
			this.$.spritzer.show();
			this.$.spritzControl.show();
			this.dlId = moboreader.Spritz.start(this.articleModel);
			this.setWPM(this.wpm);
			this.doSpritzReady();
		} else {
			this.$.downloadingSpritzData.show();
			this.$.spritzer.hide();
			this.$.spritzControl.hide();
			this.doSpritzDownload();
		}
	},
	downloadingDone: function (inSender, inEvent) {
		if (!this.articleModel) {
			return;
		}

		/*jslint unparam:true*/
		if (inEvent.id === this.dlId || (inEvent.success && inEvent.model.get(this.articleModel.primaryKey) === this.articleModel.get(this.articleModel.primaryKey))) {
			if (inEvent.success) {
				this.$.downloadingSpritzData.hide();
				this.$.spritzer.show();
				this.$.spritzControl.show();
				this.setWPM(this.wpm);
				this.log("==========> Updating spritz model.");
				this.dlId = moboreader.Spritz.start(this.articleModel);
				this.doSpritzReady();
			} else {
				this.$.retryBtn.show();
			}
		}
	},

	stopSpritz: function () {
		moboreader.Spritz.pause();
		this.hide();
		this.doSpritzTranslutient({});
	},
	onTap: function (inSender, inEvent) {
		/*jslint unparam:true*/
		if (this.dragging) {
			this.log("Dragging, ignore tap.");
			return;
		}

		if (moboreader.Spritz.isComplete() || !this.articleModel.spritzOk) {
			this.hide();
			this.doSpritzTranslutient({});

			return;
		}

		if (moboreader.Spritz.isRunning()) {
			moboreader.Spritz.pause();
		} else {
			if (inEvent.clientY > this.node.clientHeight - 58) {
				this.doSpritzTranslutient({});
				this.hide();
				return;
			}
			this.calcWPM(inEvent.clientX, this.node.clientWidth);
			moboreader.Spritz.resume();
		}
	},
	calcWPM: function (clientX, width) {
		var ratio = clientX / width;
		this.wpm = (this.maxWpm - this.minWpm) * ratio + this.minWpm;

		this.setWPM(this.wpm);
	},
	setWPM: function (wpm) {
		this.wpm = wpm;
		var realWpm = moboreader.Spritz.setWpm(this.wpm);
		this.showWPM(Math.floor(this.wpm), realWpm);
	},
	showWPM: function (wpm, realWpm) {
		if (wpm !== realWpm) {
			this.$.wpmDisplay.setContent(this.wpmPrefix + realWpm + " <div style=\"font-size:small; display:block;\">(Login to go faster)</div>");
		} else {
			this.$.wpmDisplay.setContent(this.wpmPrefix + realWpm);
		}
	},
	currentWordChanged: function () {
		if (Math.abs(this.currentWord - this.lastAnimateWord) > 5) {
			this.$.spritzTextProgress.animateProgressTo(100 * (this.currentWord / this.totalWords));
			this.lastAnimateWord = this.currentWord;
		}
	},
	runningChanged: function () {
		if (webos.setWindowProperties) {
			webos.setWindowProperties({ blockScreenTimeout: this.running});
		}
	},

	drag: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.log("Dragging: ", inEvent);

		this.dragging = true;
		this.doScrollTo({dy: inEvent.dy});
		this.calcWPM(inEvent.clientX);
	},
	dragStart: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.log("Drag Start: ", inEvent);
		this.dragStart = {x: inEvent.clientX, y: inEvent.clientY};
		this.dragging = true;
	},
	dragEnd: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.log("Drag end: ", inEvent);

		this.doScrollTo({dy: inEvent.dy});
		this.calcWPM(inEvent.clientX);
		setTimeout(function () {
			this.dragging = false;
		}.bind(this), 500);
	},
	resizeHandler: function () {
		this.inherited(arguments);
		this.hasNode();
		this.wpmPrefix = "Words per minute: ";
		console.log("ClientWidth: " + this.node.clientWidth);
		if (this.node.clientWidth < 420) {
			this.wpmPrefix = "WPM: ";
		}
		this.setWPM(this.wpm);
	},

	startLogin: function () {
		moboreader.Spritz.pause();
		this.hide();
		moboreader.Spritz.login();
	}
});
