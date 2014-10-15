enyo.kind({
// taken from spritz.js
// A JavaScript Speed Reader
// rich@gun.io
// https://github.com/Miserlou/OpenSpritz
// some modifications by Achim Königs. ;)

    name: "Spritz",

    published: {
        running: "",
        currentWord: "",
        wpm: "",
        all_words: []
    },
    events: {
        onDone: ""
    },
    spritz_timers: [],
    ms_per_word: 60000 / 500,

    // The meat!
    spritzify: function (input, wpm) {

        this.setWpm(wpm);

        // Split on any spaces.
        this.all_words = input.split(/\s+/);

        // The reader won't stop if the selection starts or ends with spaces
        if (this.all_words[0] === "") {
            this.all_words = this.all_words.slice(1, this.all_words.length);
        }

        if (this.all_words[this.all_words.length - 1] === "") {
            this.all_words = this.all_words.slice(0, this.all_words.length - 1);
        }

        // Preprocess words
        var temp_words = this.all_words.slice(0); // copy Array
        var t = 0;

        for (var i=0; i<this.all_words.length; i++){

            if(this.all_words[i].indexOf('.') != -1){
                temp_words[t] = this.all_words[i].replace('.', '&#8226;');
            }

            // Double up on long words and words with commas.
            if((this.all_words[i].indexOf(',') != -1 ||
                this.all_words[i].indexOf(':') != -1 ||
                this.all_words[i].indexOf('-') != -1 ||
                this.all_words[i].indexOf('(') != -1||
                this.all_words[i].length > 8) && this.all_words[i].indexOf('.') == -1) {
                temp_words.splice(t+1, 0, this.all_words[i]);
                temp_words.splice(t+1, 0, this.all_words[i]);
                t++;
                t++;
            }

            // Add an additional space after punctuation.
            if(this.all_words[i].indexOf('.') != -1 ||
               this.all_words[i].indexOf('!') != -1 ||
               this.all_words[i].indexOf('?') != -1 ||
               this.all_words[i].indexOf(':') != -1 ||
               this.all_words[i].indexOf(';') != -1 ||
               this.all_words[i].indexOf(')') != -1){
                temp_words.splice(t+1, 0, " ");
                temp_words.splice(t+1, 0, " ");
                temp_words.splice(t+1, 0, " ");
                t++;
                t++;
                t++;
            }

            t++;

        }

        this.all_words = temp_words.slice(0);
        this.log("Now haing: ", this.all_words.length, " words.");

        this.currentWord = 0;
        this.spritz_timers = [];
    },

    updateValues: function (i) {
        var p = this.pivot(this.all_words[i]);
        document.getElementById("spritz_result").innerHTML = p;
        this.currentWord = i;
    },

    startSpritz: function (override) {

        if (!override) {
            this.setRunning(true);
        }

        this.spritz_timers.push(setInterval(function() {
            this.updateValues(this.currentWord);
            this.currentWord++;
            if(this.currentWord >= this.all_words.length) {
                this.currentWord = 0;
                this.stopSpritz();
                this.doDone();
            }
        }.bind(this), this.ms_per_word));
    },

    stopSpritz: function (override) {
        for(var i = 0; i < this.spritz_timers.length; i++) {
            clearTimeout(this.spritz_timers[i]);
        }
        if (!override) {
            this.setRunning(false);
        }
    },


    // Find the red-character of the current word.
    pivot: function (word){
        var length = word.length;

        var bestLetter = 1;
        switch (length) {
            case 1:
                bestLetter = 1; // first
                break;
            case 2:
            case 3:
            case 4:
            case 5:
                bestLetter = 2; // second
                break;
            case 6:
            case 7:
            case 8:
            case 9:
                bestLetter = 3; // third
                break;
            case 10:
            case 11:
            case 12:
            case 13:
                bestLetter = 4; // fourth
                break;
            default:
                bestLetter = 5; // fifth
        }

        word = decodeEntities(word);
        var start = '.'.repeat((11-bestLetter)) + word.slice(0, bestLetter-1).replace('.', '&#8226;');
        var middle = word.slice(bestLetter-1,bestLetter).replace('.', '&#8226;');
        var end = word.slice(bestLetter, length).replace('.', '&#8226;') + '.'.repeat((11-(word.length-bestLetter)));

        var result;
        result = "<span class='spritz_start'>" + start;
        result = result + "</span><span class='spritz_pivot'>";
        result = result + middle;
        result = result + "</span><span class='spritz_end'>";
        result = result + end;
        result = result + "</span>";

        result = result.replace(/\./g, "<span class='invisible'>.</span>");

        return result;
    },

    wpmChanged: function () {
        this.ms_per_word = 60000/this.wpm;
        this.log("Now ", this.ms_per_word, "ms per word.");
    }
});

// Let strings repeat themselves,
// because JavaScript isn't as awesome as Python.
String.prototype.repeat = function( num ){
    if(num < 1){
        return new Array( Math.abs(num) + 1 ).join( this );
    }
    return new Array( num + 1 ).join( this );
};

function decodeEntities(s){
    var str, temp= document.createElement('p');
    temp.innerHTML= s;
    str= temp.textContent || temp.innerText;
    temp=null;
    return str;
}
