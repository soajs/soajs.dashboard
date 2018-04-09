module.exports = {
	"name": "MK endpoint",
	"description": "Mike Template for endpoint",
	"content": {
		
		"endpoints": {
			"data": [
				{
					"epType": "rest",
					"serviceGroup": "soapEp",
					"serviceName": "simpleservice",
					"servicePort": 4100,
					"serviceVersion": 1,
					"requestTimeout": 50,
					"requestTimeoutRenewal": 5,
					"authentications": [
						{
							"name": "None",
							"category": "N/A"
						},
						{
							"name": "soap",
							"category": "soapbasicauth",
							"isDefault": true
						}
					],
					"prerequisites": {},
					"swaggerInput": "",
					"schema": {
						"commonFields": {
							"a": {}
						},
						"post": {
							"/GetDatabases": {
								"_apiInfo": {
									"l": "List the databases available on the MI Server.",
									"group": "granta_group"
								},
								"imfv": {
									"commonFields": [
										'a'
									],
									"custom": {
										'b': {}
									}
								}
							},
							"/GetTables": {
								"_apiInfo": {
									"l": "List the tables contained in a particular MI Database.",
									"group": "granta_group"
								},
								"imfv": {
									"commonFields": [],
									"custom": {
										"tableFilter": {
											"required": false,
											"source": [
												"params.tableFilter",
												"query.tableFilter",
												"body.tableFilter"
											],
											"validation": {
												"type": "string",
												"enum": [
													"NoFilter",
													"MaterialsTablesOnly",
													"ProcessesTablesOnly",
													"SubstancesTablesOnly",
													"LegislationsTablesOnly",
													"TransportTypesTablesOnly",
													"RegionsTablesOnly",
													"EndOfLifeOptionsTablesOnly",
													"EnergyConversionOptionsTablesOnly",
													"CoatingsTablesOnly",
													"PartsTablesOnly",
													"InHouseTablesOnly",
													"SequenceSpecificationsTablesOnly",
													"ElementsTablesOnly",
													"UniverseTablesOnly",
													"ProducersTablesOnly",
													"ShapeTablesOnly",
													"ReferenceTablesOnly",
													"MobileUseTypesTablesOnly"
												]
											}
										},
										"dbKey": {
											"required": false,
											"source": [
												"params.dbKey",
												"query.dbKey",
												"body.dbKey"
											],
											"validation": {
												"type": "string"
											}
										},
										"attributeSelectors": {
											"required": false,
											"source": [
												"params.attributeSelectors",
												"query.attributeSelectors",
												"body.attributeSelectors"
											],
											"validation": {
												"type": "string"
											}
										}
									}
								}
							}
						}
					},
					"defaultAuthentication": "Granta"
				},
				{
					"epType": "rest",
					"serviceGroup": "books",
					"serviceName": "swaggerservice",
					"servicePort": 4444,
					"serviceVersion": 1,
					"requestTimeout": 30,
					"requestTimeoutRenewal": 5,
					"oauth": true,
					"extKeyRequired": true,
					"authentications": [
						{
							"name": "None",
							"category": "N/A",
							"isDefault": true
						}
					],
					"defaultAuthentication": "None",
					"prerequisites": {},
					"swaggerInput": "swagger: '2.0'\ninfo:\n    version: 1.0.0\n    title: magazines\nhost: localhost\nbasePath: /magazines\nschemes:\n    - http\npaths:\n    /list:\n        get:\n            tags:\n                - magazines\n            summary: 'get all magazines'\n            operationId: getallmagazines\n            parameters:\n                -\n                    name: start\n                    required: true\n                    in: query\n                    type: integer\n                -\n                    name: limit\n                    required: true\n                    in: query\n                    type: integer\n    /:\n        get:\n            tags:\n                - magazines\n            summary: 'get one magazine'\n            operationId: getonemagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n        post:\n            tags:\n                - magazines\n            summary: 'Add a new magazine'\n            operationId: Addanewmagazine\n            parameters:\n                -\n                    $ref: '#/parameters/data'\n        delete:\n            tags:\n                - magazines\n            summary: 'delete magazine'\n            operationId: deletemagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n        put:\n            tags:\n                - magazines\n            summary: 'Update an existing magazine'\n            operationId: Updateanexistingmagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n                -\n                    $ref: '#/parameters/data'\nparameters:\n    id:\n        name: id\n        required: true\n        in: path\n        type: string\n    data:\n        name: data\n        required: true\n        in: body\n        schema:\n            type: object\n            properties:\n                title:\n                    type: string\n                number:\n                    type: integer\n                date:\n                    type: string\n            required:\n                - title\n                - number\n                - date\n",
					"schema": {
						"commonFields": {
							"id": {
								"required": true,
								"source": [
									"params.id"
								],
								"validation": {
									"type": "string"
								}
							},
							"data": {
								"required": true,
								"source": [
									"body.data"
								],
								"validation": {
									"type": "object",
									"properties": {
										"title": {
											"required": true,
											"type": "string"
										},
										"number": {
											"required": true,
											"type": "integer"
										},
										"date": {
											"required": true,
											"type": "string"
										}
									}
								}
							}
						},
						"get": {
							"/list": {
								"_apiInfo": {
									"group": "magazines",
									"l": "get all magazines"
								},
								"imfv": {
									"custom": {
										"start": {
											"required": true,
											"source": [
												"query.start"
											],
											"validation": {
												"type": "integer"
											}
										},
										"limit": {
											"required": true,
											"source": [
												"query.limit"
											],
											"validation": {
												"type": "integer"
											}
										}
									}
								}
							},
							"/": {
								"_apiInfo": {
									"l": "get one magazine",
									"group": "magazines"
								},
								"imfv": {
									"commonFields": [
										"id"
									],
									"custom": {}
								}
							}
						},
						"post": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "Add a new magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"data"
									]
								}
							}
						},
						"delete": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "delete magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"id"
									]
								}
							}
						},
						"put": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "Update an existing magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"id",
										"data"
									]
								}
							}
						}
					}
				}
			]
		}
	},
	"deploy": {
		"database": {
			"pre": {},
			"steps": {},
			"post": {}
		},
		"deployments": {
			"pre": {},
			"steps": {},
			"post": {}
		}
	}
};