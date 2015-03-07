/*jslint sloppy: true, browser: true, devel: true */
/*global enyo, moboreader*/

enyo.singleton({
	name: "ArticleContentHandler",
	published: {
		dbActivities: 0,
		isWebos: true
	},
	activityId: 0,
	storage: {}, //used if not webOS.
	needDL: [],
	checkQueue: [],

	//signals:
	//onArticleOpReturned => success true/false, activityId, content { web, spritz} (optional), id = articleId

	components: [
		{
			kind: "enyo.Signals",
			onArticleDownloaded: "contentDownloaded"
		}
	],

	debugOut: function (msg) {
		//noop or console.error for on device debugging.
		console.log(msg);
		return undefined;
	},

	create: function () {
		this.inherited(arguments);
		this.log("Have PalmSystem: " + (!!window.PalmSystem));
		this.setIsWebos(!!window.PalmSystem);
	},

	storeArticle: function (articleModel, webContent, spritzContent, images) {
		this.activityId += 1;

		this.setDbActivities(this.dbActivities + 1);
		this.privateGenericSend(articleModel, "storeArticleContent", {
			content: {
				web: webContent,
				spritz: spritzContent,
				images: images
			},
			activityId: this.activityId
		});
		return this.activityId;
	},

	privateGenericSend: function (articleModel, method, inParams) {
		var params = inParams || {}, req;

		if (articleModel) {
			if (articleModel.get) {
				params.id = articleModel.get(articleModel.primaryKey);
			} else {
				params.id = articleModel.item_id;
			}
		}

		if (!params.activityId) {
			this.activityId += 1;
			params.activityId = this.activityId;
			this.setDbActivities(this.dbActivities + 1);
		}

		if (this.isWebos) {
			req = new enyo.ServiceRequest({
				service: "palm://info.mobo.moboreader.service",
				method: method
			});
			req.response(this.dbActivityComplete.bind(this, params.activityId, params.id, method, params.onSuccess));
			req.error(this.dbError.bind(this, params.activityId, params.id, method, params.onFailure));

			req.go(params);
		} else {
			if (params.content) {
				this.storage[params.id] = params.content;
			}
			setTimeout(function (activityId) {
				this.dbActivityComplete(activityId, params.id, method, this, {
					success: method === "articleContentExists" ? !!(params.id && this.storage[params.id]) : true,
					id: params.id,
					content: params.id ? this.storage[params.id] : undefined,
					activityId: activityId
				});
			}.bind(this, this.activityId), 100);
		}
		return this.activityId;
	},
	getContent: function (articleModel, params) {
		return this.privateGenericSend(articleModel, "getArticleContent", params);
	},
	articleContentExists: function (articleModel, params) {
		if (undefined === params.requireSpritz) {
			params.requireSpritz = moboreader.Prefs.downloadSpritzOnUpdate;
		}
		return this.privateGenericSend(articleModel, "articleContentExists", params);
	},
	deleteContent: function (articleModel) {
		return this.privateGenericSend(articleModel, "deleteArticleContent");
	},
	wipe: function () {
		return this.privateGenericSend(null, "wipeStorage");
	},

	//============================ checkAndDownload ======
	checkAndDownload: function (articleModel, api) {
		var id = articleModel.get(articleModel.primaryKey);
		if (!this.checking) {
			this.checking = id;
			this.debugOut("Checking: " + id);
			this.articleContentExists(articleModel, {
				onSuccess: function (inEvent) {
					if (!inEvent.success) {
						this.debugOut("Need download: " + id);
						articleModel.set("contentAvailable", false);
						this.needDL.push({model: articleModel, api: api});
					} else {
						this.log("Article ok, don't download.");
						articleModel.set("contentAvailable", true);
					}
					this.downloadNext();
				}.bind(this)
			});
		} else {
			this.debugOut("Checking LATER: " + id + " currently doing: " + this.checking);
			this.checkQueue.unshift({
				model: articleModel,
				api: api
			});
		}
	},

	downloadMultiple: function (models, api, inEvent) {
		this.debugOut("Got multiple result: " + JSON.stringify(inEvent.idsStatus));
		function getModelById(id) {
			var i;
			for (i = 0; i < models.length; i += 1) {
				if (models[i].get(models[i].primaryKey) === id) {
					return models[i];
				}
			}
		}

		var status = inEvent.idsStatus;
		if (status) {
			Object.keys(status).forEach(function processContentStatus(id) {
				var model = getModelById(id);
				if (!model) {
					this.warn("No model for id " + id);
					return;
				}
				if (status[id].all) {
					model.set("contentAvailable", true);
					this.debugOut(id + " all there, no need to dl.");
				} else {
					model.set("contentAvailable", false);
					this.needDL.push({
						model: model,
						api: api,
						onlyImages: (status[id].web && status[id].spritz) //only need images, call service to handle that.
					});
				}
			}.bind(this));
		}

		this.downloadNext();
	},
	checkAndDownloadMultiple: function (ids, models, api) {
		this.privateGenericSend(null, "articleContentExists", {
			ids: ids,
			onSuccess: this.downloadMultiple.bind(this, models, api),
			onFailure: function () { console.error("Failed to check events for required downloads."); }
		});
	},

	contentDownloaded: function (inSender, inEvent) {
		/*jslint unparam: true */
		this.debugOut("Download finished: " + inEvent.model.get(inEvent.model.primaryKey));
		inEvent.model.set("contentAvailable", !!(inEvent.content && inEvent.content.web && (inEvent.content.spritz || !moboreader.Prefs.downloadSpritzOnUpdate)));
		this.storeArticle(inEvent.model, inEvent.content.web, inEvent.content.spritz, inEvent.content.images);

		if (inEvent.model.get(inEvent.model.primaryKey) === this.downloading) {
			this.downloading = false;
		}

		this.downloadNext();
	},

	downloadNext: function () {
		if (this.downloading) {
			this.debugOut("Already downloading " + this.downloading + ". Waiting downloads: " + this.needDL.length + ".");
			return;
		}
		if (this.needDL.length > 0) {
			var obj = this.needDL.shift();
			if (obj.onlyImages) {
				this.privateGenericSend(obj.model, "downloadImages");
			} else {
				obj.api.getArticleContent(obj.model);
			}
			this.downloading = obj.model.get(obj.model.primaryKey);
			this.debugOut("Download started: " + this.downloading);
		} else {
			this.debugOut("all downloads finished.");
			this.downloading = false;
		}
	},
	//this will mix queue a bit up.. hm..
	sendNext: function (doneId, method) {
		if (doneId === this.checking && method === "articleContentExists") {
			this.checking = false;
		}
		if (doneId === this.downloading && method === "downloadImages") {
			this.downloading = false;
		}
		var req = this.checkQueue.shift();
		if (req) {
			this.checkAndDownload(req.model, req.api);
		} else {
			this.downloadNext();
		}
	},
	dbActivityComplete: function (activityId, id, method, callback, inSender, inEvent) {
		/*jslint unparam: true */
		this.debugOut("Incomming response: " + inEvent.success + " for id " + activityId);
		this.setDbActivities(this.dbActivities - 1);
		inEvent.activityId = activityId;
		inEvent.id = id;
		inEvent.method = method;
		enyo.Signals.send("onArticleOpReturned", inEvent);
		this.sendNext(id, method);
		if (typeof callback === "function") {
			callback(inEvent);
		}
	},
	dbError: function (activityId, id, method, callback, inSender, inEvent) {
		/*jslint unparam: true */
		this.log("dbFailed: " + JSON.stringify(inEvent));
		this.setDbActivities(this.dbActivities - 1);
		enyo.Signals.send("onArticleOpReturned", {
			id: id,
			success: false,
			method: method,
			activityId: activityId
		});
		this.sendNext(id, method);
		if (typeof callback === "function") {
			callback(inEvent);
		}
	}
});
