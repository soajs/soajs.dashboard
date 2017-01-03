'use strict';


angular.module('swagger-api-constants', [])


.constant('SwaggerDatatypes', {
	"integer": {
		type: "integer",
		format: "int32"
	},

	"long": {
		type: "integer",
		format: "int64"
	},

	"float": {
		type: "number",
		formate: "float"
	},

	"double": {
		type: "number",
		format: "double"
	},

	"string": {
		type: "string"
	},

	"byte": {
		type: "string",
		format: "byte"
	},

	"boolean": {
		type: "boolean"
	},

	"date": {
		type: "string",
		format: "date"
	},

	"dateTime": {
		type: "string",
		format: "date-time"
	},

	"password": {
		type: "string",
		format: "password"
	},

    "array": {
        type: "array"
    }

})
.constant('SwaggerCollectionFormats', [
    "csv",
    "ssv",
    "tsv",
    "pipes"
])
.constant('PropertyConstants', [
    "name",
    "type",
    "format",
    "description"
]);
