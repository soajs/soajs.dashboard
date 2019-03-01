"use strict";
module.exports = {
	"type": "object",
	"required": true,
	"properties": {
		"type": {
			"type": "string",
			"enum": [
				"service"
			]
		},
		"dbs": {
			"type": "array",
			"required": false,
			"items": {
				"type": "object",
				"properties": {
					"prefix": {
						"type": "string"
					},
					"name": {
						"type": "string",
						"required": true
					},
					"multitenant": {
						"type": "boolean",
						"required": false
					}
				}
			},
			"minItems": 1,
			"uniqueItems": true
		},
		"models": {
			"path": "string",
			"name": "string"
		},
		"injection": {
			"type": "boolean"
		},
		"serviceVersion": {
			"type": "string",
			"required": true
		},
		"serviceName": {
			"type": "string",
			"minLength": "3",
			"required": true
		},
		"serviceGroup": {
			"type": "string",
			"minLength": "3",
			"required": true
		},
		"servicePort": {
			"type": "integer",
			"min": 4100,
			"required": true
		},
		"prerequisites": {
			"type": "object",
			"required": true
		},
		"requestTimeout": {
			"type": "integer",
			"min": 10
		},
		"requestTimeoutRenewal": {
			"type": "integer",
			"max": 10
		},
		"extKeyRequired": {
			"type": "boolean"
		},
		"session": {
			"type": "boolean"
		},
		"swagger": {
			"type": "boolean"
		},
		"acl": {
			"type": "boolean"
		},
		"oauth": {
			"type": "boolean"
		},
		"security": {
			"type": "boolean"
		},
		"roaming": {
			"type": "boolean"
		},
		"awareness": {
			"type": "boolean"
		},
		"awarenessEnv": {
			"type": "boolean"
		},
		"errors": {
			"oneOf": [
				{
					"type": "object",
					"required": false,
					"patternProperties": {
						"^[0-9]+$": {
							"type": "string",
							"required": true,
							"minLength": 5
						}
					}
				},
				{
					"type": "string",
					"required": false
				}
			]
		},
		"schema": {
			"oneOf": [
				{
					"type": "object",
					"required": true,
					"properties": {
						"commonFields": {
							"oneOf": [
								{
									"type": "string",
									"required": true,
									"pattern": "^/[^/]+(/[^/]+)*$"
								},
								{
									"type": "object",
									"additionalProperties": {
										"type": "object",
										"properties": {
											"required": {
												"type": "boolean",
												"required": true
											},
											"source": {
												"type": "array",
												"minItems": 1,
												"items": {
													"type": "string"
												},
												"required": true
											},
											"validation": {
												"oneOf": [
													{
														"type": "object",
														"required": true,
														"additionalProperties": true
													},
													{
														"type": "string",
														"required": true
													}
												]
											}
										}
									}
								}
							]
						},
						"patternProperties": {
							"oneOf": [
								{
									"^/[a-zA-Z0-9_.-]+$": {
										"type": "object",
										"properties": {
											"method": {
												"type": "string",
												"required": false,
												"enum": [
													"GET",
													"POST",
													"PUT",
													"DELETE",
													"DEL"
												]
											},
											"mw": {
												"type": "string",
												"required": false,
												"pattern": "^/[^/]+(/[^/]+)*$"
											},
											"imfv": {
												"required": false,
												"type": "object",
												"properties": {
													"commonFields": {
														"type": "array",
														"required": false,
														"items": {
															"type": "string"
														},
														"uniqueItems": true
													},
													"custom": {
														"oneOf": [
															{
																"type": "string",
																"required": false,
																"pattern": "^/[^/]+(/[^/]+)*$"
															},
															{
																"type": "object",
																"required": false,
																"properties": {
																	"required": {
																		"type": "boolean",
																		"required": true
																	},
																	"source": {
																		"type": "array",
																		"minItems": 1,
																		"items": {
																			"type": "string"
																		},
																		"required": true
																	},
																	"validation": {
																		"oneOf": [
																			{
																				"type": "object",
																				"required": true,
																				"additionalProperties": true
																			},
																			{
																				"type": "string",
																				"required": true
																			}
																		]
																	}
																}
															}
														]
													}
												}
											},
											"_apiInfo": {
												"requried": true,
												"type": "object",
												"properties": {
													"l": {
														"type": "string",
														"requried": true
													},
													"group": {
														"type": "string",
														"requried": true
													},
													"groupMain": {
														"type": "boolean"
													}
												}
											},
											"commonFields": {
												"type": "array",
												"minItems": 1,
												"items": {
													"type": "string"
												}
											},
											"additionalProperties": {
												"type": "object",
												"properties": {
													"required": {
														"type": "boolean",
														"required": true
													},
													"source": {
														"type": "array",
														"minItems": 1,
														"items": {
															"type": "string"
														},
														"required": true
													},
													"validation": {
														"oneOf": [
															{
																"type": "object",
																"required": true,
																"additionalProperties": true
															},
															{
																"type": "string",
																"required": true
															}
														]
													}
												}
											}
										}
									}
								},
								{
									"type": "object",
									"required": true,
									"patternProperties": {
										"^/[a-zA-Z0-9_.-]+$": {
											"type": "object",
											"properties": {
												"method": {
													"type": "string",
													"required": false,
													"enum": [
														"GET",
														"POST",
														"PUT",
														"DELETE",
														"DEL"
													]
												},
												"mw": {
													"type": "string",
													"required": false,
													"pattern": "^/[^/]+(/[^/]+)*$"
												},
												"imfv": {
													"required": false,
													"type": "object",
													"properties": {
														"commonFields": {
															"type": "array",
															"required": false,
															"items": {
																"type": "string"
															},
															"uniqueItems": true
														},
														"custom": {
															"oneOf": [
																{
																	"type": "string",
																	"required": false,
																	"pattern": "^/[^/]+(/[^/]+)*$"
																},
																{
																	"type": "object",
																	"required": false,
																	"properties": {
																		"required": {
																			"type": "boolean",
																			"required": true
																		},
																		"source": {
																			"type": "array",
																			"minItems": 1,
																			"items": {
																				"type": "string"
																			},
																			"required": true
																		},
																		"validation": {
																			"oneOf": [
																				{
																					"type": "object",
																					"required": true,
																					"additionalProperties": true
																				},
																				{
																					"type": "string",
																					"required": true
																				}
																			]
																		}
																	}
																}
															]
														}
													}
												},
												"_apiInfo": {
													"requried": true,
													"type": "object",
													"properties": {
														"l": {
															"type": "string",
															"requried": true
														},
														"group": {
															"type": "string",
															"requried": true
														},
														"groupMain": {
															"type": "boolean"
														}
													}
												},
												"commonFields": {
													"type": "array",
													"minItems": 1,
													"items": {
														"type": "string"
													}
												},
												"additionalProperties": {
													"type": "object",
													"properties": {
														"required": {
															"type": "boolean",
															"required": true
														},
														"source": {
															"type": "array",
															"minItems": 1,
															"items": {
																"type": "string"
															},
															"required": true
														},
														"validation": {
															"oneOf": [
																{
																	"type": "object",
																	"required": true,
																	"additionalProperties": true
																},
																{
																	"type": "string",
																	"required": true
																}
															]
														}
													}
												}
											}
										}
									}
								}
							]
						}
					}
				},
				{
					"type": "string",
					"required": false
				}
			]
		}
	}
};