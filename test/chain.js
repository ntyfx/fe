'use strict';

const Promise = require('bluebird');

var fn1 = new Promise((resolve, reject) => {
    setTimeout(() => {
        console.log(1);
        resolve(1);
    }, 3000);
});

var fn2 = new Promise((resolve, reject) => {
    setTimeout(() => {
        console.log(2);
        resolve(2);
    }, 300);
});

var fn3 = new Promise((resolve, reject) => {
    setTimeout(() => {
        console.log(3);
        resolve(3);
    }, 2000);
});

var fn4 = new Promise((resolve, reject) => {
    setTimeout(() => {
        console.log(4);
        resolve(4);
    }, 1000);
});

Promise.all([]).then((r) => {
    console.log(r);
});