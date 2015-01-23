/**
    Define and instantiate your enyo.Application kind in this file.  Note,
    application rendering should be deferred until DOM is ready by wrapping
    it in a call to enyo.ready().
*/
/*jslint sloppy: true*/
/*global enyo, moboreader */

enyo.kind({
	name: "moboreader.Application",
	kind: "enyo.Application",
	view: "moboreader.MainView"
});

enyo.ready(function () {
	enyo.LocalStorageSource.create({name: "LocalStorageSource", prefix: "moboreader-app"});
	new moboreader.Application({name: "app"});
});
