"use strict";

const assert = require('assert');
var request = require("request");

var helper = require("../helper.js");
var utils = require("soajs.core.libs").utils;

var config = helper.requireModule('./config');
var errors = config.errors;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

const extKey_owner = '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974';
const extKey_user1 = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var params = {}, access_token_owner = '', access_token_user1 = '';
var customRegCopy = {}, customRegCopyId = '';
var customRegRecord = {};
