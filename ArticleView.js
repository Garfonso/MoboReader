/*global
    App,
    ArticleStorage,
    jo,
    joButton,
    joCard,
    joFlexrow,
    joHTML,
    joScroller,
    joTitle,
    joToolbar
*/

function ArticleView(article) {
    "use strict";

    this.article = article;
}

ArticleView.prototype.buildHTML = function () {
    "use strict";
    /*jslint newcap: true */
    var parts = [], key;
    /*parts.push(this.article.body);
    if (this.article.images) {
        for (key in this.article.images) {
            if (this.article.images.hasOwnProperty(key)) {
                parts.push('<img src="' + this.article.images[key].src + '" style="max-width:80%">');
            }
        }
    }*/
    //this.HTML = new joHTML(parts.join(""));
    this.HTML = new joHTML(ArticleStorage.getArticleContent(this.article));
    this.HTML.setStyle({width: "90%"});
    return this.HTML;
};

ArticleView.prototype.getCard = function () {
    "use strict";
    /*jslint newcap: true */
    this.card = new joCard([
        new joScroller([
            this.title = new joTitle(this.article.title),
            this.buildHTML()]),
        this.toolbar = new joToolbar(new joFlexrow([
            this.backBtn   = new joButton("Back"),
            this.markread  = new joButton("Mark read"),
            this.favorite  = new joButton("Mark favorite"),
            this.deleteBtn = new joButton("Delete"),
            this.menuBtn   = new joButton("...")
        ]))
    ]);

    if (jo.getPlatform() === "webos") {
        this.backBtn.setStyle({display: "none"});
    }

    this.backBtn.selectEvent.subscribe(function () {
        App.stack.pop(); //pop ourself. Yeah. :)
    });

    return this.card;
};

