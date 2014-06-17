enyo.kind({
    name: "moboreader.AddDialog",
    kind: "onyx.Popup",
    style: "text-align: center; width: 80%;",
    scrim: true,
    modal: true,
    autoDismiss: true,
    floating: true,
    centered: true,
    showTransitions: true,
    events: {
        onAdd: ""
    },
    components: [
        {
            kind: "enyo.Scroller",
            classe: "enyo-fill",
            components: [
                {
                    kind: "onyx.InputDecorator",
                    style: "display: block; width: 90%; margin: 10px auto;",
                    components: [
                        {
                            classes: "enyo-fill",
                            name: "urlEntry",
                            kind: "onyx.Input",
                            placeholder: "Type url here"
                        }
                    ]
                },
                {
                    classes: "onyx-affirmative",
                    style: "margin: 10px 5px; width: 100px;",
                    kind: "onyx.Button",
                    content: "Add",
                    name: "AddBtn",
                    ontap: "addTapped"
                },
                {
                    style: "margin: 10px 5px; width: 100px;",
                    kind: "onyx.Button",
                    content: "Cancel",
                    name: "cancelBtn",
                    ontap: "hide"
                }
            ]
        }
    ],
    doShow: function () {
        this.show();
        this.$.urlEntry.setValue("");
    },
    addTapped: function () {
        var url = this.$.urlEntry.getValue();

        if (url) {
            this.doAdd({url: url });
        }
        this.hide();
    }
});
