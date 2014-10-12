enyo.kind({
    name: "moboreader.AuthDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%; z-index: 130; margin: 4% 9%; height: 90%; position: absolute; top: 0; left: 0; bottom: 100%; right: 100%;",
    scrim: true,
    modal: true,
    autoDismiss: false,
    floating: true,
    centered: true,
    showTransitions: true,
    published: {
        callback: "",
        redirectURL: "",
        serviceName: "",
        cancelable: false
    },
    bindings: [
        {from: ".cancellable", to: ".$.cancelButton"}
    ],
    components: [
        {
            kind: "enyo.FittableRows",
            classes: "enyo-fill",
            components: [
                {
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
                    style: "margin: 10px auto;",
                    kind: "onyx.Button",
                    content: "Cancel",
                    ontap: "hide",
                    showing: false
                }
            ]
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture"
        }
    ],

    doShow: function () {
        this.show();
        this.$.retryBtn.hide();
        this.$.spinner.show();
        this.fired = false;
    },
    setUrl: function (url) {
        if (url) {
            this.$.webView.show();
            this.$.spinner.hide();
            this.url = url;
            this.$.message.setContent("Please log in to " + this.serviceName + " below.");
            this.$.webView.setUrl(url);
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
    resultOk: function (username) {
        this.$.message.setContent("Successfully logged in" + (username ? (" as " + username + ".") : "."));
        setTimeout(function () { this.hide(); }.bind(this), 2000);
    },
    resultFail: function (retryFunc) {
        this.$.message.setContent("Failed to log in. Please try again later.");
        this.$.retryBtn.show();
        this.retryFunc = retryFunc;
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
            this.hide();
        }
    }
});
