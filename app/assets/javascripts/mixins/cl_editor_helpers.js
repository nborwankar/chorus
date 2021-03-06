chorus.Mixins.ClEditor = {
    makeEditor: function($container, controlSelector, inputName, options) {
        var controls = ["bold", "italic", "bullets", "numbers", "link", "unlink"];

        _.each(controls, function(control, i) {
            var $controlContainer = $container.find(controlSelector);
            $controlContainer.append($('<a class="'+ control +'" href="#"></a>').text(t("workspace.settings.toolbar."+ control)));
            if(i < controls.length - 1) {
                $controlContainer.append($('<span>|</span>'));
            }
            $container.find("a." + control).unbind("click").bind("click", _.bind(this["onClickToolbar"+ _.capitalize(control)], $container));
        }, this);

        options = options || {};
        var editorOptions = _.extend(options, {controls: "bold italic | bullets numbering | link unlink"});
        return $container.find("textarea[name='"+ inputName +"']").cleditor(editorOptions)[0];

    },

    onClickToolbarBold: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Bold']").click();
    },

    onClickToolbarItalic: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Italic']").click();
    },

    onClickToolbarBullets: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Bullets']").click();
    },

    onClickToolbarNumbers: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Numbering']").click();
    },

    onClickToolbarLink: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Insert Hyperlink']").click();
        e.stopImmediatePropagation();
    },

    onClickToolbarUnlink: function(e) {
        e && e.preventDefault();
        this.find(".cleditorButton[title='Remove Hyperlink']").click();
    },

    getNormalizedText: function($textarea) {
        return $textarea.val()
            .replace(/(<div><br><\/div>)+$/, "")
            .replace(/^<br>$/, "");
    }
};
