'use strict';

/**
* AES is responsible on encrypting/decrypting data with a symmetric key
*
* @main
* @author: Team SOAJS
* @description: AES responsible for encrypting/decrypting sensitive information data
*               https://nodejs.org/api/crypto.html
*/

var crypto = require('crypto');
var MODE = 'aes-256-ctr';   // CTR is considered secure. DO NOT USE ECB.

module.exports = {

    /**
     * Encrypts a given text. Returns the result in the callback.
     *
     * @class AES
     * @method encrypt
     * @param plainText {String} Text to encrypt
     * @param secret {String} Symmetric password to encrypt with
     * @return encrypted {String} Encrypted plainText
     */
    'encrypt': function (plainText, secret) {
        var cipher = crypto.createCipher(MODE, secret);
        var encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return encrypted;
    },

    /**
     * Decrypts a given cipher. Returns the result in the callback.
     *
     * @class AES
     * @method decrypt
     * @param cipherText {String} Encrypted text to decrypt
     * @param secret {String} Symmetric password to decrypt with
     * @return decrypted {String} Decrypted cipherText
     */
    'decrypt': function (cipherText, secret) {
        var decipher = crypto.createDecipher(MODE, secret);
        var decrypted = decipher.update(cipherText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

};
