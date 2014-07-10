/**
    Define and instantiate your enyo.Application kind in this file.  Note,
    application rendering should be deferred until DOM is ready by wrapping
    it in a call to enyo.ready().
*/

enyo.kind({
    name: "moboreader.Application",
    kind: "enyo.Application",
    view: "moboreader.MainView"
});

enyo.ready(function () {
    if (window.PalmSystem) {
        window.PalmSystem.stageReady();
        if (window.PalmSystem.allowResizeOnPositiveSpaceChange) {
            window.PalmSystem.allowResizeOnPositiveSpaceChange(false); //deactivate keyboard resizing our app.
        }
        var key;
        for (key in window.PalmSystem) {
            //if (window.PalmSystem.hasOwnProperty(key)) {
                console.error("window.PalmSystem." + key + " = " + window.PalmSystem[key]);
            //}
        }
    }
    new moboreader.Application({name: "app"});
});
