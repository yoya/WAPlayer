"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/01- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var WAGeneratorProgramTable = {
        // type: 0:sine, 1:square, 2:sawtoosh, 3:triangle
        46:{type:0, gain:1.0, decay:10}, // pizzicato strings
        47:{type:0, gain:1.0, decay:1}, // harp
        57:{type:1, gain:0.3, decay:0}, // trunpet
        58:{type:1, gain:0.3, decay:0}, // trumbone
        60:{type:1, gain:0.3, decay:0}, // muted trunpet
        68:{type:3, gain:0.9, decay:0}, // oboe
        73:{type:3, gain:0.8, decay:0}, // flute
        88:{type:2, gain:0.5, decay:0}, // base
    }
    var WAGenerator = function() {
        this.audioctx = new webkitAudioContext();
        this.oscTable = [];
//        this.osc2Table = [];
//        this.osc3Table = [];
        this.gainTable = [];
        this.gain2 = null;
        this.noteOnTable = [];
        this.musicScaleTable = [];
        this.pitchBendTable = [];
        this.noteOnKeyTable = [];
        this.noteOnGainTable = [];
        this.channelGainTable = [];
        this.gainScale = 1.0
        this.gain2Scale = 1.0;
    }
    WAGenerator.prototype = {
        setup: function(nChannel, nMultiplex) {
            this.nChannel = nChannel;
            this.nMultiplex = nMultiplex;
            this.connectNode(nChannel, nMultiplex);
            var noteOnTable = new Array(nChannel);
            var noteOnKeyTable = new Array(nChannel);
            var noteOnGainTable = new Array(nChannel);
            var pitchBendTable = new Float32Array(nChannel);
            var channelGainTable = new Float32Array(nChannel);
            for (var i = 0 ; i < nChannel ; i++) {
                noteOnTable[i] = new Array(nMultiplex);
                noteOnKeyTable[i] = new Array(nMultiplex);
                noteOnGainTable[i] = new Array(nMultiplex);
                for (var j = 0 ; j < nMultiplex ; j++) {
                    noteOnTable[i][j] = null;
                    noteOnKeyTable[i][j] = 0;
                    noteOnGainTable[i][j] = 0;
                }
                pitchBendTable[i] = 1.0;
                channelGainTable[i] = 0.8; // default
            }
            this.noteOnTable = noteOnTable;
            this.noteOnKeyTable = noteOnKeyTable;
            this.noteOnGainTable = noteOnGainTable;
            this.pitchBendTable = pitchBendTable;
            this.channelGainTable = channelGainTable;
            this.makeMusicScale();
        },
        connectNode: function(nChannel, nMultiplex) {
            var audioctx = this.audioctx;
            this.oscTable = new Array(nChannel);
//            this.osc2Table = new Array(nChannel);
//            this.osc3Table = new Array(nChannel);
            this.gainTable = new Array(nChannel);
            this.gain2 = audioctx.createGainNode();
            this.gain2.gain.value = this.gain2Scale;
            this.gainScale = 1/Math.sqrt(nChannel);
            for (var i = 0 ; i < nChannel ; i++) {
//                var osc2 = audioctx.createOscillator();
//                var osc3 = audioctx.createOscillator();
                this.oscTable[i] = new Array(nMultiplex);
                this.gainTable[i] = new Array(nMultiplex);
                for (var j = 0 ; j < nMultiplex ; j++) {
                    var osc = audioctx.createOscillator();
                    var gain = audioctx.createGainNode();
                    gain.gain.value = 0;
//                    osc.type = 0; // "sine";
                    osc.type = 3; // "triangle";
//                    osc2.connect(osc.frequency);
//                    osc3.connect(gain.gain);
                    osc.connect(gain);
                    gain.connect(this.gain2);
                    this.oscTable[i][j] = osc;
                    this.gainTable[i][j] = gain;
                }
//                this.osc2Table[i] = osc2;
//                this.osc3Table[i] = osc3;
            }
            this.gain2.connect(audioctx.destination);
        },
        makeMusicScale: function() {
            var musicScaleTable = new Float32Array(128);
            var root12 = Math.pow(2, 1/12);
            musicScaleTable[69] = 440; // [Hz] A4
            for (var i = 69 ; i < 127; i++) {
                musicScaleTable[i + 1] = musicScaleTable[i] * root12;
            }
            for (var i = 69 ; 0 < i; i--) {
                musicScaleTable[i - 1] = musicScaleTable[i] / root12;
            }
            this.musicScaleTable = musicScaleTable;
        },
        ready: function() { // from button/touen event
            for (var i = 0 ; i < this.nChannel ; i++) {
                for (var j = 0 ; j < this.nMultiplex ; j++) {
                    this.oscTable[i][j].noteOn(0);
                }
//                this.osc2Table[i].noteOn(0);
//                this.osc3Table[i].noteOn(0);
            }
        },
        // method
        changeProgram: function(channel, program) {
            if (program in WAGeneratorProgramTable) {
                var type = WAGeneratorProgramTable[program].type;
                var gain = WAGeneratorProgramTable[program].gain;
                console.log("type:"+type+",gain:"+gain);
                for (var i = 0 ; i < this.nMultiplex ; i++) {
                    this.oscTable[channel][i].type = type;
                }
                this.channelGainTable[channel] = gain;
            } else {
                console.log("programChange: "+channel+", "+program+")");
            }
        },
        pitchBend: function(targetTime, channel, value) {
            var noteOnTableChannel = this.noteOnTable[channel];
            var bend = Math.pow(2, (value/0x2000)/12);
            this.pitchBendTable[channel] = bend;
            for (var i = 0 ; i < this.nMultiplex ; i++) {
                if (noteOnTableChannel[i] !== null) {
                    var key = this.noteOnKeyTable[channel][i];
                    var freq = this.musicScaleTable[key];
                    freq *= bend;
                    this.oscTable[channel][i].frequency.setValueAtTime(freq, targetTime);
                }
            }
        },
        noteOn2: function(targetTime, channel, i, key, velocity) {
            var noteOnTableChannel = this.noteOnTable[channel];
            var bend = this.pitchBendTable[channel];
            var freq = this.musicScaleTable[key] * bend;
            var gain = velocity/0x100 * this.gainScale * this.channelGainTable[channel];
            var prevKey = this.noteOnKeyTable[channel][i]
            var prevFreq = this.musicScaleTable[prevKey] * bend;
            noteOnTableChannel[i] = key;
            if (prevFreq) {
                this.oscTable[channel][i].frequency.setValueAtTime(prevFreq, targetTime-0.01);
                //                        this.oscTable[channel][i].frequency.linearRampToValueAtTime(prevFreq, targetTime-0.01);
                this.oscTable[channel][i].frequency.linearRampToValueAtTime(freq, targetTime);
            } else {
                this.oscTable[channel][i].frequency.setValueAtTime(freq, targetTime); 
            }
            this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime-0.005);
            this.gainTable[channel][i].gain.linearRampToValueAtTime(gain, targetTime+0.005);
            this.noteOnKeyTable[channel][i] = key;
            this.noteOnGainTable[channel][i] = gain;
        },
        noteOn: function(targetTime, channel, key, velocity) {
            if (velocity === 0) {
                return this.noteOff(targetTime, channel, key, velocity);
            }
//            console.log("noteOn:"+targetTime+ ", key:"+key);
            var noteOnTableChannel = this.noteOnTable[channel];
            for (var i = 0 ; i < this.nMultiplex ; i++) {
                if (noteOnTableChannel[i] === null) {
                    this.noteOn2(targetTime, channel, i, key, velocity);
                    return true; // OK
                }
            }
            console.warn("noteOn return false");
            var i = this.nMultiplex - 1;
            if (this.nMultiplex > 2) {
                i = this.nMultiplex - 2;
            }
            this.noteOn2(targetTime, channel, i, key, velocity);
            return false; // NG;
        },
        noteOff: function(targetTime, channel, key, velocity) {
//            console.log("noteOff:"+targetTime+", key:"+key);
            var noteOnTableChannel = this.noteOnTable[channel];
            for (var i = 0 ; i < this.nMultiplex ; i++) {
                if (noteOnTableChannel[i] === key) {
                    noteOnTableChannel[i] = null;
                    this.gainTable[channel][i].gain.linearRampToValueAtTime(this.noteOnGainTable[channel][i], targetTime - 0.05);
                    this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime);
                    return true; // OK
                }
            }
            return false; // NG;
        },
        noteOffAll: function(targetTime) {
            for (var channel = 0 ; i < this.nChannel ; channel++) {
                var noteOnTableChannel = this.noteOnTable[channel];
                for (var i = 0 ; i < this.nMultiplex ; i++) {
                    if (noteOnTableChannel[i] !== null) {
                        noteOnTableChannel[i] = null;
                        this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime);
                    }
                }
            }
            return false; // NG;
        },
        stop: function() {
            var nChannel = this.nChannel;
            var nMultiplex = this.nMultiplex;
            var oscTable = this.oscTable;
            var gainTable = this.gainTable;
            var noteOnTable = this.noteOnTable;
            for (var i = 0 ; i < nChannel ; i++) {
                for (var j = 0 ; j < nMultiplex ; j++) {
                    gainTable[i][j].gain.cancelScheduledValues(0);
                    oscTable[i][j].frequency.cancelScheduledValues(0);
                    noteOnTable[i][j] = null;
                    gainTable[i][j].gain.value = 0;
                }
            }
        },
        advance: function(advance) {
            ;
        },
    },
    window.WAGenerator = WAGenerator;
})();
