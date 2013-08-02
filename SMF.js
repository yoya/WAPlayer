"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/01- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var SMF = function() {
        this.header = null;
        this.tracks = [];
        this.maxChannel = [];
    }
    SMF.prototype = {
        input: function(smfdata) {
            this.parse(smfdata);
        },
        parse: function(smfbuffer) {
            var offset = 0;
            var smfdata = new Uint8Array(smfbuffer);
            var smflength = smfbuffer.byteLength;
            var bin = new Bin(smfdata, smflength);
            while (bin.hasNextData(8)) {
                var type = bin.getString(4);
                var len = bin.getUI32BE();
                var nextOffset = offset + 8 + len;
                switch (type) {
                  case 'MThd':
                    this.header = this.parseHeader(bin);
                    break;
                  case 'MTrk':
                    this.tracks.push(this.parseTrack(bin, nextOffset));
                    break;
                }
                offset = nextOffset;
                bin.setByteOffset(offset);
            }
        },
        parseHeader: function(bin) {
            var format = bin.getUI16BE();
            var nTracks = bin.getUI16BE();
            var division = bin.getSI16BE();
            return { format:format, nTracks:nTracks, division:division};
        },
        parseTrack: function(bin, nextOffset) {
            var runningStatus = null;
            var chunks = [];
            while (bin.getByteOffset() < nextOffset) {
                var delta = this.getVariableLengthValue(bin);
                var status = bin.getUI8();
                if (status < 0x80) {
                    status = runningStatus;
                    bin.incrementOffset(-1);
                } else {
                    runningStatus = status;
                }
                var type = status >> 4;
                var chunk;
                if (type < 0xF) {
                    var channel = status & 0x0f;
                    if (this.maxChannel < channel) {
                        this.maxChannel = channel;
                    }
                    chunk = {delta:delta, type:type, channel:channel};
                    switch(type) {
                    case 0x8: // Note Off
                    case 0x9: // Note On
                        chunk['note'] = bin.getUI8();
                        chunk['velocity'] = bin.getUI8();
                        break;
                    case 0xA: // Note Aftertouch Event
                        chunk['note'] = bin.getUI8();
                        chunk['amount'] = bin.getUI8();
                        break;
                    case 0xB: // Controller
                        chunk['controller'] = bin.getUI8();
                        chunk['value'] = bin.getUI8();
                        break;
                    case 0xC: //  Program Change
                        chunk['program'] = bin.getUI8();
                        break;
                    case 0xD: // Channel Aftertouch Event
                        chunk['amount'] = bin.getUI8();
                        break;
                    case 0xE: // Pitch Bend Event
                        var value1 = bin.getUI8();
                        var value2 = bin.getUI8();
                        chunk['value'] =  ((value2 & 0x7f) << 7) + (value1 & 0x7f);
                        break;

                    }
                } else {
                    var type2 = status & 0x0f;
                    chunk = {delta:delta, type:type, type2:type2};
                    if (type2  == 0xF) { // Meta Event
                        var metatype = bin.getUI8();
                        chunk['metatype'] = metatype;
                        var len = this.getVariableLengthValue(bin);
                        switch (metatype) {
                        case 0x2F: // End of Track
                            if (len != 0)  {
                                console.error("meta type:0x2F but len!=0");
                                return null;
                            }
                            break;
                        case 0x51: // Tempo Setting
                            if (len != 3)  {
                                console.error("meta type:0x51 but len!=3");
                                return null;
                            }
                            chunk['tempo'] = bin.getUI24BE(); // usec
                            break;
                        default:
                            chunk['metadata'] = bin.getString(len);
                            break;
                        }
                    } else if (type2 == 0x0) { // System Exclusive
                        var len = this.getVariableLengthValue(bin);
                        chunk['systemex'] = bin.getString(len);
                    } else {
                        console.error("metaevent"+metaevent);
                        break;
                    }
                }
                chunks.push(chunk);
            }
            return chunks;
        },
        getVariableLengthValue: function(bin) {
            var ret_value = 0;
            while (true) {
                var value = bin.getUI8();
                if (value & 0x80) {
                    ret_value = (ret_value << 7) + (value & 0x7f);
                } else {
                    ret_value = (ret_value << 7) + value;
                    break;
                }
            }
            return ret_value;
        },
    },
    window.SMF = SMF;
})();
