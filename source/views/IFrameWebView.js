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
    components: [
        {
            name: "iframe",
            tag: "iframe",
            style: "width: 100%; height: 100%;",
            attributes: {sandbox: "allow-scripts allow-forms"}
        }
    ],

    addLoadListener: function () {
        this.$.iframe.hasNode();
        if (this.$.iframe.node) {
            this.log("Added binding.");
            this.$.iframe.node.onload = this.bindSafely("webviewLoaded");
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
    },

    urlChanged: function () {
        this.oldTitle = null;
        this.addLoadListener();
        this.$.iframe.setSrc(this.url);
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
