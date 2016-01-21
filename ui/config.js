"use strict";

/**
 * Custom configuration values
 */
var mydomain = "agmkpl.com";
var protocol = window.location.protocol;
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', 'local-dashboard-api.' + mydomain];
var apiConfiguration = {
    domain: protocol + '//local-dashboard-api.' + mydomain,
    key: '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974'
};