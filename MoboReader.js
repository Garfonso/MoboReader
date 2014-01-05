/*jslint newcap: true */
/*global
    log,
    PocketApi,
    ArticleList,
    ArticleStorage,
    ArticleView,
    jo,
    joButton,
    joCache,
    joCard,
    joContainer,
    joCSSRule,
    joDefer,
    joDialog,
    joDivider,
    joFlexcol,
    joFlexrow,
    joHTML,
    joLabel,
    joNavbar,
    joScreen,
    joScroller,
    joStack,
    joStackScroller,
    joTitle,
    joToolbar
*/

//use joGesture.backEvent to get from article to unread. Make use of joGesture.forwardEvent somewhere?
//see if we can get functionality similar to by swipe to delete in Mojo. Maybe even different stuff on left/right? Or multiple buttons?
//handle link clicks: http://joapp.com/forums/index.php?p=/discussion/75/links-in-johtml-dont-work See if that works. :) => see also joHTML docu/code.
//try var x = new joButton('<img src="go.png">'); someday...or learn CSS and use background property...

var App = {
    /* kind of constructor */
    init: function () {
        "use strict";
        /*jslint newcap: true */

        //initialize stuff:
        jo.load();
        //LocalStorageWrapper.clear();
        PocketApi.init();
        ArticleStorage.init();

        //list for unread articles.
        this.unreadList = new ArticleList();

        // create our view card, notice we're nesting widgets inline
        this.unreadCard = new joCard([
            this.title = new joTitle("Unread articles"),
            new joScroller([
                this.unreadList
            ]).setStyle("unread_scroller"),
            this.toolbar = new joToolbar(new joFlexrow([
                this.refreshButton = new joButton('<img src="images/refresh-icon.png" class="buttonIcon">')
            ]))
        ]);

        joDefer(function () {
            var style1 = new joCSSRule('jocard > joscroller > *:last-child:after { content: ""; display: block; height: ' + (App.toolbar.container.offsetHeight) + 'px; top:' + App.title.container.offsetWidth + 'px }'),
                style2 = new joCSSRule('.unread_scroller { top:' + App.title.container.offsetHeight + 'px ! important; }');
		}, this);

        // setup our stack and screen
        this.screen = new joScreen(new joFlexcol(
            this.stack = new joStack()
        ));

        //this.navbar.setStack(this.stack);

        // put the card on our view stack
        this.stack.push(this.unreadCard);

        //attache event listeners:
        this.refreshButton.selectEvent.subscribe(this.refreshClicked.bind(this));
        this.unreadList.selectEvent.subscribe(this.articleSelected.bind(this));
    },

    articleSelected: function (id) {
        "use strict";
        //TODO: select article view of right article here!
        log("unread selected:", id);
        joDefer(App.unreadList.deselect, App.unreadList, 400);

        var article = App.unreadList.getData()[id];
        joDefer(function createArticleView() {
            var av = new ArticleView(article);
            App.stack.push(av.getCard());
        });
    },

    refreshClicked: function (e) {
        "use strict";

        App.toolbar.refresh();
        joDefer(PocketApi.startSync, PocketApi, 10);
    }
};
