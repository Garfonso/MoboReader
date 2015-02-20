/*jslint sloppy: true */
/*global enyo*/

enyo.kind({
	name: "moboreader.ArticleListItem",
	style: "height: 50px;",
	components: [
		{
			name: "articleImage",
			kind: "enyo.Image",
			sizing: "constrain",
			style: "width: 50px; height: 50px; position: absolute; left: 0px; background-size: cover;"
		},
		{
			name: "articleTitle",
			content: "empty?",
			style: "width: 80%; padding: 5px 5px 2px 60px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
		},
		{
			name: "host",
			content: "host.com",
			style: "padding: 0px 0px 5px 60px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: rgb(150, 150, 150); font-size: 12px;"
		}
	],
	bindings: [
		{from: "model.title", to: "$.articleTitle.content"},
		{from: "model.image_src", to: "$.articleImage.src"},
		{from: "model.host", to: "$.host.content"},
		{from: "model.articleStateColor", to: "style", transform: function (v) {
			var style = "height: 50px;";
			if (v) {
				style += " background-color: " + v;
			}
			return style;
		}},
		{from: "model.contentAvailable", to: "style", transform: function (v) {
			var style = "height: 50px;";
			if (v) {

			}
		}}
	]
});
