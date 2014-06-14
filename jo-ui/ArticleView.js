/*global
    clearTimeouts,
    debug,
    log,
    App,
    ArticleStorage,
    jo,
    joButton,
    joCard,
    joCSSRule,
    joDefer,
    joFlexrow,
    joHTML,
    joScroller,
    joSlider,
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

    /*parts.push('<div id="guide_top">');
    parts.push('――――――――――<span id="notch">&#1092;</span>―――――――――――');
    parts.push('</div>');

    parts.push('<div id="spritz_result">Choose a WPM to start.</div>');

    parts.push('<div id="guide_bottom">');
    parts.push('――――――――――――――――――――――');
    parts.push('</div>');

    this.HTML = new joHTML(parts.join(""));*/


    this.HTML.setStyle({width: "90%", margin: "100 5% 0 5%"});
    //this.HTML.setStyle({height: "100%"});
    this.HTML.setStyle({display: "block"});
    //this.HTML.setStyle({"font-size": "1em"});
    return this.HTML;
};

ArticleView.prototype.getCard = function () {
    "use strict";
    /*jslint newcap: true */
    this.card = new joCard([
        this.title = new joTitle(this.article.title).setStyle({width: "100%"}),
        new joScroller([
            this.buildHTML()
        //this.slider = new joSlider(0).setRange(0, 1000).setStyle({width: "80%", display: "block"}),
        ]).setStyle("article_scroller").setStyle({"text-align": "center"}),
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

    joDefer(function () {
        debug("Title height: " + this.title.container.offsetHeight);
        debug("Toolbar height: " + this.toolbar.container.offsetHeight);
        //this.HTML.setStyle({top: this.title.container.offsetHeight + 'px ! important;' });
        var style1 = new joCSSRule('jocard > joscroller > *:last-child:after { content: ""; display: block; height: ' + (this.toolbar.container.offsetHeight) + 'px !important; top:' + this.title.container.offsetWidth + 'px; height: 100% }'),
            style2 = new joCSSRule('.article_scroller { top:' + this.title.container.offsetHeight + 'px ! important; }');
    }, this);

    /*this.slider.changeEvent.subscribe(function (value) {
        if (value < 200) {
            value = 0;
        }
        log("New Value: " + value);

        //clearTimeouts();
        log("Article: ", this.article);
        var content = ArticleStorage.getArticleContent(this.article);
        content = content.replace(/<.*?>/gmi, "");
        log("Content: " + JSON.stringify(content));

    }.bind(this));
*/
    return this.card;
};

