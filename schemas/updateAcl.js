"use strict";
const apiGroup = require("./aclApiGroup");
const granularAcl = require("./aclGranular");

const acl = {
	"type": "object",
	"patternProperties": {
		"^[^\W\.]+$": {
			"oneOf": [
				apiGroup,
				granularAcl
			]
		}
	},
	"additionalProperties": false
};

module.exports = acl;


