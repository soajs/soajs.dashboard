'use strict';
//done
var mappings = [
	{   "_type": 'mapping',
		"_json": {
			"search": {
				"properties": {
					"columns": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"description": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"hits": {
						"type": "integer"
					},
					"kibanaSavedObjectMeta": {
						"properties": {
							"searchSourceJSON": {
								"type": "text",
								"fields": {
									"keyword": {
										"type": "keyword",
										"ignore_above": 256
									}
								}
							}
						}
					},
					"sort": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"title": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"version": {
						"type": "integer"
					}
				}
			},
			"dashboard": {
				"properties": {
					"description": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"hits": {
						"type": "integer"
					},
					"kibanaSavedObjectMeta": {
						"properties": {
							"searchSourceJSON": {
								"type": "text",
								"fields": {
									"keyword": {
										"type": "keyword",
										"ignore_above": 256
									}
								}
							}
						}
					},
					"optionsJSON": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"panelsJSON": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"timeRestore": {
						"type": "boolean"
					},
					"title": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"uiStateJSON": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"version": {
						"type": "integer"
					}
				}
			},
			"visualization": {
				"properties": {
					"description": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"kibanaSavedObjectMeta": {
						"properties": {
							"searchSourceJSON": {
								"type": "text",
								"fields": {
									"keyword": {
										"type": "keyword",
										"ignore_above": 256
									}
								}
							}
						}
					},
					"savedSearchId": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"title": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"uiStateJSON": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					},
					"version": {
						"type": "integer"
					},
					"visState": {
						"type": "text",
						"fields": {
							"keyword": {
								"type": "keyword",
								"ignore_above": 256
							}
						}
					}
				}
			}
		}
	}
];

module.exports = mappings;