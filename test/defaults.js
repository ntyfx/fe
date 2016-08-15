'use strict';

const _ = require('lodash');

let a = {
    "envs": {
        "prod": {
            "port": 9922,
            "hosts": [
                "10.10.182.123",
                "10.10.245.62",
                "10.10.246.19"
            ]
        }
    }
};

let b = {
    "envs": {
        "prod": {
            "hosts": ["10.10.245.62", "10.10.246.19"]
        }
    }
};

let c = _.defaultsDeep(b, a, {});
let d = _.merge({}, a, b);
console.log(JSON.stringify(c, null, 4));
console.log(JSON.stringify(d, null, 4));
