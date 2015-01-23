/*jslint sloppy: true, devel: true, browser: true */
/*global parseArticle, ArticleContentHandler, enyo, moboreader */

enyo.kind({
	name: "moboreader.ArticleCollection",
	kind: "enyo.Collection",
	model: "moboreader.ArticleModel",
	source: "LocalStorageSource",
	published: {
		sortOrder: "newest"
	},
	bindings: [
		{from: "^.moboreader.Prefs.sortOrder", to: "sortOrder"}
	],
	sortField: "time_added",
	sortDescending: false,
	sortOrderToField: {
		newest: "time_added",
		oldest: "time_added",
		title: "title",
		url: "url"
	},
	sortOrderToDesc: {
		newest: true
	},

	success: function (index) {
		//this.log("Stored: ", index);
		return index;
	},

	fail: function (index) {
		console.error("Failed to store: ", index);
	},

	sortOrderChanged: function () {
		this.sortField = this.sortOrderToField[this.sortOrder];
		this.sortDescending = this.sortOrderToDesc[this.sortOrder];
		if (this.length > 0) {
			this.log("Sort order changed to " + this.sortOrder + ", firing sort.");
			this.sort(this.comparator.bind(this));
			this.commit({success: function () { console.log("Collection with " + this.length + " items stored after sort."); }.bind(this) });
		} else {
			this.log("Sort order changed to " + this.sortOrder + ", but collection empty, omitting sort.");
		}
	},

	comparator: function (r1, r2) {
		if (!r1 || !r2) {
			console.warn("r1 or r2 undefined in sort.");
			return 0;
		}
		var v1, v2;
		v1 = r1.attributes[this.sortField];
		v2 = r2.attributes[this.sortField];

		if (v1 === v2) {
			return 0;
		}
		if (v1 > v2) {
			return this.sortDescending ? -1 : 1;
		}
		return this.sortDescending ? 1 : -1;
	},

	storeWithChilds: function () {
		this.forEach(function (model, i) {
			model.commit({
				success: this.success.bind(this, i),
				fail: this.fail.bind(this, i)
			});
		}, this);

		this.commit({
			success: function () { console.log("Collection with " + this.length + " items stored."); }.bind(this)
		});

		//this.cleanUpLocalStorage(); //why did I need that?
	},

    idInCollection: function (id) {
        var i;
        for (i = 0; i < this.records.length; i += 1) {
            if (this.records[i].attributes && this.records[i].attributes.item_id === id) {
                return true;
            }
        }
        return false;
    },

    cleanUpLocalStorage: function () {
        var keys = Object.keys(localStorage), i, index;
        for (i = 0; i < keys.length; i += 1) {
            index = keys[i].indexOf("moboreader-app-");

            if (keys[i].indexOf("spritz.telemetry") === 0 ||
                    (index === 0 &&
                        keys[i] !== "moboreader-app-authModel" &&
                        keys[i] !== "moboreader-app-pocket-unread-list" &&
                        !this.idInCollection(keys[i].substr(index + "moboreader-app-".length)))) {
                localStorage.removeItem(keys[i]);
            }
        }
    },

	whipe: function () {
		this.empty([], {destroy: true});

		if (typeof enyo.sources[this.source].storage === "function") {
			var models = enyo.sources[this.source].storage().models, key;
			for (key in models) {
				if (models.hasOwnProperty(key)) {
					if (key !== "authModel") {
						delete models[key];
					}
				}
			}
		}

		//save changes.
		this.storeWithChilds();
	},

	updateArticleContent: function (api) {
		this.forEach(function (model, i) {
			if (i < moboreader.Prefs.maxDownloadedArticles || ArticleContentHandler.isWebos) {
				ArticleContentHandler.checkAndDownload(model, api);
			} else {
				//clean up memory a bit
				delete model.spritzModel;
				delete model.spritzModelPersist;
				model.spritzOk = false;
			}
		});
	},

	//still sorting manually here, because that will go in O(n) instead of O(n*log(n))!
	addRightIndex: function (hash) {
		var model, index = this.length;
		hash = parseArticle(hash);

		model = enyo.store.resolve(moboreader.ArticleModel, hash.item_id);
		if (model) {
			console.warn("Article already present: " + hash.title, ", " + hash.url);
			return model;
		}

		this.forEach(function (model, i) {
			if (this.sortDescending) {
				if (model.get(this.sortField) < hash[this.sortField]) { //hash has to be inserted before model
					if (i < index) {
						index = i;
					}
				}
			} else {
				if (model.get(this.sortField) > hash[this.sortField]) { //hash has to be inserted before model
					if (i < index) {
						index = i;
					}
				}
			}
		});

		this.add(hash, {index: index}); //add to end.
		return this.at(index);
	},

	cleanUp: function () {
		var deletedModels = [];
		this.forEach(function (model) {
			if (model.get("greyout")) {
				deletedModels.push(model);
			}
		});
		
		if (deletedModels && deletedModels.length > 0) {
			this.log("Removing: ", deletedModels);
			this.remove(deletedModels);
			deletedModels.forEach(function (rec) {
				rec.tryDestroy();
			});
		}
	},

	markAllArticlesUnfound: function () {
		this.forEach(function (model) {
			model.onServer = false;
		});
	},

	cleanUpAfterSlowSync: function () {
		var deletedModels = [];
		this.forEach(function (model) {
			if (!model.onServer) {
				deletedModels.push(model);
			}
		});

		if (deletedModels && deletedModels.length > 0) {
			this.log("Deleted " + deletedModels.length + " articles from full sync.");
			this.remove(deletedModels);
			deletedModels.forEach(function (model) {
				model.tryDestroy();
			});
		}
	}
});
