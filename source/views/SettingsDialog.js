enyo.kind({
    name: "moboreader.SettingsDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%; height: 80%;",
    scrim: true,
    modal: true,
    autoDismiss: true,
    floating: true,
    centered: true,
    showTransitions: true,
    events: {
        onLogoutRequest: ""
    },
    bindings: [
        { from: "^.moboreader.Prefs.maxDownloadedArticles", to: ".$.maxEntries.inVal", oneWay: false},
        {from: "^.moboreader.Prefs.sortOrder", to: ".$.sortOrder.inVal", oneWay: false  },

        {from: "^.moboreader.Prefs.fontSize", to: ".$.fontSize.inVal", oneWay: false  },

        {from: "^.moboreader.Prefs.useSpritz", to: ".$.useSpritz.checked", oneWay: false  },
        {from: "^.moboreader.Prefs.downloadSpritzOnUpdate", to: ".$.downloadSpritzOnUpdate.checked", oneWay: false  }
    ],
    components: [
        {
            kind: "enyo.Scroller",
            touch: true,
            thumb: false,
            style: "height: 100%",
            components: [
                {
                    kind: "FittableRows",
                    style: "height: 550px;",
                    components: [
                        {
                            kind: "onyx.Groupbox",
                            components: [
                                {
                                    kind: "onyx.GroupboxHeader",
                                    content: "Pocket settings"
                                },
                                {
                                    kind: "PickerWithHintAndBinding",
                                    name: "maxEntries",
                                    hint: "Max downloaded entries",
                                    pickerComponents: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
                                },
                                {
                                    kind: "PickerWithHintAndBinding",
                                    name: "sortOrder",
                                    hint: "Sort articles for ",
                                    pickerComponents: ["newest", "oldest", "title", "url"]
                                }
                            ]
                        },
                        {
                            kind: "onyx.Groupbox",
                            components: [
                                {
                                    kind: "onyx.GroupboxHeader",
                                    content: "Display settings"
                                },
                                {
                                    kind: "PickerWithHintAndBinding",
                                    name: "fontSize",
                                    hint: "Font size in article view",
                                    pickerComponents: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30]
                                }
                            ]
                        },
                        {
                            kind: "onyx.Groupbox",
                            components: [
                                {
                                    kind: "onyx.GroupboxHeader",
                                    content: "Spritz settings"
                                },
                                {
                                    style: "overflow: hidden; padding: 10px;",
                                    components: [
                                        { content: "Use spritz", style: "float: left; "},
                                        {
                                            kind: "onyx.Checkbox",
                                            name: "useSpritz",
                                            style: "float: right;"
                                        }
                                    ]
                                },
                                {
                                    style: "overflow: hidden; padding: 10px;",
                                    components: [
                                        { content: "Download spritz data for offline use", style: "float: left; "},
                                        {
                                            kind: "onyx.Checkbox",
                                            name: "downloadSpritzOnUpdate",
                                            style: "float: right;"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            style: "margin: 10px auto; display: block;",
                            kind: "onyx.Button",
                            content: "Logout from Pocket",
                            name: "logoutBtn",
                            ontap: "logout"
                        },

                        {
                            style: "margin: 10px 5px; width: 100px;",
                            kind: "onyx.Button",
                            content: "Close",
                            name: "cancelBtn",
                            ontap: "hide"
                        }
                    ]
                }
            ]
        }
    ],
    logout: function () {
        this.hide();
        this.doLogoutRequest();
    }
});
