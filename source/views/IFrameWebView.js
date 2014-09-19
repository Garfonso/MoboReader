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
/*
        {
            kind: "enyo.Scroller",
            touch: true,
            thumb: true,
            classes: "enyo-fill",
            components: [
*/
                {
                    name: "iframe",
                    tag: "iframe",
                    classes: "enyo-fill",
                    attributes: {sandbox: "allow-scripts allow-forms"},
                    showing: false
                },
                {
                    //used on webos phones (2.x). This is needed for proper scrolling.
                    name: "webViewContainer",
                    classes: "enyo-fill",
                    style: "width: 1000px; height: 1000px;",
                    showing: false
                },
                {
                    //used on legacy webos 3.x
                    name: "webView",
                    kind: "WebView",
                    classes: "enyo-fill",
                    onPageTitleChanged: "webviewLoaded",
                    showing: false,
                    components: [
                        {name: "target"}
                    ]
                }
/*            ]
        }*/
    ],
    create: function () {
        this.inherited(arguments);

        if (window.PalmSystem && PalmSystem.deviceInfo) {
            var devInfo = JSON.parse(PalmSystem.deviceInfo);
            if (devInfo.modelName === "Lune OS Device") {
                this.log("LuneOS device");
                this.useIFrame = true;
                this.$.iframe.addStyles("width: 1000px; height: 1000px;");
                this.$.iframe.show();
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
            }
        } else {
            this.log("No webOS device, use iFrame");
            this.$.iframe.show();
            this.useIFrame = true;
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
        }
    },
    pageLoaded: function () {
        var url;
        this.title = this.$.iframe.node.contentDocument.title;
        url = this.$.iframe.node.contentDocument.location.toString();
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
            this.$.iframe.setSrc(this.url);
        } else if (this.useWebView || this.useWebViewEnc) {
            this.webView.setUrl(this.url);
        } else {
            throw "Unknown mode...??";
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
