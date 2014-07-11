/*global parseArticle, ArticleContentHandler */

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
        var recs = this.records.slice(), key = this.getSortKey(), field = key.field, desc = key.desc;
        recs.sort(function (r1, r2) {
            if (!r1 || !r2) {
                return 0;
            }
            var v1, v2;
            v1 = r1.attributes ? r1.attributes[field] : r1[field];
            v2 = r2.attributes ? r2.attributes[field] : r2[field];

            if (v1 === v2) {
                return 0;
            }
            if (v1 > v2) {
                return desc ? -1 : 1;
            }
            return desc ? 1 : -1;
        });

        //clear and add sorted recs.
        this.removeAll();
        this.add(recs);
    },

    storeWithChilds: function (added) {
        var i, rec;
        for (i = this.records.length - 1; i >= 0; i -= 1) {
            rec = this.at(i);
            if (!rec) {
                console.error("record " + i + " was undefined!!");
                continue;
            }
            if (!rec.commit) {
                console.error("record " + JSON.stringify(rec) + " had no commit method!");
                continue;
            }
            rec.commit({
                success: this.success.bind(this)
            });
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
        var i, rec;
        for (i = 0; i < this.records.length; i += 1) {
            rec = this.at(i);
            if (rec) {
                if (i < moboreader.Prefs.maxDownloadedArticles || ArticleContentHandler.isWebos) {
                    ArticleContentHandler.checkAndDownload(rec, api);
                    /*if (!rec.get("content")) {
                        this.log("Downloading content for ", rec.attributes.title);
                        api.getArticleContent(rec);
                    } else if (moboreader.Prefs.downloadSpritzOnUpdate && !rec.get("spritzModelPersist")) {
                        this.log("Downloading spritz for ", rec.attributes.title);
                        moboreader.Spritz.downloadSpritzModel(rec);
                    } else {
                        this.log(rec.attributes.title, " already complete.");
                    }*/
                } else {
                    if (rec.attributes) {
                        //delete data.
                        delete rec.spritzModel;
                        delete rec.spritzModelPersist;
                        rec.spritzOk = false;
                    }
                }
            }
        }
    },

    addRightIndex: function (hash) {
        var i, key = this.getSortKey(), field = key.field, desc = key.desc, rec, attributes;
        hash = parseArticle(hash);

        if(enyo.store.findLocal("moboreader.ArticleModel", hash)) {
            console.warn("Article already present: " + hash.title, ", " + hash.url);
            return;
        }

        for (i = 0; i < this.records.length; i += 1) {
            this.log("i: ", i);
            rec = this.at(i);
            if (rec.attributes) {
                attributes = rec.attributes;
            } else {
                attributes = rec;
            }

            if (attributes) {
                this.error("rec empty? " + JSON.stringify(rec));
                continue;
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
