/*global
    ArticleStorage,
    joDOM,
    joLabel,
    joList,
    log
*/

//article list
var ArticleList = function () {
    "use strict";
    /*jslint newcap: true */
    joList.apply(this, arguments);

    this.setDefault(new joLabel("No articles in list. Please press refresh."));
    this.setReadOnly(true);

    ArticleStorage.loadDoneEvent.subscribe(this.updateArticles.bind(this));
};

ArticleList.extend(joList, {
    formatItem: function (data, index) {
        "use strict";
        //TODO: build list item here!!
        //log("formatItem: ", data, index);
        var element = joDOM.create("jolistitem"),
            host,
            parts = [];

        element.setAttribute("index", index);

        element.innerHTML = "";

        parts.push('<table><tbody><tr><td rowspan="2" class="imagecell" ');
        if (data.images && data.images["1"]) {
            parts.push('style="background-image: url(' + data.images["1"].src + ');background-size: cover, auto auto;background-position: center center, center center;"');
        }
        parts.push('></td><td class="textcell">');
        parts.push('<h2>' + data.title + '</h2>');
        parts.push('</td></tr><tr><td class="hostcell">');
        parts.push(data.host || "");
        parts.push('</td></tr></tbody></table>');
        element.innerHTML = parts.join('');
        return element;
    },

    //used for sorting.
    compareItems: function (a, b) {
        "use strict";
        //Sort by date, ascending / descending. Yeah :)
        log("compareItems: ", a, b);
        return 1;
    },

    updateArticles: function (data) {
        "use strict";
        log("Updating articles...");
        this.setData(ArticleStorage.getArticleList());
        this.refresh();
    }
});
