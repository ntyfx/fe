'use strict';

class Build{
    constructor() {
    }

    init(options) {
        console.log('init Build');
    }
}

module.exports = function(env, options) {
    var build = new Build();
    build.init(options);
};