/*global joList, joLog*/

//article list
var ArticleList = function () {
	"use strict";
	joList.call(this);
};

ArticleList.extend(joList, {
	formatItem: function (data, index) {
		"use strict";
		//TODO: build list item here!!
		joLog("formatItem: ", data, index);
	},

	//used for sorting.
	compareItems: function (a, b) {
		"use strict";
		//Sort by date, ascending / descending. Yeah :)
		joLog("compareItems: ", a, b);
		return 1;
	}
});