"use strict";
var assert = require("assert");
var aes = require("../../utils/crypto/aes.js");

var SECRET = 'Shhh, I am secret!';

describe("testing aes cryptography", function(){
	var plain = "A successful man is someone who makes more money than his wife can spend.";
	var cipher = "f20dbe775ce0f9e0e0701d4b299ffa993760f2a39d8b17760ba7b8798c74c27ff4180b108b62b876d611c21a12a8aec3c07a8709067e82df22d5c9c929461499586da16be301de46e0";

	it("testing encryption", function(done) {
		 var encrypted = aes.encrypt(plain, SECRET);
		 assert.equal(cipher, encrypted);
		 done();
	});

	it("testing decryption", function(done) {
		var decrypted = aes.decrypt(cipher, SECRET);
		assert.equal(plain, decrypted);
		done();
	});

	it("testing decryption with wrong secret key", function(done) {
		var decrypted = aes.decrypt(cipher, "I am a wrong secret key");
		assert.notEqual(plain, decrypted);
		done();
	});
});