"use strict";
/*
  +----------------------------------------------------------------------+
  | (c) 2013/08/09- yoya@awm.jp                                          |
  +----------------------------------------------------------------------+
*/
(function() {
    var WAController = function() {
        this.nChannel = 0;
        this.param = [];
        this.RPNMSB = [];
        this.RPNLSB = [];
        this.NRPNMSB = [];
        this.NRPNLSB = [];
        this.currentRPNMSB = [];
        this.currentRPNLSB = [];
        this.currentNRPNMSB = [];
        this.currentNRPNLSB = [];
    }
    WAController.prototype = {
        setup: function(nChannel) {
            this.nChannel = nChannel;
            this.makeController(nChannel);
        },
        makeController: function(nChannel) {
            var param = new Array(nChannel);
            var RPN = new Array(nChannel);
            var NRPN = new Array(nChannel);
            var currentRPNMSB = new Array(nChannel);
            var currentRPNLSB = new Array(nChannel);
            var currentNRPNMSB = new Array(nChannel);
            var currentNRPNLSB = new Array(nChannel);
            for (var i = 0 ; i < nChannel ; i++) {
                //
                param[i] = new Array(127);
                param[i][7] = 100; // Main Volume
                param[i][11] = 100; // Expression
                //
                RPN[i] = {}; // hash
                NRPN[i] = {}; // hash
//
                currentRPNLSB[i] = null;
                currentRPNMSB[i] = null;
                currentNRPNLSB[i] = null;
                currentNRPNMSB[i] = null;

            }
            this.param = param;
            this.RPN = RPN;
            this.NRPN = NRPN;
            this.currentRPNLSB = currentRPNLSB;
            this.currentRPNMSB = currentRPNMSB;
            this.currentNRPNLSB = currentNRPNLSB;
            this.currentNRPNMSB = currentNRPNMSB;
        },
        setParam: function(channel, type, value) {
            this.param[channel][type] = value;
        },
        getParam: function(channel, type) {
//            console.debug('getParam('+channel+", "+type+")");
            return this.param[channel][type];
        },
        setRPNMSB: function(channel, msb) {
            this.currentRPNMSB[channel] = msb;
            this.currentNRPNMSB[channel] = null;
        },
        setNRPNMSB: function(channel, msb) {
            this.currentNRPNMSB[channel] = msb;
            this.currentRPNMSB[channel] = null;
        },
        setRPNLSB: function(channel, lsb) {
            this.currentRPNLSB[channel] = lsb;
            this.currentNRPNLSB[channel] = null;
        },
        setNRPNLSB: function(channel, lsb) {
            this.currentNRPNLSB[channel] = lsb;
            this.currentRPNLSB[channel] = null;
        },
        setMSBData: function(channel, data) {
            if ((this.currentRPNMSB[channel] !== null) &&
                (this.currentRPNLSB[channel] !== null)) {
                var msb = currentRPNMSB[channel];
                var lsb = currentRPNLSB[channel];
                this.currentRPN[channel][(msb << 8) + lsb] = data;
            }
            if ((this.currentNRPNMSB[channel] !== null) &&
                (this.currentNRPNMSB[channel] !== null)) {
                var msb = currentNRPNMSB[channel];
                var lsb = currentNRPNLSB[channel];
                this.currentNRPN[channel][(msb << 8) + lsb] = data;
            }
        },
        getRPNData: function(channel, msb, lsb) {
            return this.RPN[channel][(msb << 8) + lsb];
        },
        getNRPNData: function(channel, msb, lsb) {
            return this.NRPN[channel][(msb << 8) + lsb];
        },
    },
    window.WAController = WAController;
})();
