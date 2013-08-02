"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/01- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var WAPlayer = function(gen) {
        this.gen = gen;
        this.smf = null;
        this.sequence = [];
        this.audioctx = new webkitAudioContext();
        this.track = [];
    }
    WAPlayer.prototype = {
        input: function(smf) {
            this.smf = smf;
            var tracks = smf.tracks;
            for (var i = 0, n = tracks.length; i < n ; i++) {
                var time = 0;
                var track = tracks[i];
                for (var j = 0, m = track.length; j < m ; j++) {
                    var chunk = track[j];
                    var delta = chunk['delta'];
                    if (delta > 0) {
                        time += delta;
                    }
                    tracks[i][j]['time'] = time;
                }
            }
            var mergedTrack = [];
            for (var i = 0, n = tracks.length; i < n ; i++) {
                mergedTrack = mergedTrack.concat(tracks[i]);
            }
            var sortedTrack = mergedTrack.sort(
                function(a, b) { return (a['time']<b['time'])?-1:1; }
            );
            this.track = sortedTrack;
        },
        play: function() {
            var header = this.smf.header;
            var gen = this.gen;
            var tempo = 0.5; // = 120
            var division = header.division;
            var prevTime = 0;
            var targetTime = gen.audioctx.currentTime; 
            for (var j = 0, m = this.track.length; j < m ; j++) {
                    var chunk = this.track[j];
//                    console.log(chunk);
                var delta = chunk['time'] - prevTime;
                prevTime = chunk['time'];
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
                case 0xC: // Program Change
                    gen.changeProgram(chunk['channel'], chunk['program']);
                    break;
                case 0xE: // Pitch Bend Event
                    gen.pitchBend(targetTime, chunk['channel'], chunk['value']);
                    break;
                case 0xF: // meta event | sysex
                    var type2 = chunk['type2'];
                    if (type2 == 0xF) {
                        switch (chunk['metatype']) {
                        case 0x51: // Tempo Setting
                            tempo = chunk['tempo'] / 1000000; //usec => sec
                            console.log(tempo);
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
