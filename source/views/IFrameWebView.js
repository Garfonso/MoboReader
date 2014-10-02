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
    useWebViewEnc: false,
    components: [

        {
            kind: "enyo.Scroller",
            touch: true,
            thumb: true,
            onScroll: "propagateScroll",
            classes: "enyo-fill",
            components: [
                {
                    name: "iframe",
                    tag: "iframe",
                    classes: "enyo-fill enyo-fit",
                    attributes: {
                        //pocket:
                        //sandbox: "allow-popups allow-top-navigation allow-same-origin allow-scripts allow-forms", ok!
                        //sandbox: "allow-top-navigation allow-same-origin allow-scripts allow-forms", ok!
                        //sandbox: "allow-same-origin allow-scripts allow-forms", ok
                        //sandbox: "allow-same-origin allow-scripts", ok
                        sandbox: "allow-same-origin allow-forms", // => would be fine, but login_success fails.
                        //sandbox: "allow-popups allow-top-navigation allow-scripts", NOT OK
                        //sandbox: "allow-same-origin", //will NOT work! ;)
                        scrolling: "no",
                        seamless: "seamless"
                    },
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
                //this.$.iframe.addStyles("width: 1000px; height: 1000px;");
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
                this.$.iframe.node.onresize = this.bindSafely("contentResized");
            } else {
                this.log("Need to retry binding.");
                setTimeout(this.bindSafely("addLoadListener"), 10);
            }
        }
    },
    contentResized: function (inEvent) {
        this.log("Content  resized: ", inEvent);
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

        if (this.useIFrame) {
            this.log("Adding event listeners.");
            this.$.iframe.node.contentDocument.onanmiationEnd = enyo.dispatch;
            this.$.iframe.node.contentDocument.onchange = enyo.dispatch;
            this.$.iframe.node.contentDocument.onclick = enyo.dispatch;
            this.$.iframe.node.contentDocument.ononcopy = enyo.dispatch;
            this.$.iframe.node.contentDocument.oncut = enyo.dispatch;
            this.$.iframe.node.contentDocument.ondbclick = enyo.dispatch;
            this.$.iframe.node.contentDocument.ondrag = enyo.dispatch;
            this.$.iframe.node.contentDocument.ondragstart = enyo.dispatch;
            this.$.iframe.node.contentDocument.ondragend = enyo.dispatch;
            this.$.iframe.node.contentDocument.ongesturechange = enyo.dispatch;
            this.$.iframe.node.contentDocument.ongestureend = enyo.dispatch;
            this.$.iframe.node.contentDocument.ongesturestart = enyo.dispatch;
            this.$.iframe.node.contentDocument.oinput = enyo.dispatch;
            this.$.iframe.node.contentDocument.onkeydown = enyo.dispatch;
            this.$.iframe.node.contentDocument.okeypress = enyo.dispatch;
            this.$.iframe.node.contentDocument.onkeyup = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmousedown = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmousemove = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmouseout = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmouseover = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmouseup = enyo.dispatch;
            this.$.iframe.node.contentDocument.onmousewheel = enyo.dispatch;
            this.$.iframe.node.contentDocument.onpaste = enyo.dispatch;
            this.$.iframe.node.contentDocument.onscroll = enyo.dispatch;
            this.$.iframe.node.contentDocument.ontouchend = enyo.dispatch;
            this.$.iframe.node.contentDocument.ontouchmove = enyo.dispatch;
            this.$.iframe.node.contentDocument.ontouchstart = enyo.dispatch;
            this.$.iframe.node.contentDocument.ontransitioned = enyo.dispatch;
            this.$.iframe.node.contentDocument.onwebkitAnimationEnd = enyo.dispatch;
            this.$.iframe.node.contentDocument.onwebkitTransitionEnd = enyo.dispatch;

            setTimeout(function () {
                var bounds = {
                    heigth: this.$.iframe.node.contentDocument.body.clientHeight,
                    width: this.$.iframe.node.contentDocument.body.clientWidth
                };

                this.log("Setting bounds ", bounds);

                this.$.iframe.setBounds(bounds);
            }.bind(this), 100);
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
