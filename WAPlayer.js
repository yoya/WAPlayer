"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/01- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var WAPlayer = function(gen) {
        this.gen = gen;
        this.cntl = new WAController();
        this.smf = null;
        this.sequence = [];
        this.audioctx = new webkitAudioContext();
        this.track = [];
        this.multiplexMax = 4;
    }
    WAPlayer.prototype = {
        setMultiplexMax: function(multiplexMax) {
            this.multiplexMax = multiplexMax;
        },
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
//                function(a, b) { return (a['time']<b['time'])?-1:1; }
                  function(a, b) { return (a['time']<b['time'])?-1:((a['time']==b['time'])?0:1); }
            );
            this.track = sortedTrack;

            // get MultiplexMaxTable
            var nChannel = smf.maxChannel + 1;
            var multiplexTable = new Uint8Array(nChannel);
            var multiplexMaxTable = new Uint8Array(nChannel);
            var noteOnTable = new Array(nChannel);
            for (var i = 0, n = nChannel; i < n ; i++) {
                noteOnTable[i] = new Uint8Array(128);
            }
            for (var i = 0, n = sortedTrack.length; i < n ; i++) {
                var chunk = sortedTrack[i];
                var channel  = chunk['channel'];
                var type     = chunk['type'];
                var note     = chunk['note'];
                var velocity = chunk['velocity'];
                if ((type == 9) && (velocity > 0)) { // type:9 note on
                    if (noteOnTable[channel][note] == 0) {
                        noteOnTable[channel][note] = 1;
                        multiplexTable[channel]++;
                        if (multiplexMaxTable[channel] < multiplexTable[channel]) {
                            multiplexMaxTable[channel] = multiplexTable[channel];
                        }
                    }
                } else if ((type == 8) || (type == 9)) { // type:8 note off
                    if (multiplexTable[channel] > 0) {
                        multiplexTable[channel]--;
                    }
                    noteOnTable[channel][note] = 0;
                }
            }
            // limit
            console.log(multiplexMaxTable);
            for (var i = 0; i < nChannel ; i++) {
                if (this.multiplexMax < multiplexMaxTable[i]) {
                    multiplexMaxTable[i] = this.multiplexMax;
                }
            }
            console.log(multiplexMaxTable);
            this.gen.setup(nChannel, multiplexMaxTable);
            this.gen.setController(this.cntl);
            this.cntl.setup(nChannel);
        },
        play: function() {
            this.gen.stop(0); // XXX
            var header = this.smf.header;
            var gen = this.gen;
            var cntl = this.cntl;
            var tempo = 0.5; // = 120
            var division = header.division;
            var prevTime = 0;
            var targetTime = gen.audioctx.currentTime; 
            for (var j = 0, m = this.track.length; j < m ; j++) {
                var chunk = this.track[j];
//                    console.log(chunk);
                var channel = ('channel' in chunk)?chunk['channel']:null;
                var delta = chunk['time'] - prevTime;
                prevTime = chunk['time'];
                if (delta > 0) {
                    targetTime += tempo * delta / division;
                }
                var type  = chunk['type'];
                switch (type) {
                case 0x8: // Note Off
                    gen.noteOff(targetTime, channel, chunk['note'], chunk['velocity']);
                    break;
                case 0x9: // Note On
                    gen.noteOn(targetTime, channel, chunk['note'], chunk['velocity']);
                    break;
                case 0xC: // Control Change
                    switch(chunk['controller']) {
                    case 7: // MainVolume
                        gen.mainVolume(chunk['time'],
                                       channel, chunk['volume']);
                        break;
                    case 6: // MSB Value;
                        break;
                    case 11: // Expression
                        gen.expression(chunk['time'],
                                       channel, chunk['expression']);
                        break;
                    case 98: // NRPN LSB
                        cntl.setNRPNType(channel, this.chunk['lsb']);
                        break;
                    case 99: // NRPN MSB
                        cntl.setNRPNType(channel, this.chunk['msb']);
                        break;
                    case 100: // RPN LSB
                        cntl.setRPNType(channel, this.chunk['lsb']);
                        break;
                    case 101: // RPN MSB
                        cntl.setNRPNType(channel, this.chunk['msb']);
                        break;
                    }
                    break;
                case 0xC: // Program Change
                    gen.changeProgram(channel, chunk['program']);
                    break;
                case 0xE: // Pitch Bend Event
                    gen.pitchBend(targetTime, channel, chunk['value']);
                    break;
                case 0xF: // meta event | sysex
                    var type2 = chunk['type2'];
                    if (type2 == 0xF) {
                        switch (chunk['metatype']) {
                        case 0x51: // Tempo Setting
                            tempo = chunk['tempo'] / 1000000; //usec => sec
//                            console.debug('tempo:'+tempo);
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
            gen.noteOffAll(targetTime+1); // failsafe
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
