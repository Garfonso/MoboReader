enyo.singleton({
    name: "moboreader.Prefs",
    published: {
        //pocket optins
        maxDownloadedArticles: 10,
        sortOrder: "newest", //other options: oldest, title, site === url.

        //display options:
        fontSize: 16,

        //spritz options
        useSpritz: true,
        downloadSpritzOnUpdate: false,
        minWPM: 200,
        maxWPM: 1000
    },
    maxDownloadedArticlesChanged: function () {
        enyo.setCookie("maxDownloadedArticles", this.maxDownloadedArticles);
    },
    sortOrderChanged: function () {
        enyo.setCookie("sortOrder", this.sortOrder);
    },
    fontSizeChanged: function () {
        enyo.setCookie("fontSize", this.fontSize);
    },
    useSpritzChanged: function () {
        enyo.setCookie("useSpritz", this.useSpritz);
    },
    downloadSpritzOnUpdateChanged: function () {
        enyo.setCookie("downloadSpritzOnUpdate", this.downloadSpritzOnUpdate);
    },
    minWPMChanged: function () {
        enyo.setCookie("minWPM", this.minWPM);
    },
    maxWPMChanged: function () {
        enyo.setCookie("maxWPM", this.maxWPM);
    },


    create: function () {
        this.inherited(arguments);

        //load stuff
        this.setMaxDownloadedArticles(parseInt(enyo.getCookie("maxDownloadedArticles"), 10) || this.maxDownloadedArticles);
        this.setSortOrder(enyo.getCookie("sortOrder") || this.sortOrder);

        this.setFontSize(enyo.getCookie("fontSize") || this.fontSize);

        this.setUseSpritz(enyo.getCookie("useSpritz") === "true" || enyo.getCookie("useSpritz") === undefined);
        this.setDownloadSpritzOnUpdate(enyo.getCookie("downloadSpritzOnUpdate") === "true");
        this.setMinWPM(parseInt(enyo.getCookie("minWPM"), 10) || this.minWPM);
        this.setMaxWPM(parseInt(enyo.getCookie("maxWPM"), 10) || this.maxWPM);
    }
});
