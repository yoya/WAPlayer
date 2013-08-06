"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/01- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var WAGeneratorProgramTable = {
        // type: 0:sine, 1:square, 2:sawtoosh, 3:triangle
        40:{type:3, gain:0.7, decay:0}, // Synth
        46:{type:0, gain:1.0, decay:10}, // pizzicato strings
        47:{type:0, gain:1.0, decay:1}, // harp
//        48:{type:3, gain:0.7, decay:1}, // Timpani XXX
        48:{type:2, gain:0.2, decay:1}, // Timpani XXX
        57:{type:1, gain:0.2, decay:0}, // trunpet
        58:{type:1, gain:0.2, decay:0}, // trumbone
        60:{type:1, gain:0.2, decay:0}, // muted trunpet
        68:{type:3, gain:0.7, decay:0}, // oboe
        73:{type:3, gain:0.7, decay:0}, // flute
        88:{type:2, gain:0.2, decay:0}, // base
    }
    var WAGenerator = function() {
        this.audioctx = new webkitAudioContext();
        this.oscTable = [];
//        this.osc2Table = [];
//        this.osc3Table = [];
        this.gainTable = [];
        this.gainMaster = null;
        this.noteOnTable = [];
        this.musicScaleTable = [];
        this.pitchBendTable = [];
        this.noteOnKeyTable = [];
        this.noteOnNextIndex = [];
        this.noteOnGainTable = [];
        this.channelGainTable = [];
        this.gainScale = 1.0
        this.gainMasterScale = 1.0;
    }
    WAGenerator.prototype = {
        setup: function(nChannel, nMultiplexTable) {
            this.nChannel = nChannel;
            this.nMultiplexTable = nMultiplexTable;
            this.connectNode(nChannel, nMultiplexTable);
            var noteOnTable = new Array(nChannel);
            var noteOnKeyTable = new Array(nChannel);
            var noteOnGainTable = new Array(nChannel);
            var pitchBendTable = new Float32Array(nChannel);
            var channelGainTable = new Float32Array(nChannel);
            var noteOnNextIndex = new Uint8Array(nChannel);
            for (var i = 0 ; i < nChannel ; i++) {
                var nMultiplex = nMultiplexTable[i];
                noteOnTable[i] = new Array(nMultiplex);
                noteOnKeyTable[i] = new Array(nMultiplex);
                noteOnGainTable[i] = new Array(nMultiplex);
                for (var j = 0 ; j < nMultiplex ; j++) {
                    noteOnTable[i][j] = null;
                    noteOnKeyTable[i][j] = 0;
                    noteOnGainTable[i][j] = 0;
                }
                pitchBendTable[i] = 1.0;
                channelGainTable[i] = 0.7; // default
            }
            this.noteOnTable = noteOnTable;
            this.noteOnKeyTable = noteOnKeyTable;
            this.noteOnGainTable = noteOnGainTable;
            this.pitchBendTable = pitchBendTable;
            this.channelGainTable = channelGainTable;
            this.noteOnNextIndex = noteOnNextIndex;
            this.makeMusicScale();
        },
        connectNode: function(nChannel, nMultiplexTable) {
            var audioctx = this.audioctx;
            this.oscTable = new Array(nChannel);
            this.osc2Table = new Array(nChannel);
            this.gain2Table = new Array(nChannel);
            this.osc3Table = new Array(nChannel);
            this.gain3Table = new Array(nChannel);
            this.gainTable = new Array(nChannel);
            this.gainMaster = audioctx.createGainNode();
            this.gainMaster.gain.value = this.gainMasterScale;
            this.gainScale = 2/Math.sqrt(nChannel); // XXX
//            this.gainScale = 1;
            for (var i = 0 ; i < nChannel ; i++) {
                var osc2 = audioctx.createOscillator();
                var gain2 = audioctx.createGainNode();
                var osc3 = audioctx.createOscillator();
                var gain3 = audioctx.createGainNode();
                var nMultiplex = nMultiplexTable[i];
                this.oscTable[i] = new Array(nMultiplex);
                this.gainTable[i] = new Array(nMultiplex);
                for (var j = 0 ; j < nMultiplex ; j++) {
                    var osc = audioctx.createOscillator();
                    var gain = audioctx.createGainNode();
                    gain.gain.value = 0;
//                    osc.type = 0; // "sine";
                    osc.type = 3; // "triangle";
/*
                    osc2.connect(gain2);
                    gain2.connect(osc.frequency);
                    osc2.frequency.value = 5;
                    gain2.gain.value = 1;
*/
/*
                    osc3.connect(gain3);
                    gain3.connect(gain);
                    osc3.frequency.value = 5;
                    gain3.gain.value = 1;
*/
//
                    osc.connect(gain);
                    gain.connect(this.gainMaster);
                    this.oscTable[i][j] = osc;
                    this.gainTable[i][j] = gain;
                }
                this.osc2Table[i] = osc2;
                this.osc3Table[i] = osc3;
            }
            this.gainMaster.connect(audioctx.destination);
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
                if (i == 9) { // percussion part
                    continue; // NOW ignore!! sorry!!!
                }
                var nMultiplex = this.nMultiplexTable[i];
                for (var j = 0 ; j < nMultiplex ; j++) {
                    this.oscTable[i][j].noteOn(0);
                }
                if (i == 1) {
//                    this.osc2Table[i].noteOn(0);
//                    this.osc3Table[i].noteOn(0);
                }
            }
        },
        // method
        changeProgram: function(channel, program) {
            if (program in WAGeneratorProgramTable) {
                var type = WAGeneratorProgramTable[program].type;
                var gain = WAGeneratorProgramTable[program].gain;
//                console.debug("type:"+type+",gain:"+gain);
                var nMultiplex = this.nMultiplexTable[channel];
                for (var i = 0 ; i < nMultiplex ; i++) {
                    this.oscTable[channel][i].type = type;
                }
                this.channelGainTable[channel] = gain;
                console.log(gain); // XXX
            } else {
                console.log("programChange: ("+channel+", "+program+")");
            }
        },
        pitchBend: function(targetTime, channel, value) {
            var noteOnTableChannel = this.noteOnTable[channel];
            var bend = Math.pow(2, (value/0x2000)/6);
            this.pitchBendTable[channel] = bend;
            var nMultiplex = this.nMultiplexTable[channel];
            for (var i = 0 ; i < nMultiplex ; i++) {
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
            this.oscTable[channel][i].frequency.cancelScheduledValues(targetTime);
            if (prevFreq) {
                this.oscTable[channel][i].frequency.setValueAtTime(prevFreq, targetTime-0.01);
                this.oscTable[channel][i].frequency.linearRampToValueAtTime(freq, targetTime);
            } else {
                this.oscTable[channel][i].frequency.setValueAtTime(freq, targetTime); 
            }
            
            this.gainTable[channel][i].gain.cancelScheduledValues(targetTime);
            if (noteOnTableChannel[i] != key) {

                this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime-0.005);
            }
            this.gainTable[channel][i].gain.linearRampToValueAtTime(gain, targetTime+0.005);
            this.noteOnKeyTable[channel][i] = key;
            this.noteOnGainTable[channel][i] = gain;
            noteOnTableChannel[i] = key;
        },
        noteOn: function(targetTime, channel, key, velocity) {
            if (velocity === 0) {
                return this.noteOff(targetTime, channel, key, velocity);
            }
//            console.log("noteOn:"+targetTime+ ", key:"+key);
            var noteOnTableChannel = this.noteOnTable[channel];
            var nMultiplex = this.nMultiplexTable[channel];
            for (var i = 0 ; i < nMultiplex ; i++) {
                if (noteOnTableChannel[i] === key) {
                    this.noteOn2(targetTime, channel, i, key, velocity);
                    return true; // OK
                }
            }
            var noteOnNextIndex = this.noteOnNextIndex[channel];
            this.noteOn2(targetTime, channel, noteOnNextIndex, key, velocity);
            this.noteOnNextIndex[channel] = (noteOnNextIndex + 1) % nMultiplex;
            console.warn("noteOn return false");
            return false; // NG;
        },
        noteOff: function(targetTime, channel, key, velocity) {
//            console.log("noteOff:"+targetTime+", key:"+key);
            var noteOnTableChannel = this.noteOnTable[channel];
            var nMultiplex = this.nMultiplexTable[channel];
            for (var i = 0 ; i < nMultiplex ; i++) {
                if (noteOnTableChannel[i] === key) {
                    noteOnTableChannel[i] = null;
                    this.gainTable[channel][i].gain.cancelScheduledValues(targetTime);
                    this.gainTable[channel][i].gain.linearRampToValueAtTime(this.noteOnGainTable[channel][i], targetTime - 0.05);
                    this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime);
//                    return true; // OK
                }
            }
//            console.warn("noteOff return false");
            return false; // NG;
        },
        noteOffAll: function(targetTime) {
            for (var channel = 0 ; channel < this.nChannel ; channel++) {
                var noteOnTableChannel = this.noteOnTable[channel];
                var nMultiplex = this.nMultiplexTable[channel];
                for (var i = 0 ; i < nMultiplex ; i++) {
//                    if (noteOnTableChannel[i] !== null) {
                        noteOnTableChannel[i] = null;
                        this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime);
                        this.gainTable[channel][i].gain.linearRampToValueAtTime(0, targetTime + 1); // XXX
//                    }
                }
            }
            return false; // NG;
        },
        stop: function() {
            var nChannel = this.nChannel;
            var oscTable = this.oscTable;
            var gainTable = this.gainTable;
            var noteOnTable = this.noteOnTable;
            for (var i = 0 ; i < nChannel ; i++) {
                var nMultiplex = this.nMultiplexTable[i];
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
