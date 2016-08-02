'use strict';

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