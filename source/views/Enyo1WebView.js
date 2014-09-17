enyo.kind({
    name: "WebView",
    published: {
        /** page identifier, used to open new webviews for new window requests */
        identifier: "", //UNSUPPORTED
        /** url for page, updated as user navigates, relative URLs not allowed */
        url: "",
        /** smallest font size shown on the page, used to stop text from becoming unreadable */
        minFontSize: 16, //UNSUPPORTED
        /** boolean, allow page to run javascript */
        enableJavascript: true,
        /** boolean, allow page to request new windows to be opened */
        blockPopups: true, //UNSUPPORTED??
        /** boolean, allow webview to accept cookies from server */
        acceptCookies: true, //UNSUPPORTED??
        /** the height of the header to scroll with the webview **/
        headerHeight: 0, //UNSUPPORTED
        /** array of URL redirections specified as {regex: string, cookie: string, enable: boolean}. */
        redirects: [], //UNSUPPORTED
        /** the network interface */
        networkInterface: "", //UNSUPPORTED
        /** array of DNS servers */
        dnsServers: [], //UNSUPPORTED
        /** boolean, if set, page ignores viewport-related meta tags */
        ignoreMetaTags: false, //UNSUPPORTED
        /** boolean, if set (default) webkit will cache the plugin when the node is hidden. if your app explicitly destroys the plugin outside the app lifecycle, you must set this to false */
        cacheAdapter: true //UNSUPPORTED
    },
    events: {
        onMousehold: "",
        onResized: "",
        onPageTitleChanged: "", //only supported one right now!
        onUrlRedirected: "",
        onSingleTap: "",
        onLoadStarted: "",
        onLoadProgress: "",
        onLoadStopped: "",
        onLoadComplete: "",
        onFileLoad: "",
        onAlertDialog: "",
        onConfirmDialog: "",
        onPromptDialog: "",
        onSSLConfirmDialog: "",
        onUserPasswordDialog: "",
        onNewPage: "",
        onPrint: "",
        onEditorFocusChanged: "",
        onScrolledTo: "",
        onError: "",
        onDisconnected: ""
    },
    components: [
        {
            name: "iframe",
            tag: "iframe"
        }
    ],

    addLoadListener: function () {
        if (this.$.iframe.eventNode) {
            this.$.iframe.eventNode.onload = this.bindSafely("webviewLoaded");
        } else {
            this.log("Need to retry binding.");
            setTimeout(this.bindSafely("addLoadListener"), 10);
        }
    },
    webviewLoaded: function () {
        this.title = this.$.iframe.node.contentDocument.title;
        if (this.title !== this.oldTitle) {
            this.doPageTitleChanged({
                title: this.title,
                url: this.url
            });
            this.oldTitle = this.title;
        }
        this.doLoadComplete({url: this.url});
    },

    urlChanged: function () {
        this.addLoadListener();
        this.$.iframe.setSrc(this.url);
    },
    enableJavascriptChanged: function () {
        var sandbox = this.$.iframe.getAttribute("sandbox"), seperator = " ", parts, partsNew = [];
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
    },

    //can we implement some of those?
    identifierChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    minFontSizeChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    blockPopupsChagend: function () {
        this.error("Unsupported on LuneOS.");
    },
    acceptCookiesChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    headerHeightChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    redirectsChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    networkInterfaceChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    dnsServersChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    ignoreMetaTagsChanged: function () {
        this.error("Unsupported on LuneOS.");
    },
    cacheAdapterChanged: function () {
        this.error("Unsupported on LuneOS.");
    }
});
