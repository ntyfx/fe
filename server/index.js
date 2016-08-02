'use strict';

class Server{
    constructor() {
    }

    init(options) {
        console.log('init server');
    }
}

module.exports = function(env, options) {
    var server = new Server();
    server.init(options);
};