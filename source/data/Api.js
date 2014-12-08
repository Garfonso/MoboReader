/*global ArticleContentHandler */

enyo.kind({
    name: "moboreader.AuthModel",
    kind: "enyo.Model",
    defaultSource: "local",
    defaults: {
        needLogin: true,
        accessToken: "",
        lastSync: 0,
        username: "", //only stored for informational value, like showing the user what user is logged in.
        unsyncedActivities: []
    }
});

enyo.kind({
    name: "moboreader.Ajax",
    kind: "enyo.Ajax",
    contentType: "application/json; charset=UTF8",
    headers: [{"X-Accept": "application/json"}],
    timeout: 180000
});

enyo.kind({
    name: "moboreader.Api",
    published: {
        authModel: new moboreader.AuthModel({id: "authModel"}),
        active: 0,
        redirectUri: "http://www.mobo.info/login_success.html",
        redirectUriHost: "www.mobo.info"
    },
    articlesPerBatch: 10,
    offset: 0,

    authToken: false, //only used during authentication
    consumerKey: "21005-ded74cb03e611ba462973e00",

    create: function () {
        this.inherited(arguments);

        this.authModel.fetch({
            success: this.bindSafely("modelFetched"),
            fail: this.bindSafely("modelFetched")
        });
    },
    modelFetched: function () {
        if (this.authModel.get("needLogin")) {
            setTimeout(function () {
                this.startAuth();
            }.bind(this), 1000);
        } else {
            this.authModel.addListener("change", this.bindSafely("storeModel"));
            console.error("Having " + this.authModel.attributes.unsyncedActivities.length + " unsynced activities");
        }
    },
    storeModel: function () {
        if (!this.storing) {
            this.storing = true;
            this.authModel.commit({
                success: this.bindSafely("modelStored"),
                fail: this.bindSafely("modelStored")
            });
        } else {
            this.log("Already storing Pocket-Model... wait..");
            setTimeout(this.bindSafely("storeModel"), 1000);
        }
    },
    modelStored: function () {
        this.log("Pocket-Model stored.");
        this.storing = false;
    },
    logout: function () {
        this.authModel.set("needLogin", true);
        this.authModel.set("username", "");
        this.authModel.set("accessToken", "");
        this.authModel.set("lastSync", 0);
        this.authModel.set("unsyncedActivities", []);
        this.storeModel();

        this.startAuth();
    },

    checkForUnauthorized: function (inResponse) {
        if (inResponse === 401) {
            return true;
        }
        if (typeof inResponse.indexOf === "function" && inResponse.indexOf("401") >= 0) {
            return true;
        }
        return false;
    },

    dummy: function () { return undefined; },

    /*****************************************************************************************
     ******************* Authorization *******************************************************
     *****************************************************************************************/
    startAuth: function () {
        this.access_token = false;
        var req, data;
        this.log("Starting auth...");

        data = {
            consumer_key: this.consumerKey,
            redirect_uri: this.redirectUri
        };

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/oauth/request",
            method: "POST",
            postBody: data
        });

        enyo.Signals.send("onNeedShowAuth", {
            serviceName: "getPocket",
            redirectUrl: this.redirectUri,
            callback: this.bindSafely("finishAuth"),
            cancelable: false
        });

        req.go();
        req.response(this.bindSafely("gotAuthToken"));
        req.error(this.bindSafely("authError"));
    },
    gotAuthToken: function (inSender, inResponse) {
        /*jslint unparam: true */
        this.authToken = inResponse.code;

        enyo.Signals.send("onAuthURL", {
            url: "https://getpocket.com/auth/authorize?request_token=" + this.authToken + "&redirect_uri=" + this.redirectUri
        });
    },
    finishAuth: function () {
        var req, data;

        data = {
            consumer_key: this.consumerKey,
            code: this.authToken
        };

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/oauth/authorize",
            method: "POST",
            postBody: data
        });

        req.go();
        req.response(this.bindSafely("authFinished"));
        req.error(this.bindSafely("authError"));
    },
    authFinished: function (inSender, inResponse) {
        /*jslint unparam: true */
        this.log("auth finished: ", inResponse);
        this.authModel.set("username", inResponse.username);
        this.authModel.set("accessToken", inResponse.access_token);
        this.authModel.set("needLogin", false);
        this.authModel.set("lastSync", 0);
        this.authModel.set("unsyncedActivities", []);
        this.storeModel();

        this.authModel.addListener("change", this.bindSafely("storeModel"));
        enyo.Signals.send("onAuthOk", { username: inResponse.username });
    },
    authError: function (inSender, inResponse) {
        /*jslint unparam: true */
        this.log("Auth error!! " + JSON.stringify(inResponse));
        enyo.Signals.send("onAuthFailed", {callback: this.bindSafely("startAuth")});
    },

    /*****************************************************************************************
     ******************* Article Sync ********************************************************
     *****************************************************************************************/
    downloadArticles: function (collection, slow) {
        if (this.refreshing || this.authModel.get("needLogin")) {
            return;
        }

        this.refreshing = true;
        this.offset = 0;
        if (slow) {
            this.authModel.set("lastSync", 0);
        }
        this.added = 0;

        if (this.authModel.get("unsyncedActivities").length) {
            this.articleAction(false, false, collection, function () {
                this.downloadArticlesInner(collection, slow);
            }.bind(this));
        } else {
            this.downloadArticlesInner(collection, slow);
        }
    },
    downloadArticlesInner: function (collection) {
        var req, data;

        this.setActive(this.active + 1);

        data = {
            consumer_key: this.consumerKey,
            access_token: this.authModel.get("accessToken"),
            since: this.authModel.get("lastSync"),
            detailType: "complete",
            //contentType: "article",
            sort: moboreader.Prefs.sortOrder || "newest",
            count: this.articlesPerBatch,
            offset: this.offset
        };
        this.offset += this.articlesPerBatch;

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/get",
            method: "POST",
            postBody: data
        });

        req.go();

        req.response(this.bindSafely("gotArticles", collection));
        req.error(this.bindSafely("downloadArticlesFailed"));
    },
    gotArticles: function (collection, inSender, inResponse) {
        /*jslint unparam: true */
        var key, list = inResponse.list, article, rec, listLength = 0;

        this.log("Got response: ", inResponse);
        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
        }
        if (list) {
            for (key in list) {
                if (list.hasOwnProperty(key)) {
                    listLength += 1;
                    this.log("processing: " + key);
                    article = list[key];

                    this.log("Content: ", article);


                    if (article.status !== "0") { //2 => delete, 1 => archive. => if not 0, delete.
                        rec = this.getRecFromCollection(article.item_id, collection);
                        if (rec) {
                            rec.set("status", article.status);
                            rec.set("archived", true);
                            rec.set("greyout", true);
                            collection.remove(rec);
                            rec.destroy({succes: this.dummy});
                        }
                    } else {
                        //console.error("Adding: " + JSON.stringify(article));
                        collection.addRightIndex(article);
                        this.added += 1;
                    }
                }
            }

            this.log("Now have", this.added, "new items.");
            if (listLength > 0) {
                this.downloadArticlesInner(collection);
            } else {
                collection.storeWithChilds(); //sort not necessary anymore, articles will be added at right index during download.
                this.authModel.set("lastSync", inResponse.since || 0);

                this.refreshing = false;
                collection.updateArticleContent(this);
            }
        } else {
            this.refreshing = false;
        }

        this.setActive(this.active - 1);
    },
    downloadArticlesFailed: function (inSender, inResponse) {
        /*jslint unparam: true */
        this.refreshing = false;
        this.setActive(this.active - 1);
        this.log("Failed to download: ", inResponse, " type: ", typeof inResponse);
        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
        }
    },

    /*****************************************************************************************
     ******************* Article Content *****************************************************
     *****************************************************************************************/
    getArticleContent: function (articleModel) {
        var req, data;

        if (this.authModel.get("needLogin") || articleModel.downloadingContent) {
            return;
        }
        articleModel.downloadingContent = true;

        this.setActive(this.active + 1);
        data = {
            consumer_key: this.consumerKey,
            access_token: this.authModel.get("accessToken"),
            images: 1,
            videos: 1,
            refresh: articleModel.get("content") === undefined ? 0 : 1,
            url: articleModel.get("resolved_url"),
            output: "json"
        };

        req = new moboreader.Ajax({url: "https://text.readitlater.com/v3beta/text"});
        req.go(data);

        req.response(this.bindSafely("gotArticleContent", articleModel));
        req.error(this.bindSafely("downloadContentFailed", articleModel));
    },
    gotArticleContent: function (articleModel, inSender, inResponse) {
        /*jslint unparam: true, regexp: true */
        this.log("Got content: ", inResponse);
        this.setActive(this.active - 1);
        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
            return;
        }

        articleModel.downloadingContent = false;
        //remove links from images:
        var content = inResponse.article;
        //content = content.replace(/<a href=[^<]+?><div/gim, "<div");
        //content = content.replace(/div><\/a>/gim, "div>");

        //add . to end of headings:
        content = content.replace(/([^.?!])\s*?<\s*?\/(h\d|strong|p)\s*?>/gim, "$1<span style=\"display:none;\">.</span></$2>");

        if (!articleModel.attributes || !articleModel.previous) {
            this.log("Article was already destroyed.");
        } else {
            articleModel.set("host", inResponse.host);
            articleModel.commit();

            if (moboreader.Prefs.downloadSpritzOnUpdate) {
                moboreader.Spritz.downloadSpritzModel(articleModel, content);
            } else {
                enyo.Signals.send("onArticleDownloaded", {
                    id: articleModel.get(articleModel.primaryKey),
                    content: {web: content},
                    model: articleModel
                });
            }
        }
    },
    downloadContentFailed: function (inSender, inResponse, articleModel) {
        /*jslint unparam: true */
        articleModel.downloadingContent = false;
        this.setActive(this.active - 1);
        this.log("Failed to download: ", inResponse, " for ", articleModel);
        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
        }
        enyo.Signals.send("onArticleDownloaded", {
            id: articleModel.get(articleModel.primaryKey),
            content: {},
            model: articleModel
        });
    },

    /*****************************************************************************************
     ******************* Article Actions *****************************************************
     *****************************************************************************************/
    addArticle: function (url, collection) {
        var req,
            actions = this.authModel.get("unsyncedActivities"),
            action = {action: "add", url: url, time: Math.round(Date.now() / 1000)};

        if (this.authModel.get("needLogin")) {
            return;
        }

        this.setActive(this.active + 1);
        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/add",
            method: "POST",
            postBody: {
                consumer_key: this.consumerKey,
                access_token: this.authModel.get("accessToken"),
                output: "json",
                url: url
            }
        });
        req.go();
        this.addNoDuplicates(actions, action);

        req.response(this.actionSuccess.bind(this, collection, null, [action]));
        req.error(this.bindSafely("actionFailed", {}, null));
    },
    articleAction: function (articleModel, action, collection, callback) {
        var req, actionObj, actions = this.authModel.get("unsyncedActivities");

        if (this.authModel.get("needLogin")) {
            return;
        }

        this.setActive(this.active + 1);
        if (articleModel && action) {
            actionObj = {
                action: action,
                item_id: articleModel.get("item_id"),
                time: Math.round(Date.now() / 1000)
            };
            this.addNoDuplicates(actions, actionObj);
        }
        this.log("Action: ", actionObj, " actions: ", actions);

        //sending adds here, too, will work.
        //they will have invalid item_id but action "add" and url field.
        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/send",
            method: "POST",
            postBody: {
                consumer_key: this.consumerKey,
                access_token: this.authModel.get("accessToken"),
                output: "json",
                actions: actions
            }
        });
        req.go();

        req.response(this.actionSuccess.bind(this, collection, callback, actions.slice())); //copy actions array here
        req.error(this.bindSafely("actionFailed", actionObj, callback));
    },
    addNoDuplicates: function (actions, action) {
        var i, key = "item_id";
        if (!action || !action.action) {
            console.error("Action undefined.");
            return;
        }
        if (action.action === "add") {
            key = "url";
        }
        if (!action[key]) {
            console.error("Need url or item_id.");
            return;
        }

        //check if this action is already happening:
        for (i = actions.length - 1; i >= 0; i -= 1) {
            if (actions[i][key] === action[key] &&
                    actions[i].action === action.action) {
                //keep the newer one.
                actions.splice(i, 1);
            }
        }
        actions.push(action);
        this.storeModel(); //kind of a hack. But want to be sure that it is always stored.
    },
    removeFinishedActions: function (remActions) {
        var actions = this.authModel.get("unsyncedActivities");
        remActions.forEach(function (action) {
            var index = actions.indexOf(action);
            if (index < 0) {
                console.warn("Action " + JSON.stringify(action) + " not found in model. Already done?");
            } else {
                actions.splice(index, 1);
            }
        });
    },
    getRecFromCollection: function (id, collection) {
        var result;
        collection.records.forEach(function (rec) {
            var attr = rec.attributes;
            if (!attr) {
                attr = rec;
            }
            if (!attr.item_id) {
                console.error("Got rec without id: ", rec);
                return;
            }
            if (attr.item_id === id) {
                if (result) {
                    console.log("DUPLICATE! ", rec, " === ", result);
                }
                result = rec;
            }
        });

        if (!result) {
            console.error("No item found for " + id);
        }

        return result || { set: function () { return undefined; }, destroy: function () { return undefined; } };
    },
    processActions: function (collection, objs, results) {
        var arr = [], articleModel;
        if (!results) {
            results = [];
        }

        objs.forEach(function (obj, index) {
            var result = results[index], rec;
            //handle add. On add "results" is only one object.
            if (obj.action === "add" && !obj.item_id && (!result || !result.item_id)) {
                result = results;
            }
            if (!result) {
                console.log(obj.action + " of " + obj.item_id + " failed. Will retry later.");
                return;
            }

            if (obj.action !== "add") {
                rec = this.getRecFromCollection(obj.item_id, collection);
            }

            switch (obj.action) {
            case "add":
                //try to add. Not sure that really works. Add call wants item id??
                this.log("Adding: ", result);
                articleModel = collection.addRightIndex(result);
                this.log("Resulting model: ", articleModel);
                ArticleContentHandler.checkAndDownload(articleModel, this);
                break;
            case "readd":
                this.log("Adding back: " + JSON.stringify(result));
                articleModel = collection.addRightIndex(result);
                ArticleContentHandler.checkAndDownload(articleModel, this);
                break;
            case "favorite":
                rec.set("favorite", 1);
                break;
            case "unfavorite":
                rec.set("favorite", 0);
                break;
            case "archive":
                rec.set("status", "1");
                rec.set("archived", true);
                rec.destroy({
                    success: function () { console.log("Destruction of " + obj.item_id + " success."); }
                });
                arr.push(rec);
                break;
            case "delete":
                rec.set("status", "2");
                rec.set("archived", true);
                rec.destroy({
                    success: function () { console.log("Destruction of " + obj.item_id + " success."); }
                });
                arr.push(rec);
                break;
            default:
                this.log("Action ", obj.action, " not understood??");
                break;
            }
        }.bind(this));
        return arr;
    },
    actionSuccess: function (collection, callback, actions, inSender, inResponse) {
        /*jslint unparam: true */
        var i, successfulActions = [], remActions;
        this.log("Action succeeded: ", inResponse);
        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
            this.setActive(this.active - 1);
            return;
        }

        remActions = this.processActions(collection, actions, inResponse.action_results || inResponse.item);

        if (inResponse.action_results) {
            for (i = actions.length - 1; i >= 0; i -= 1) {
                if (inResponse.action_results[i]) {
                    successfulActions.push(actions[i]);
                    actions.splice(i, 1);
                }
            }
        } else if (inResponse.status === 1) {
            successfulActions = actions;
        }

        this.removeFinishedActions(successfulActions);
        this.storeModel();
        if (remActions && remActions.length > 0) {
            this.log("Removing: ", remActions);
            collection.remove(remActions);
        }
        collection.storeWithChilds();
        this.setActive(this.active - 1);

        if (callback) {
            callback();
        }
    },
    actionFailed: function (action, callback, inSender, inResponse) {
        /*jslint unparam: true */
        this.log("Article Action failed: ", inResponse);

        if (action) {
            var actions = this.authModel.get("unsyncedActivities");

            this.addNoDuplicates(actions, action);
            this.log("Now have undone actions: ", this.authModel.get("unsyncedActivities"));
            this.storeModel();
        }
        this.setActive(this.active - 1);

        if (this.checkForUnauthorized(inResponse)) {
            this.log("Not authorized? => start auth.");
            this.logout();
        }

        if (callback) {
            callback();
        }
    }
});
