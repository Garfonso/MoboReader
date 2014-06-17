enyo.kind({
    name: "moboreader.ArticleModel",
    kind: "enyo.Model",
    primaryKey: "item_id",
    defaultSource: "local",

    parse: function (data) {
        if (!data) { //is called also for commit, data seems empty then.
            return data;
        }

        if (data.image) {
            data.image_src = data.image.src;
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
        data.url = data.url || data.resolved_url || data.given_url || data.normal_url;

        return data;
    },

    doArchive: function (api, collection) {
        if (this.get("status") && this.get("status") === "0") {
            api.articleAction(this, "archive", collection);
        } else {
            api.articleAction(this, "readd", collection);
        }
    },

    doFavorite: function (api, collection) {
        console.log("Is fav: ", this.get("favorite") !== 0);
        if (this.get("favorite") === 0) {
            api.articleAction(this, "favorite", collection);
        } else {
            api.articleAction(this, "unfavorite", collection);
        }
    },

    doDelete: function (api, collection) {
        api.articleAction(this, "delete", collection);
    }
});