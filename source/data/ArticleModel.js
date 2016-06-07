/*jslint sloppy: true, browser: true, devel: true */
/*global ArticleContentHandler, enyo*/

var emptyImg = "assets/empty.png";

var parseArticle = function (data) {
	if (!data || typeof data !== "object") { //is called also for commit, data seems empty then.
		//console.error("Undefined data!! " + typeof data);
		return data;
	}

	if (!data.item_id) {
		if (data.length >= 1) {
			console.error("Data was array... hm. " + JSON.stringify(data));
			data = data[0];
		}

		if (!data || typeof data !== "object") { //is called also for commit, data seems empty then.
			console.error("Undefined data!! " + typeof data);
			return data;
		}
	}

	if (data.image) {
		data.image_src = data.image.src;
	} else if (data.images && data.images["1"] && data.images["1"].src) {
		data.image_src = data.images["1"].src;
	} else {
		data.image_src = emptyImg;
	}

	if (data.favorite) {
		data.favorite = parseInt(data.favorite, 10);
	} else {
		data.favorite = 0;
	}
	if (data.status) {
		data.archived = data.status !== "0";
	} else {
		data.archived = false;
		data.status = "0";
	}

	data.title = data.title || data.resolved_title || data.given_title || data.normal_title || "No title";
	data.url = data.resolved_url || data.url || data.given_url || data.normal_url;
	if (!data.url) {
		data.url = "No url";
		console.error("Had article without url: " + JSON.stringify(data));
	}

	if (!data.host) {
		var start = data.url.indexOf("//") + 2,
			end   = data.url.indexOf("/", start);
		data.host = data.url.substring(start, end);
		if (!data.host) {
			console.error("Could not extract host from: " + data.url);
			data.host = "No host";
		}
		if (data.host.indexOf("www.") === 0) {
			data.host = data.host.substr(4);
		}
	}

	if (data.time_added) {
		data.time_added = parseInt(data.time_added, 10);
	} else {
		data.time_added = Math.round(Date.now() / 1000);
	}

	data.greyout = data.status !== "0";

	return data;
};

var cleanUpAllModelsNotInCollection = function (collection) {
	var models = enyo.sources.LocalStorageSource.storage().models, keys = Object.keys(models), model, cleaned = 0;
	console.log("Doing clean up of " + keys.length + " models.");
	keys.forEach(function (key) {
		console.log("Testing " + key);
		if (key !== "authModel") {
			if (!collection.has(key)) {
				cleaned += 1;
				console.log("Cleaning up model " + key);
				model = enyo.store.resolve(moboreader.ArticleModel, key);
				if (!model) {
					console.log("Could not get model for " + key + ". Doing things manually.");
					delete models[key];
					enyo.sources.LocalStorageSource.save(key);
				} else {
					model.destroy();
				}
			}
		}
	});
	console.log("Needed to clean " + cleaned + " of " + keys.length);
};

enyo.kind({
	name: "moboreader.ArticleModel",
	kind: "enyo.Model",
	primaryKey: "item_id",
	source: "LocalStorageSource",
	attributes: {
		contentAvailable: false, //will change to true, if backend has downloaded content.
		greyout: false          //will change to true, if article is archived/deleted and vanish on next refresh.
	},
	computed: {
		articleStateColor: ["contentAvailable", "greyout", {cached: true}]
	},

	articleStateColor: function () {
		if (this.attributes.greyout) {
			return "lightgray";
		}
		if (!this.attributes.contentAvailable) {
			return "lightyellow";
		}
		return "white";
	},

	parse: function (data) {
		return parseArticle(data);
	},

	doArchive: function (api, collection) {
		if (this.get("archived") !== true) {
			this.set("greyout", true);
			this.set("archived", true);
			api.articleAction(this, "archive", collection);
		} else {
			this.set("greyout", false);
			this.set("archived", false);
			api.articleAction(this, "readd", collection);
		}
		this.commit();
	},

	doFavorite: function (api, collection) {
		if (this.get("favorite") === 0) {
			api.articleAction(this, "favorite", collection);
		} else {
			api.articleAction(this, "unfavorite", collection);
		}
		this.commit();
	},

	doDelete: function (api, collection) {
		this.set("greyout", true);
		api.articleAction(this, "delete", collection);
		this.commit();
	},

	destroy: function () {
		ArticleContentHandler.deleteContent(this);
		this.inherited(arguments);
	},

	tryDestroy: function (notShowing) {
		console.log("tryDestroy called for " + this.get("item_id"));
		if (notShowing === true) {
			this.showing = false;
		}
		if (this.showing || this.get("status") === "0") {
			console.log("was showing " + this.showing + " or not 0 " + this.get("status"));
			return;
		}

		console.log("Need to be destroyed.");
		this.destroy({
			success: function () { console.log("Destruction of " + JSON.stringify(this) + " succeeded."); }.bind(this),
			fail: function () { console.error("Destruction of " + JSON.stringify(this) + " failed."); }.bind(this)
		});
	},

	parseArticleContent: function (content) {
		if (content.images) {
			this.set("images", content.images);
			if (this.get("image_src") === emptyImg && content.images["1"] && content.images["1"].src) {
				this.set("image_src", content.images["1"].src);
			}
		}

		if (content.resolvedUrl) {
			this.set("url", content.resolvedUrl);
		}

		if (content.title) {
			this.set("title", content.title);
		}

		this.set("host", content.host);
	}
});
