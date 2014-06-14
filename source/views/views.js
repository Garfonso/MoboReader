/**
    For simple applications, you might define all of your views in this file.
    For more complex applications, you might choose to separate these kind definitions
    into multiple files under this folder.
*/

enyo.kind({
    name: "moboreader.MainView",
    kind: "FittableRows",
    fit: true,
    components: [
        {
            kind: "onyx.Toolbar",
            components: [
                {kind: "enyo.Spinner", name: "activitySpinner", showing: false},
                {content: "Mobo Reader"}
            ]
        },
        {
            kind: "enyo.Scroller",
            fit: true,
            components: [
                {
                    kind: "enyo.Panels",
                    name: "MainPanels",
                    components: [
                        {
                            name: "ArticleListPanel",
                            components: [
                                {kind: "enyo.Repeater", name: "articleList"}
                            ]
                        },
                        {
                            name: "ArticleViewPanel",
                            components: [
                                {name: "articleContent", content: "Place article content here."}
                            ]
                        }
                    ]
                }
            ]
        },
        {
            kind: "onyx.MoreToolbar",
            components: [
                {
                    kind: "onyx.Button",
                    content: "Refresh",
                    ontap: "refreshTap"
                },
                {
                    kind: "onyx.Button",
                    content: "Add",
                    ontap: "addArticle"
                }
            ]
        },

        //non ui stuff:
        {
            kind: "enyo.Signals",
            onbackbutton: "handleBackGesture"
        },
        {
            kind: "moboreader.Api"
        }
    ]
});
