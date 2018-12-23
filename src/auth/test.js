"use strict";
exports.__esModule = true;
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var jsonwebtoken_1 = require("jsonwebtoken");
var path_1 = require("path");
var cluster_1 = require("cluster");
// const { sign } = window.require('jsonwebtoken')
// const { join } = window.require('path')
// const { pbkdf2Sync } = window.require('crypto')
// const { readFileSync } = window.require('fs')
// const SALT = readFileSync(join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default", '.v1.admin.salt2'))
// const PRIVATE_KEY = readFileSync(join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default/.app", '.v1.privkey'))
function signToken(password, payload, algorithm) {
    try {
        var SALT = fs_1.readFileSync(path_1.join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default", '.v1.admin.salt2'));
        var PRIVATE_KEY = fs_1.readFileSync(path_1.join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default/.app", '.v1.privkey'));
        var STORED_HASH = crypto_1.pbkdf2Sync(password, SALT, 64000, 62, 'SHA512');
        console.info('Starting signer with hash: ', STORED_HASH, '\n Using private key: ', PRIVATE_KEY);
        var res = jsonwebtoken_1.sign(payload, { passphrase: STORED_HASH.toString(), key: PRIVATE_KEY.toString() }, { algorithm: algorithm || 'RS512' });
        console.log("Generated payload is: ", res);
    }
    catch (err) {
        console.error(err);
    }
}
exports.signToken = signToken;
function signToken2(key, passphrase) {
    return jsonwebtoken_1.sign({ user: 'lord' }, { passphrase: key, key: passphrase }, { algorithm: 'RS512' });
}
exports.signToken2 = signToken2;
if (cluster_1.isMaster) {
    cluster_1.setupMaster({ exec: __filename, silent: false });
    cluster_1.on('message', console.log);
    cluster_1.on('fork', function (worker) { console.log('new worker forked!'); });
    cluster_1.fork();
}
else {
    console.log('started');
    //@ts-ignore
    console.log(1, 2, 3, global);
}
