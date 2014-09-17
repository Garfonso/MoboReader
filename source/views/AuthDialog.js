enyo.kind({
    name: "moboreader.AuthDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%; height: 90%;",
    scrim: true,
    modal: true,
    autoDismiss: false,
    floating: true,
    centered: true,
    showTransitions: true,
    published: {
        api: ""
    },
    components: [
        {
            kind: "enyo.FittableRows",
            classes: "enyo-fill",
            components: [
                {
                    name: "message",
                    content: "Preparing login to Pocket"
                },
                {
                    name: "spinner",
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Spinner"
                },
                {
                    classes: "enyo-fill",
                    fit: true,
                    kind: "IFrameWebView",
                    name: "webView",
                    onPageTitleChanged: "webviewLoaded"
                },
                {
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Button",
                    content: "Retry",
                    name: "retryBtn",
                    ontap: "doRetry",
                    showing: false
                }
            ]
        }
    ],

    doShow: function () {
		try {
            this.show();
            this.$.message.setContent("Preparing login to Pocket");
            this.$.spinner.show();
            this.$.retryBtn.hide();
        } catch (e) {
            this.log("Error in doShow: ", e);
        }
    },
    setURL: function (url) {
        this.$.spinner.hide();
        this.$.message.setContent("Please log in to Pocket below.");
        this.$.webView.setUrl(url);
    },
    webviewLoaded: function (inSender, inEvent) {
        if (inEvent.title.indexOf("token:") === 0) {
            this.api.finishAuth();
        } else {
            this.log("Wrong title: ", inEvent.url);
        }
    },
    resultOk: function (username) {
        this.$.message.setContent("Successfully logged in as " + username);
        setTimeout(function () { this.hide(); }.bind(this), 2000);
    },
    resultFail: function () {
        this.$.message.setContent("Failed to log in. Please try again later.");
        this.$.retryBtn.show();
    },
    doRetry: function () {
        if (this.api) {
            this.api.startAuth();
            this.$.retryBtn.hide();
            this.$.spinner.show();
            this.$.message.setContent("Preparing login to Pocket");
        } else {
            this.$.retryBtn.hide();
            this.$.message.setContent("Retry failed. Please restart app.");
        }
    }
});
