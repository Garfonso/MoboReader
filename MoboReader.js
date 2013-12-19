/*jslint newcap: true */
/*global
    log,
    PocketApi,
    ArticleList,
    jo,
    joButton,
    joCache,
    joCard,
    joDialog,
    joDivider,
    joFlexcol,
    joHTML,
    joLabel,
    joNavbar,
    joScreen,
    joStack,
    joStackScroller,
    joTitle,
    joToolbar
*/

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
        this.unreadCard = new joCard(new joFlexcol([
            this.title = new joTitle("Unread articles"),
            new joDivider(),
            new joContainer(new joScroller(this.unreadList)),
//            new joDivider(),
            this.toolbar = new joToolbar(new joFlexrow([
                this.refreshButton = new joButton("Refresh"),
                //new joImage("images/refresh-icon.png").setStyle("mrIcon"),
                ""
            ]))
        ]));

        // setup our stack and screen
        this.screen = new joScreen(new joFlexcol([
            this.stack = new joStackScroller(),
        ]));

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
    },

    refreshClicked: function (e) {
        "use strict";

        App.toolbar.refresh();
        joDefer(PocketApi.startSync, PocketApi, 10)
    }
};
