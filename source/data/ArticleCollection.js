/*global parseArticle */

enyo.kind({
    name: "moboreader.ArticleCollection",
    kind: "enyo.Collection",
    model: "moboreader.ArticleModel",
    defaultSource: "local",
    instanceAllRecords: true,
    published: {
        sortOrder: "newest"
    },
    bindings: [
        {from: "^.moboreader.Prefs.sortOrder", to: ".sortOrder"}
    ],

    success: function () {

    },

    sortOrderChanged: function () {
        this.resortCollection();
    },

    getSortKey: function () {
        var field, desc;
        switch (this.sortOrder) {
            case "newest":
                field = "time_added";
                desc = true;
                break;
            case "oldest":
                field = "time_added";
                break;
            case "title":
                field = "title";
                break;
            case "url":
                field = "url";
                break;
        }

        return {field: field, desc: desc };
    },

    resortCollection: function () {
        this.log("Sorting for", this.sortOrder);
        var recs = this.records.slice(), i, key = this.getSortKey(), field = key.field, desc = key.desc, msg;
        this.log("Sorting: ", recs.length);

        recs.sort(function (r1, r2) {
            if (r1.get(field) === r2.get(field)) {
                return 0;
            }
            if (r1.get(field) > r2.get(field)) {
                return desc ? -1 : 1;
            }
            return desc ? 1 : -1;
        });

        msg = "Old order: ";
        for (i = 0; i < this.records.length; i += 1) {
            msg += "\n    " + this.records[i].get("time_added") + " => " + this.records[i].get("title");
        }
        this.log(msg);
        msg = "New order: ";
        for (i = 0; i < recs.length; i += 1) {
            msg += "\n    " + recs[i].get("time_added") + " => " + recs[i].get("title");
        }
        this.log(msg);

        //clear and add sorted recs.
        this.removeAll();
        this.add(recs);
    },

    storeWithChilds: function (added) {
        var i;
        for (i = this.records.length - 1; i >= 0; i -= 1) {
            if (this.records[i] === undefined) {
                this.log("record ", i, " was undefined!!");
                this.records.splice(i, 1);
            }
        }

        if (added) {
            this.resortCollection();
        }

        enyo.store.sources[this.defaultSource].commit(this, {
            success: function () {console.log("Collection stored."); }
        });

        this.cleanUpLocalStorace();
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

    cleanUpLocalStorace: function () {
        var keys = Object.keys(localStorage), i, index;
        for (i = 0; i < keys.length; i += 1) {
            index = keys[i].indexOf("moboreader-app-");

            if (keys[i].indexOf("spritz.telemetry") === 0 ||
                (index === 0) &&
                 keys[i] !== "moboreader-app-authModel" &&
                 keys[i] !== "moboreader-app-pocket-unread-list" &&
                !this.idInCollection(keys[i].substr(index + "moboreader-app-".length))) {
                localStorage.removeItem(keys[i]);
            }
        }
    },

    whipe: function () {
        this.destroyAll();

        //this only works with local storage!!
        if (typeof enyo.store.sources[this.defaultSource].storage === "function") {
            var models = enyo.store.sources[this.defaultSource].storage().models, key;
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
        //records are sorted!
        var i, rec, attributes;
        for (i = this.records.length - 1; i >= 0; i -= 1) {
            if (this.records[i] === undefined) {
                this.error("record ", i, " was undefined!!");
                this.records.splice(i, 1);
            }
        }

        for (i = 0; i < this.records.length; i += 1) {
            rec = this.records[i];
            if (rec.attributes) {
                attributes = rec.attributes;
            } else {
                attributes = rec;
            }

            if (i < moboreader.Prefs.maxDownloadedArticles) {
                if (!attributes.content) {
                    this.log("Downloading content for ", attributes.title);
                    api.getArticleContent(rec);
                } else if (moboreader.Prefs.downloadSpritzOnUpdate && !attributes.spritzModelPersist) {
                    this.log("Downloading spritz for ", attributes.title);
                    moboreader.Spritz.downloadSpritzModel(rec);
                } else {
                    this.log(attributes.title, " already complete.");
                }
            } else {
                this.log("Deleting content for ", attributes.title);

                if (rec.set) {
                    //delete data.
                    rec.set("content", undefined);
                    rec.spritzModel = undefined;
                    rec.set("spritzModelPersist", undefined);
                    rec.spritzOk = false;
                    rec.commit();
                } else {
                    delete attributes.content;
                    delete attributes.spritzModelPersist;
                }
            }
        }
    },

    addRightIndex: function (hash) {
        var i, key = this.getSortKey(), field = key.field, desc = key.desc, rec, attributes;
        hash = parseArticle(hash);

        for (i = 0; i < this.records.length; i += 1) {
            this.log("i: ", i);
            rec = this.records[i];
            if (rec.attributes) {
                attributes = rec.attributes;
            } else {
                attributes = rec;
            }

            if (desc) {
                if (attributes[field] < hash[field]) {
                    this.log(attributes[field], " < ", hash[field], " => add at ", i);
                    this.add(hash, i);
                    return;
                }
            } else {
                if (attributes[field] > hash[field]) {
                    this.log(attributes[field], " > ", hash[field], " => add at ", i);
                    this.add(hash, i);
                    return;
                }
            }
        }
        this.add(hash);
    }
});
