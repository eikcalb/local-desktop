"use strict";
exports.__esModule = true;
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var jsonwebtoken_1 = require("jsonwebtoken");
var path_1 = require("path");
var SALT = fs_1.readFileSync(path_1.join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default", '.v1.admin.salt2'));
var PRIVATE_KEY = fs_1.readFileSync(path_1.join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default/.app", '.v1.privkey'));
function signToken(paassword, payload, algorithm) {
    try {
        var STORED_HASH = crypto_1.pbkdf2Sync(paassword, SALT, 64000, 62, 'SHA512');
        console.info('Starting signer with hash: ', STORED_HASH.toString(), '\n Using private key: ', PRIVATE_KEY.toString());
        var res = jsonwebtoken_1.sign(payload, { passphrase: STORED_HASH.toString(), key: PRIVATE_KEY.toString() }, { algorithm: algorithm || 'RS512' });
        console.log("Generated payload is: ", res);
    }
    catch (err) {
        console.error(err);
    }
}
exports.signToken = signToken;
