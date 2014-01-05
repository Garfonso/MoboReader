/*jslint newcap: true */
/*global
    debug,
    joDefer,
    joSubject,
    log,
    LocalStorageWrapper,
    PocketApi
*/

var ArticleStorage = {
    articles: [],

    loadDoneEvent: "", //fired when load from DB is done.
    downloadContentDone: "", //fired when download of article content is done. Will fire for every article and contain article as contentId

    init: function () {
        "use strict";
        /*jslint newcap: true */
        this.loadDoneEvent = new joSubject(this);
        this.downloadContentDone = new joSubject(this);

        PocketApi.syncDoneEvent.subscribe(this.newArticlesMeta, this);

        var meta = LocalStorageWrapper.get("articles-meta"), i;
        if (meta) {
            this.articles = meta.articles;

            this.removeDuplicates();
        }

        if (!meta) {
            log("Creating dummy articles.");
            for (i = 0; i < 30; i += 1) {
                this.articles.push({
                    title: "Dummy " + i
                });
            }
        }

        joDefer(this.loadDoneEvent.fire, this.loadDoneEvent);
    },

    getArticle: function (i) {
        "use strict";
        if (i >= 0 && i < this.articles.length) {
            return this.articles[i];
        }
    },

    getArticleContent: function (article) {
        "use strict";
        return LocalStorageWrapper.get("content" + article.contentId);
    },

    getCount: function () {
        "use strict";
        return this.articles.length;
    },

    getArticleList: function () {
        "use strict";
        return this.articles;
    },

    deleteArticle: function (i) {
        "use strict";
        if (typeof i === "object") {
            i = this.getArticleIndexById(i.id);
        }

        if (i >= 0 && i < this.articles.length) {
            //delete stored content:
            var id = this.articles[i].contentId;
            LocalStorageWrapper.remove("content" + id);

            //remove meta data:
            this.articles.splice(i, 1);
            this.save();
        }
    },

    getArticleIndexById: function (id) {
        "use strict";
        var i;
        for (i = 0; i < this.articles.length; i += 1) {
            if (this.articles[i].id === id) {
                return i;
            }
        }
    },

    removeDuplicates: function () {
        "use strict";
        var i, j, a1, a2, found = false;

        debug("Checking", this.articles.length, "articles for duplicates.");
        for (i = 0; i < this.articles.length; i += 1) {
            a1 = this.articles[i];
            found = false;
            for (j = this.articles.length - 1; j > i; j -= 1) {
                a2 = this.articles[j];
                if (a1.id === a2.id) {
                    debug("Duplicate!");
                    this.deleteArticle(j);
                    found = true;
                }
            }

            if (!found) {
                debug("this one is good.");
            }
        }

        this.save();
        log("Now have", this.articles.length, "articles.");
    },

    newArticlesMeta: function (input) {
        "use strict";
        var i, toDownload = [], index, article;
        //reset found flag in articles:
        for (i = 0; i < this.articles.length; i += 1) {
            this.articles[i].found = false;
        }

        for (i = 0; i < input.newArticles.length; i += 1) {
            article = input.newArticles[i];
            debug("Processing article:", article);
            index = this.getArticleIndexById(article.id);

            if (article.doDelete) {
                debug("Do delete.");
                this.deleteArticle(index);
            } else if (index >= 0 && index < this.articles.length) {
                debug("Already present... won't add.");
                this.articles[index] = article; //overwrite stored data with data from server.
                this.articles[index].found = true;
            } else {
                debug("do add.");
                article.found = true;
                this.articles.push(article);
            }
        }

        //clean up articles not present on server anymore:
        for (i = this.articles.length - 1; i >= 0; i -= 1) {
            debug("Checking ", i);
            if (!this.articles[i].found) {
                debug("Deleting", i);
                this.deleteArticle(i);
            }
        }
        this.save();
        this.loadDoneEvent.fire(); //trigger reload of unread list.

        //download content for new articles:
        for (i = 0; i < this.articles.length; i += 1) {
            if (this.articles[i].contentId === undefined) {
                toDownload.push(this.articles[i]);
            }
        }
        this.downloadArticleContent(0, toDownload);
    },

    downloadArticleContent: function (index, newArticles) {
        "use strict";
        log("Need to implement this!");
        //trigger download with pocket api, wait for callback, trigger download of next article.
        var article = newArticles[index];
        if (!article) {
            debug("Download done.");
            return;
        } else {
            debug("Downloading", article);
            this.downloadContentDone.fire({article: article});
            this.downloadArticleContent(index + 1, newArticles);
        }
    },

    save: function () {
        "use strict";
        LocalStorageWrapper.set("articles-meta", {
            articles: this.articles
        });
    }
};
