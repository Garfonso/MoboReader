//article list

ArticleList = function () {
	joList.call(this);
};

ArticleList.extend(joList, {
	formatItem: function (data, index) {
		//TODO: build list item here!!
		joLog("formatItem: ", data, index);
	},
	
	//used for sorting.
	compareItems: function (a, b) {
		//Sort by date, ascending / descending. Yeah :)
		joLog("compareItems: ", a, b);
		return 1;
	},
});