enyo.kind({
    name: "moboreader.ArticleCollection",
    kind: "enyo.Collection",
    model: "moboreader.ArticleModel",
    defaultSource: "local",

    storeWithChilds: function () {
        enyo.store.sources[this.defaultSource].commit(this, {
            success: function () {console.log("Collection stored.");}
        });

        this.records.forEach(function (rec) {
            rec.commit({
                success: function () { }
            });
        });
    },

    whipe: function () {
        this.destroyAll();

        //this only works with local storage!!
        if (typeof enyo.store.sources[this.defaultSource].storage === "function") {
            var models = enyo.store.sources[this.defaultSource].storage().models, key;
            for (key in models) {
                if (key !== "authModel") {
                    delete models[key];
                }
            }
        }

        //save changes.
        this.storeWithChilds();
    }
});
