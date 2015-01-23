/*jslint sloppy: true, browser: true */
/*global enyo*/

enyo.kind({
	name: "moboreader.LinkPopup",
	kind: "onyx.Popup",

	published: {
		url: ""
	},

	components: [
		{
			kind: "onyx.Button",
			content: "Open link",
			ontap: "openLink"
		},
		{
			kind: "onyx.Button",
			content: "Add to Pocket",
			ontap: "addLink"
		}
	],
	openLink: function () {
		this.log("opening linkg...");
		window.open(this.url);
		this.hide();
	},
	addLink: function () {
		this.log("Adding arcticle.");
		enyo.Signals.send("onAddArticle", {url: this.url});
		this.hide();
	}
});
