/*jslint sloppy: true, browser: true */
/*global PalmSystem, enyo */

enyo.kind({
	name: "IFrameWebView",
	published: {
		/** url for page, updated as user navigates, relative URLs not allowed */
		url: ""
	},
	events: {
		onPageTitleChanged: "",
		onCancelAuth: ""
	},
	useWebView: false,
	useIFrame: false,
	useWebViewEnc: false,
	useInAppBrowser: false,
	components: [

		{
			kind: "enyo.Scroller",
			touch: true,
			thumb: true,
			classes: "enyo-fill",
			horizontal: "scroll",
			vertical: "scroll",
			components: [
				{
					name: "iframe",
					tag: "iframe",
					classes: "enyo-fill",
					touch: true,
					attributes: {
						//pocket:
						//sandbox: "allow-popups allow-top-navigation allow-same-origin allow-scripts allow-forms", ok!
						//sandbox: "allow-top-navigation allow-same-origin allow-scripts allow-forms", ok!
						//sandbox: "allow-same-origin allow-scripts allow-forms", ok
						//sandbox: "allow-same-origin allow-scripts", ok
						sandbox: "allow-same-origin allow-forms", // => would be fine, but login_success fails.
						//sandbox: "allow-popups allow-top-navigation allow-scripts", NOT OK
						//sandbox: "allow-same-origin", //will NOT work! ;)
						//scrolling: "no",
						//seamless: "seamless",
						onload: enyo.bubbler
					},
					//style: "z-index: -1;",
					showing: false,
					onload: "pageLoaded"
				},
				{
					//used on webos phones (2.x). This is needed for proper scrolling.
					name: "webViewContainer",
					classes: "enyo-fill",
					style: "width: 1000px; height: 1000px;",
					showing: false,
					onPageTitleChanged: "webviewLoaded",
					components: [
						{name: "target"}
					]
				},
				{
					//used on legacy webos 3.x
					name: "webView",
					kind: "WebView",
					classes: "enyo-fill",
					onPageTitleChanged: "webviewLoaded",
					showing: false
				}
			]
		}
	],
	create: function () {
		this.inherited(arguments);

		if (window.PalmSystem && PalmSystem.deviceInfo) {
			var devInfo = JSON.parse(PalmSystem.deviceInfo);
			if (devInfo.modelName === "Lune OS Device") {
				this.log("LuneOS device");
				this.useInAppBrowser = true;
			} else if (devInfo.platformVersionMajor === 3) {
				//use old webview
				this.log("webOS 3");
				this.useWebView = true;
				this.$.webView.show();
				this.webView = this.$.webView;
			} else {
				this.useWebViewEnc = true;
				this.$.webViewContainer.show();
				this.webView = this.$.webViewContainer.createComponent({
					name: "webViewInner",
					kind: "WebView",
					classes: "enyo-fill",
					onPageTitleChanged: "webviewLoaded"
				});
				this.webView.renderInto(this.$.target);
				this.webView.resize();
				this.webView.focus();
				this.webView.clearCookies();
			}
		} else {
			this.log("No webOS device, use iFrame");
			this.$.iframe.attributes.sandbox = "allow-scripts allow-forms";
			this.$.iframe.show();
			this.useIFrame = true;
		}
	},

	pageLoaded: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.log("Page loaded: ", inEvent);
		var url;
		if (this.$.iframe.hasNode() && this.$.iframe.node.contentDocument) {
	/*
			this.log("Adding enyo event handler to content document");
			this.$.iframe.node.contentDocument.onload = enyo.blubbler;
	*/

			this.title = this.$.iframe.node.contentDocument.title;
			if (typeof this.title === "object") {
				this.title = this.title.toString();
			}
			url = this.$.iframe.node.contentDocument.location.toString();
			this.log("URL: " + url + " with title " + this.title, " type of title: ", typeof this.title);
			if (this.title !== this.oldTitle) {
				this.doPageTitleChanged({
					title: this.title,
					url: url
				});
				this.oldTitle = this.title;
			}
		} else {
			this.log("No contentDocument, yet.");
			this.log("Adding enyo event handler to content window");
			this.$.iframe.node.contentWindow.onload = enyo.blubbler;
		}
	},
	webviewLoaded: function (inSender, inEvent) {
		/*jslint unparam:true*/
		this.log("On webviewLoaded, title: ", inEvent.inTitle);
		this.doPageTitleChanged({
			title: inEvent.inTitle,
			url: inEvent.inUrl
		});
	},

	urlChanged: function () {
		this.oldTitle = null;
		if (this.useIFrame) {
			this.$.iframe.hasNode().src = this.url;
		} else if (this.useWebView || this.useWebViewEnc) {
			this.webView.setUrl(this.url);
		} else if (this.useInAppBrowser) {
			navigator.InAppBrowser.close();
			navigator.InAppBrowser.open(this.url);
			navigator.InAppBrowser.ontitlechanged = function (title) {
				this.log("Title changed: ", title);
				this.doPageTitleChanged({
					title: title,
					url: navigator.InAppBrowser.url
				});
			}.bind(this);
			navigator.InAppBrowser.ondoneclicked = function () {
				this.doCancelAuth({});
			}.bind(this);
		} else {
			throw "Unknown mode...??";
		}
	},
	hideAll: function () {
		this.hide();
		if (this.useInAppBrowser) {
			navigator.InAppBrowser.close();
		}
	},

	pasteIntoWebview: function () {
		if (this.useIFrame) {
			this.$.iframe.focus();
		} else if (this.useWebView || this.useWebViewEnc) {
			this.webView.focus();
			this.webView.callBrowserAdapter("paste");
		}

		if (window.PalmSystem) {
			window.PalmSystem.paste();
		} else {
			document.execCommand("paste");
		}
	}
});
