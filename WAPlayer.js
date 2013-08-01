"use strict";
(function() {
    var WAPlayer = function(gen) {
        this.gen = gen;
        this.smf = null;
        this.sequence = [];
        this.audioctx = new webkitAudioContext();
    }
    WAPlayer.prototype = {
        input: function(smf) {
            this.smf = smf;
        },
        play: function() {
            var header = this.smf.header;
            var tracks = this.smf.tracks;
            var gen = this.gen;
            var tempo = 0.5; // = 120
            var division = header.division;
            var startTime = gen.audioctx.currentTime;
            for (var i = 0, n = tracks.length; i < n ; i++) {
//                console.debug("### Track:"+i);
                var track = tracks[i];
                var targetTime = startTime;
                for (var j = 0, m = track.length; j < m ; j++) {
                    var chunk = track[j];
//                    console.log(chunk);
                    var delta = chunk['delta'];
                    if (delta > 0) {
                        targetTime += tempo * delta / division;
                    }
                    var type  = chunk['type'];
                    switch (type) {
                    case 0x8: // Note Off
                        gen.noteOff(targetTime, chunk['channel'], chunk['note'], chunk['velocity']);
                        break;
                    case 0x9: // Note On
                        gen.noteOn(targetTime, chunk['channel'], chunk['note'], chunk['velocity']);
                        break;
                    case 0xC: // program change
                        gen.changeProgram(chunk['channel'], chunk['program']);
                        break;
                    case 0xF: // meta event | sysex
                        var type2 = chunk['type2'];
                        if (type2 == 0xF) {
                            switch (chunk['metatype']) {
                            case 0x51: // Tempo Setting
                                tempo = chunk['tempo'] / 1000000; //usec => sec
                                break;
                            case 0x2F: // End of Track
                                gen.noteOffAll(targetTime);
                                break;
                            }
                        } else if (type2 == 0x0) { // SysEx
                            ;
                        } else {
                            console.error("type:0xF and Unknown type2:"+type2);
                        }
                        break;
                    default:
                        break;
                    }
                }
            }
        },
        stop: function() {
            this.gen.stop();
        },
        advance: function(advance) {
            ;
        },
    },
    window.WAPlayer = WAPlayer;
})();
