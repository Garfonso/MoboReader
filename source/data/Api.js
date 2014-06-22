enyo.kind({
    name: "moboreader.AuthModel",
    kind: "enyo.Model",
    defaultSource: "local",
    defaults: {
        needLogin: true,
        accessToken: "",
        lastSync: 0,
        username: "", //only stored for informational value, like showing the user what user is logged in.
        unsyncedActivities: [],
        offset: 0
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
        authModel: "",
        active: 0
    },

    authToken: false, //only used during authentication
    redirectUri: "http://www.mobo.info/login_success.html",
    redirectUriHost: "www.mobo.info",
    consumerKey: "21005-ded74cb03e611ba462973e00",

    events: {
        onNeedAuth: "",
        onAuthorized: "",
        onAuthFailed: "",
        onStartActivity: "",
        onEndActivity: ""
    },


    create: function () {
        this.inherited(arguments);

        this.authModel = new moboreader.AuthModel({id: "authModel"});
        this.authModel.fetch({
            success: this.bindSafely("modelFetched"),
            fail: this.bindSafely("modelFetched")
        });
    },
    modelFetched: function () {
        if (this.authModel.get("needLogin")) {
            setTimeout(function () {
                this.doNeedAuth();
                this.startAuth();
            }.bind(this), 1000);
        } else {
            this.log("Adding change listener to model");
            this.authModel.addListener("change", this.bindSafely("storeModel"));
        }
    },
    storeModel: function () {
        if (!this.storing) {
            this.storing = true;
            this.log("Storing model.");
            this.authModel.commit({
                success: this.bindSafely("modelStored"),
                fail: this.bindSafely("modelStored")
            });
        } else {
            this.log("Already storing... wait..");
            setTimeout(this.bindSafely("storeModel"), 1000);
        }
    },
    modelStored: function () {
        this.log("Store came back.");
        this.storing = false;
    },

    dummy: function () { },

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

        req.go();
        req.response(this.bindSafely("gotAuthToken"));
        req.error(this.bindSafely("authError"));
    },
    gotAuthToken: function (inSender, inResponse) {
        this.log("Got response: ", inResponse);
        this.authToken = inResponse.code;
        var authWin = window.open("https://getpocket.com/auth/authorize?request_token=" + this.authToken + "&redirect_uri=" + this.redirectUri);

        authWin.onload = function () {
            this.log("location: ", authWin.location);
            if (authWin.location && authWin.location.host === this.redirectUriHost) {
                authWin.close();
                this.finishAuth();
            }
        }.bind(this);
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
        this.log("auth finished: ", inResponse);
        this.authModel.set("username", inResponse.username);
        this.authModel.set("accessToken", inResponse.access_token);
        this.authModel.set("needLogin", false);
        this.authModel.set("lastSync", 0);
        this.authModel.set("unsyncedActivities", []);
        this.storeModel();

        this.authModel.addListener("change", this.bindSafely("storeModel"));
        this.doAuthorized({"username": inResponse.username});
    },
    authError: function (inSender, inResponse) {
        this.log("Auth error!! ", inResponse);
        this.doAuthFailed({error: true});
    },

    /*****************************************************************************************
     ******************* Article Sync ********************************************************
     *****************************************************************************************/
    downloadArticles: function (collection, slow) {
        this.authModel.set("offset", 0);
        if (slow) {
            this.authModel.set("lastSync", 0);
        }
        this.added = 0;
        this.downloadArticlesInner(collection, slow);
    },
    downloadArticlesInner: function (collection) {
        var req, data;

        this.setActive(this.active + 1);
        this.doStartActivity();

        data = {
            consumer_key: this.consumerKey,
            access_token: this.authModel.get("accessToken"),
            since: this.authModel.get("lastSync"),
            detailType: "complete",
            //contentType: "article",
            sort: moboreader.Prefs.sortOrder || "newest",
            count: 10,
            offset: this.authModel.get("offset")
        };
        this.authModel.set("offset", this.authModel.get("offset") + 10);

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/get",
            method: "POST",
            postBody: data
        });

        req.go();

        req.response(this.bindSafely("gotArticles", collection));
        req.error(this.bindSafely("downloadFailed"));
    },
    gotArticles: function (collection, inSender, inResponse) {
        var articles = [], key, list = inResponse.list, article, rec, oldLength;

        this.log("Got response: ", inResponse);

        if (list) {
            this.log("Got list of new items...");
            for (key in list) {
                if (list.hasOwnProperty(key)) {
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
                        articles.push(article);
                    }
                }
            }

            this.log("Now have", articles.length, "new items.");
            if (articles.length && collection.length < moboreader.Prefs.maxArticles) {
                oldLength = collection.length;
                collection.merge(articles);
                this.added += collection.length - oldLength;

                this.downloadArticlesInner(collection);
            } else if (this.authModel.get("lastSync") !== 0 && collection.length < moboreader.Prefs.maxArticles) {
                this.authModel.set("lastSync", 0); //get some more articles.
                this.downloadArticlesInner(collection);
            } else {
                collection.storeWithChilds(this.added > 0); //tell if we added articles => then a sort will happen.
                this.authModel.set("lastSync", inResponse.since || 0);

                collection.updateArticleContent(this);

            }
        }

        this.setActive(this.active - 1);
    },

    /*****************************************************************************************
     ******************* Article Content *****************************************************
     *****************************************************************************************/
    getArticleContent: function (articleModel) {
        var req, data;

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
        req.error(this.bindSafely("downloadFailed"));
    },
    gotArticleContent: function (articleModel, inSender, inResponse) {
        this.log("Got content: ", inResponse);

        //remove links from images:
        var content = inResponse.article;
        content = content.replace(/<a href=[^<]+?><div/gim, "<div");
        content = content.replace(/div><\/a>/gim, "div>");

        articleModel.set("content", content);
        articleModel.set("host", inResponse.host);
        articleModel.commit();

        if (moboreader.Prefs.downloadSpritzOnUpdate) {
            moboreader.Spritz.downloadSpritzModel(articleModel);
        }

        this.setActive(this.active - 1);
    },

    /*****************************************************************************************
     ******************* Article Actions *****************************************************
     *****************************************************************************************/
    addArticle: function (url, collection) {
        var req, actions = this.authModel.get("unsyncedActivities");

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
        this.addNoDuplicates(actions, {idem_id: "add", action: "add"});

        req.response(this.bindSafely("actionSuccess", collection));
        req.error(this.bindSafely("actionFailed", {}));
    },
    articleAction: function (articleModel, action, collection) {
        var req, actionObj, actions = this.authModel.get("unsyncedActivities");

        this.setActive(this.active + 1);
        actionObj = {
            action: action,
            item_id: articleModel.get("item_id"),
            time: Math.round(Date.now() / 1000)
        };
        this.addNoDuplicates(actions, actionObj);
        this.log("Action: ", actionObj);

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

        req.response(this.bindSafely("actionSuccess", collection));
        req.error(this.bindSafely("actionFailed", actionObj));
    },
    addNoDuplicates: function (actions, action) {
        var i;
        //check if this action is already happening:
        for (i = actions.length - 1; i >= 0; i -= 1) {
            if (actions[i].item_id === action.item_id &&
                actions[i].action === action.action) {
                //keep the newer one.
                actions.splice(i, 1);
            }
        }
        actions.push(action);
    },
    getRecFromCollection: function (id, collection) {
        var result;
        collection.records.forEach(function (rec) {
            if (!rec.attributes) {
                console.log("Got element with 0 attributes: ", rec);
                return;
            }
            if (rec.attributes.item_id === id) {
                if (result) {
                    console.log("DUPLICATE! ", rec, " === ", result);
                }
                result = rec;
            }
        });

        if (!result) {
            console.log("No item found for ", id);
        }

        return result || { set: function () {}, destroy: function () {} };
    },
    processActions: function (collection, objs, results) {
        var arr = [];
        if (!results) {
            results = [];
        }

        objs.forEach(function (obj, index) {
            var result = results[index], rec;
            //handle add.
            if (obj.action === "add" && !obj.item_id) {
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
                    collection.add(result);
                    break;
                case "readd":
                    this.log("Adding back: " + JSON.stringify(result));
                    collection.add(result);
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
    actionSuccess: function (collection, inSender, inResponse) {
        var actions = this.authModel.get("unsyncedActivities"), i, successfulActions = [], remActions;
        this.log("Action succeeded: ", inResponse);

        remActions = this.processActions(collection, actions, inResponse.action_results || inResponse.item);

        if (inResponse.status === 1) {
            //all actions succeeded!
            this.authModel.set("unsyncedActivities", []);
        } else if (inResponse.action_results) {
            for (i = actions.length - 1; i >= 0; i -= 1) {
                if (inResponse.action_results[i]) {
                    successfulActions.push(actions[i]);
                    actions.splice(i, 1);
                }
            }
            if (successfulActions.length > 0) {
                remActions = this.processActions(collection, successfulActions);
            }
        }

        this.storeModel();
        if (remActions && remActions.length > 0) {
            this.log("Removing: ", remActions);
            collection.remove(remActions);
        }
        collection.storeWithChilds();
        this.setActive(this.active - 1);
    },
    actionFailed: function (action, inSender, inResponse) {
        this.log("Article Action failed: ", inResponse);
        var actions = this.authModel.get("unsyncedActivities");

        this.addNoDuplicates(actions, action);
        this.storeModel();
        this.setActive(this.active - 1);
    },

    //general failure.
    downloadFailed: function (inSender, inResponse) {
        this.log("Failed to download: ", inResponse);
        this.setActive(this.active - 1);
    }
});
