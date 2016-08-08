'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-option-parser');

module.exports = {
    split: (str, sp) => {
        if (!sp) {
            sp = ',';
        }

        return str.split(sp);
    },
    parseInt: (str) => {
        return parseInt(str);
    }
};