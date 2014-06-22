enyo.kind({
    name: "moboreader.ArticleCollection",
    kind: "enyo.Collection",
    model: "moboreader.ArticleModel",
    defaultSource: "local",
    published: {
        sortOrder: "newest"
    },
    bindings: [
        {from: "^.moboreader.Prefs.sortOrder", to: ".sortOrder"}
    ],

    sortOrderChanged: function () {
        this.resortCollection();
    },

    resortCollection: function () {
        this.log("Sorting for", this.sortOrder);
        var recs = this.records.slice(), i, field, desc = false;
        this.log("Sorting: ", recs.length);
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

        recs.sort(function (r1, r2) {
            console.log("Blub: ", r1, " blub2: ", r2);

            if (r1.get(field) === r2.get(field)) {
                return 0;
            }
            if (r1.get(field) > r2.get(field)) {
                return desc ? -1 : 1;
            }
            return desc ? 1 : -1;
        });

        var msg = "Old order: ";
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
        var i, rec;
        for (i = this.records.length - 1; i >= 0; i -= 1) {
            if (this.records[i] === undefined) {
                this.log("record ", i, " was undefined!!");
                this.records.splice(i, 1);
            }
        }

        for (i = this.records.length - 1; i >= 0; i -= 1) {
            rec = this.records[i];
            if (!rec.attributes) {
                if (rec && rec.destroy) {
                    rec.destroy({
                        success: function () { }
                    });
                }
                this.log("Got rec without attributes: ", i, JSON.stringify(rec));
                this.remove(rec);
            } else {
                rec.commit({
                    success: function () { }
                });
            }
        }

        if (added) {
            this.resortCollection();
        }

        enyo.store.sources[this.defaultSource].commit(this, {
            success: function () {console.log("Collection stored."); }
        });
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
        var i;
        for (i = this.records.length - 1; i >= 0; i -= 1) {
            if (this.records[i] === undefined) {
                this.log("record ", i, " was undefined!!");
                this.records.splice(i, 1);
            }
        }

        this.records.forEach(function (rec, index) {
           if (!rec.attributes) {
                if (rec && rec.destroy) {
                    rec.destroy({
                        success: function () { }
                    });
                }
                this.log("Got rec without attributes: ", rec, index);
                this.remove(rec);
            } else {
                if (!rec.get("content")) {
                    api.getArticleContent(rec);
                } else if (moboreader.Prefs.downloadSpritzOnUpdate && !rec.get("spritzModelPersist")) {
                    moboreader.Spritz.downloadSpritzModel(rec);
                }
            }
        }.bind(this));
    }
});
