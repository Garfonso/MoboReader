enyo.kind({
    name: "moboreader.AuthDialog",
    kind: "enyo.FittableRows",
    published: {
        callback: "",
        redirectURL: "",
        serviceName: "",
        cancelable: false
    },
    events: {
        onHideAuth: ""
    },
    components: [
        {
            kind: "onyx.Toolbar",
            style: "text-align: center;",
            name: "message",
            content: "Preparing login"
        },
        {
            name: "spinner",
            style: "display: block; margin: 10px auto;",
            kind: "onyx.Spinner"
        },
        {
            classes: "enyo-fill",
            style: "display: block; margin: 10px auto;",
            fit: true,
            kind: "IFrameWebView",
            name: "webView",
            onPageTitleChanged: "processTitleChange",
            showing: false
        },
        {
            style: "margin: 10px auto;",
            kind: "onyx.Button",
            content: "Retry",
            name: "retryBtn",
            ontap: "doRetry",
            showing: false
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture",
            onNeedShowAuth: "prepareAuthDialog",
            onAuthURL: "setUrl",
            onAuthOk: "resultOk"
        }
    ],

    prepareAuthDialog: function (inSender, inEvent) {
        this.$.retryBtn.hide();
        this.$.spinner.show();
        this.fired = false;

        this.setCancelable(!!inEvent.cancelable);
        this.redirectURL = inEvent.redirectURL;
        this.serviceName = inEvent.serviceName;
        this.callback = inEvent.callback;
    },
    setUrl: function (inSender, inEvent) {
        if (inEvent.url) {
            this.$.webView.show();
            this.$.spinner.hide();
            this.url = inEvent.url;
            this.$.message.setContent("Please log in to " + this.serviceName + " below.");
            this.$.webView.setUrl(this.url);
        }
    },
    processTitleChange: function (inSender, inEvent) {
        var title = inEvent.title, result;
        if (this.fired) {
            this.log("Already authorizing, abort.");
            return;
        }

        if (typeof title === "string" && title.indexOf("token:") === 0) {
            result = this.callback(inEvent.url, inEvent.title);
            if (result !== undefined) {
                if (result) {
                    this.resultOk();
                } else {
                    this.resultFail();
                }
            }
            this.$.webView.hide();
            this.$.spinner.show();
            this.fired = true;
        } else {
            this.log("Wrong title: ", title);
        }
    },
    resultOk: function (inSender, inEvent) {
        var username = inEvent ? inEvent.username : false;
        this.$.message.setContent("Successfully logged in" + (username ? (" as " + username + ".") : "."));
        setTimeout(function () { enyo.Signals.send("onHideAuth"); }, 2000);
    },
    resultFail: function (inSender, inEvent) {
        this.$.message.setContent("Failed to log in. Please try again later.");
        this.$.retryBtn.show();
        this.retryFunc = inEvent.callback;
    },
    doRetry: function () {
        if (this.retryFunc && typeof this.retryFunc === "function") {
            this.retryFunc();
            this.$.webView.hide();
            this.$.spinner.show();
        } else {
            this.$.retryBtn.hide();
            if (this.url) {
                this.$.webView.setUrl(this.url);
            }
            this.fired = false;
            this.$.message.setContent("Please log in to " + this.serviceName + " below.");
        }
    },
    handleBackGesture: function () {
        if (this.cancelable) {
            enyo.Signals.send("onHideAuth");
        }
    }
});
