enyo.kind({
    name: "moboreader.ArticleListItem",
    style: "height: 30px;",
    components: [
        {
            name: "articleImage",
            kind: "enyo.Image",
            sizing: "constrain",
            style: "width: 30px; height: 30px; position: absolute; left: 0px"
        },
        {
            name: "articleTitle",
            content: "empty?",
            style: "width: 100%; height: 30px; postion:relative; padding: 0px 5px 0px 35px;"
        }
    ],
    bindings: [
        {from: ".model.title", to: ".$.articleTitle.content"},
        {from: ".model.image_src", to: ".$.articleImage.src"}
    ]
});
