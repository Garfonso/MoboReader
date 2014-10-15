enyo.kind({
    name: "PickerWithHintAndBinding",
    style: "overflow: hidden; padding: 10px;", //overflow used to end floating
    published: {
        inVal: "",

        hint: "",
        pickerComponents: []
    },
    bindings: [
        { from: ".hint", to: ".$.hint.content" },
        { from: ".inVal", to: ".$.picker.selected", oneWay: false, transform: function (val, dir) {
            if (dir === "target") {
                return val.value;
            }

            var i, controls = this.$.picker.getClientControls();
            for (i = 0; i < controls.length; i += 1) {
                if (controls[i].value === val) {
                    return controls[i];
                }
            }

            if (val) {
                return this.$.picker.createComponent({content: String(val), value: val});
            }
        }}
    ],
    components: [
        {
            style: "float: left;",
            name: "hint"
        },
        {
            style: "float: right;",
            kind: "onyx.PickerDecorator",
            components: [
                {}, //this uses the defaultKind property of PickerDecorator to inherit from PickerButton
                {
                    kind: "onyx.Picker",
                    name: "picker"
                }
            ]
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.pickerComponentsChanged();
    },
    pickerComponentsChanged: function () {
        this.$.picker.destroyClientControls();
        this.pickerComponents.forEach(function (val) {
            this.$.picker.createComponent({content: String(val), value: val});
        }.bind(this));
    }
});
