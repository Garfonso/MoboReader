/*jslint sloppy: true, browser: true */
/*global enyo*/

enyo.kind({
	name: "moboreader.LinkPopup",
	kind: "onyx.Popup",

	published: {
		url: ""
	},
	events: {
		onButtonTapped: ""
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
		window.open(this.url);
		this.hide();
		this.doButtonTapped({});
	},
	addLink: function () {
		enyo.Signals.send("onAddArticle", {url: this.url});
		this.hide();
		this.doButtonTapped({});
	}
});
