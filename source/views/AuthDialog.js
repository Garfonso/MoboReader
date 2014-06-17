enyo.kind({
    name: "moboreader.AuthDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%;",
    scrim: true,
    modal: true,
    autoDismiss: false,
    floating: true,
    centered: true,
    showTransitions: true,
    components: [
        {
            kind: "enyo.Scroller",
            classe: "enyo-fill",
            components: [
                {
                    name: "message",
                    content: "Trying to login..."
                },
                {
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Spinner"
                },
                {
                    style: "display: block; margin: 10px auto;",
                    kind: "onyx.Button",
                    content: "Retry",
                    name: "retryBtn",
                    ontap: "doRetry"
                }
            ]
        }
    ],
    doShow: function () {
        this.show();
        this.$.retryBtn.hide();
        this.$.message.setContent("Trying to login...");
    },
    resultOk: function (username) {
        this.$.message.setContent("Successfully logged in as " + username);
        setTimeout(function () { this.hide(); }.bind(this), 2000);
    },
    resultFail: function (api) {
        this.$.message.setContent("Failed to log in. Please try again later.");
        this.$.retryBtn.show();
        this.api = api;
    },
    doRetry: function () {
        if (this.api) {
            this.api.startAuth();
            this.$.retryBtn.hide();
        } else {
            this.$.retryBtn.hide();
            this.$.message.setContent("Retry failed. Please restart app.");
        }
    }
});
