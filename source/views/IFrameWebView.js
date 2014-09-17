/*global PalmSystem */

enyo.kind({
    name: "IFrameWebView",
    published: {
        /** url for page, updated as user navigates, relative URLs not allowed */
        url: "",
        /** boolean, allow page to run javascript */
        enableJavascript: true
    },
    events: {
        onPageTitleChanged: ""
    },
    useWebView: false,
    useIFrame: false,
    components: [
        {
            name: "iframe",
            tag: "iframe",
            classes: "enyo-fill",
            attributes: {sandbox: "allow-scripts allow-forms"},
            showing: false
        },
        {
            kind: "enyo.Scroller",
            touch: true,
            thumb: true,
            classes: "enyo-fill",
            components: [
                {
                    name: "webView",
                    kind: "WebView",
                    //classes: "enyo-fill",
                    style: "width: 1000px; height: 1000px;",
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
                this.useIFrame = true;
                this.$.iframe.show();
            } else if (devInfo.platformVersionMajor <= 3) {
                //use old webview
                this.log("webOS 3");
                this.useWebView = true;
                this.$.webView.show();
            } else {
                this.log("webOS " + devInfo.platformVersionMajor + " use window.open");
            }
        } else {
            this.log("No webOS device, use iFrame");
            this.$.iframe.show();
            this.useIFrame = true;
        }
    },

    periodicCheck: function () {
        if (!this.useIFrame && !this.useWebView) {
            setTimeout(this.bindSafely("periodicCheck"), 500);
            this.pageLoaded();
        }
    },
    addLoadListener: function () {
        if (this.useIFrame) {
            this.$.iframe.hasNode();
            if (this.$.iframe.node) {
                this.log("Added binding.");
                this.$.iframe.node.onload = this.bindSafely("pageLoaded");
            } else {
                this.log("Need to retry binding.");
                setTimeout(this.bindSafely("addLoadListener"), 10);
            }
        } else if (!this.useWebView) {
            this.periodicCheck();
        }
    },
    pageLoaded: function () {
        var url;
        if (this.useIFrame) {
            this.log("content Document: " + this.$.iframe.node.contentDocument);
            this.title = this.$.iframe.node.contentDocument.title;
            url = this.$.iframe.node.contentDocument.location.toString();
        } else if (!this.useWebView) {
            if (this.win) {
                this.log("Getting url & title from window");
                url = this.win.document.location;
                this.title = this.win.document.title;
            } else {
                this.log("window not yet opened?");
                return;
            }
        }
        this.log("URL: " + url + " with title " + this.title);
        if (this.title !== this.oldTitle) {
            this.doPageTitleChanged({
                title: this.title,
                url: url
            });
            this.oldTitle = this.title;
        }
    },
    webviewLoaded: function (inSender, inEvent) {
        this.doPageTitleChanged({
            title: inEvent.inTitle,
            url: inEvent.inUrl
        });
    },

    urlChanged: function () {
        this.oldTitle = null;
        this.addLoadListener();
        if (this.useIFrame) {
            this.log("Setting url on iFrame");
            this.$.iframe.setSrc(this.url);
        } else if (this.useWebView) {
            this.log("Setting url on webView");
            this.$.webView.setUrl(this.url);
            this.$.webView.resize();
        } else {
            this.log("Opening new window.");
            this.win = window.open(this.url);
            this.win.onload = this.bindSafely("pageLoaded");
        }
    },
    enableJavascriptChanged: function () {
        var sandbox = this.$.iframe.getAttribute("sandbox"),
            seperator = " ",
            parts, partsNew = [];
        if (!sandbox) {
            sandbox = "";
            seperator = "";
        }

        if (this.enableJavascript) {
            if (sandbox.indexOf("allow-scripts") < 0) {
                this.$.iframe.setAttribute("sandbox", sandbox + seperator + "allow-scripts");
            } else {
                this.log("JavaScript was already enabled?");
            }
        } else {
            if (sandbox.indexOf("allow-scripts") >= 0) {
                parts = sandbox.split(seperator);
                parts.forEach(function (part) {
                    if (part !== "allow-scripts") {
                        partsNew.push(part);
                    }
                });
                sandbox = partsNew.join(" ");
                this.$.iframe.setAttribute("sandbox", sandbox);
            } else {
                this.log("JavaScript was already disabled?");
            }
        }
    }
});
