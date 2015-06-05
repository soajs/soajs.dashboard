"use strict";
var validSchema = {
	"genericService": {
		"config": {
			"serviceName": "news",
			"servicePort": 4100,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"extKeyRequired": true,
			"awareness": true,
			"errors": {
				400: "Error retrieving news entry(ies).",
				401: "Error adding news Entry.",
				402: "Error updating news Entry.",
				403: "Error removing news Entry.",
				404: "Invalid News Id provided."
			},
			"schema": {
				"commonFields": {
					"title": {
						"req": true,
						"source": ['body.title'],
						"validation": {
							"type": "string",
							"minLength": 5
						}
					},
					"description": {
						"req": true,
						"source": ['body.description'],
						"validation": {
							"type": "string"
						}
					},
					"status": {
						"req": true,
						"source": ['body.status'],
						"validation": {
							"type": "string",
							'enum': ['published', 'unpublished']
						}
					},
					"id": {
						"req": true,
						"source": ['query.id'],
						"validation": {
							"type": "string"
						}
					}
				},
				"/list": {
					"_apiInfo": {
						"l": "List News Entries",
						"group": "News",
						"groupMain": true
					}
				},
				"/get": {
					"_apiInfo": {
						"l": "Get One News Entry",
						"group": "News"
					},
					"commonFields": ['id']
				},
				"/delete": {
					"_apiInfo": {
						"l": "Remove News Entry",
						"group": "News"
					},
					"commonFields": ['id']
				},
				"/restore": {
					"_apiInfo": {
						"l": "Restore News Entry",
						"group": "News"
					},
					"commonFields": ['id']
				},
				"/add": {
					"_apiInfo": {
						"l": "Add News Entry",
						"group": "News"
					},
					"commonFields": ['title', 'description']
				},
				"/update": {
					"_apiInfo": {
						"l": "Update News Entry",
						"group": "News"
					},
					"commonFields": ['id', 'title', 'description', 'status']
				}
			}
		},
		"options": {
			"session": true,
			"multitenant": true,
			"acl": true,
			"security": true
		}
	},
	"soajsService": {
		"db": {
			"collection": "data",
			"multitenant": true,
			"config": {}
		},
		"apis": {
			"/list": {
				"method": "get",
				"mw": {'code': 400},
				"type": "list",
				"workflow": {
					preExec: "console.log(req.soajs.tenant.id);next();"
				}
			},

			"/get": {
				"method": "get",
				"mw": {'code': 400},
				"type": "get",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored...." +
					           "req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");" +
					           "try {" +
					           "\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};" +
					           "\tnext();" +
					           "}" +
					           "catch(e) {" +
					           "\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));" +
					           "}" +
					           "next();"
				}
			},

			"/delete": {
				"method": "get",
				"mw": {'code': 403},
				"type": "delete",
				workflow: {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored...." +
					           "req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");" +
					           "try {" +
					           "\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};" +
					           "\tnext();" +
					           "}" +
					           "catch(e) {" +
					           "\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));" +
					           "}" +
					           "next();"
				}
			},

			"/restore": {
				"method": "get",
				"mw": {'code': 403},
				"type": "restore",
				workflow: {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored...." +
					           "req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");" +
					           "try {" +
					           "\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};" +
					           "\tnext();" +
					           "}" +
					           "catch(e) {" +
					           "\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));" +
					           "}" +
					           "next();"
				}
			},

			"/add": {
				"type": "add",
				"method": "post",
				"mw": {'code': 401, 'model': 'add'},
				"workflow": {}
			},

			"/update": {
				"method": "post",
				"mw": {'code': 402, 'model': 'update'},
				"type": "update",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored...." +
					           "req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");" +
					           "try {" +
					           "\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};" +
					           "\tnext();" +
					           "}" +
					           "catch(e) {" +
					           "\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));" +
					           "}" +
					           "next();"
				}
			}
		}
	},
	"soajsUI": {
		"list": {
			'columns': [
				{'label': 'Title', 'field': 'fields.title'},
				{'label': 'Status', 'field': 'fields.status'},
				{'label': 'Created', 'field': 'created', 'filter': 'date'},
				{'label': 'Modified', 'field': 'modified', 'filter': 'date'},
				{'label': 'Author', 'field': 'author'}
			],
			'defaultSortField': 'Title'
		},
		"form": {
			'add': [
				{
					'name': 'title',
					'label': 'Title',
					'_type': 'text',
					'placeholder': 'My News Entry...',
					'value': '',
					'tooltip': 'Enter the title of news entry, this field is mandatory',
					'req': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'_type': 'editor',
					'placeholder': 'News Content ...',
					'value': '',
					'tooltip': 'Use the editor to enter the content of the News entry',
					'req': true
				}
			],
			'update': [
				{
					'name': 'title',
					'label': 'Title',
					'_type': 'text',
					'placeholder': 'My News Entry...',
					'value': '',
					'tooltip': 'Enter the title of news entry, this field is mandatory',
					'req': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'_type': 'editor',
					'placeholder': 'News Content ...',
					'value': '',
					'tooltip': 'Use the editor to enter the content of the News entry',
					'req': true
				},
				{
					'name': 'status',
					'label': 'Status',
					'_type': 'radio',
					'value': [{'v': 'published', 'selected': true}, {'v': 'unpublished'}],
					'req': true
				}
			]
		}
	}
};

module.exports = validSchema;