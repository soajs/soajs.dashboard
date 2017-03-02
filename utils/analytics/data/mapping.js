'use strict';
//done
var mappings = [
	{   "_type": 'mapping',
		"_json": {
			"dashboard": {
				"properties": {
					"title": {"type": "string"},
					"hits": {"type": "integer"},
					"description": {"type": "string"},
					"panelsJSON": {
						"properties": {
							"type": {"type": "string"},
							"optionsJSON": {"type": "string"},
							"uiStateJSON": {"type": "string"},
							"version": {"type": "integer"},
							"timeRestore": {"type": "boolean"},
							"timeTo": {"type": "string"},
							"timeFrom": {"type": "string"},
							"kibanaSavedObjectMeta": {
								"properties": {
									"searchSourceJSON": {
										"type": "string"
									}
								}
							}
						}
					}
				}
			},
			"search": {"properties": {"hits": {"type": "integer"}, "version": {"type": "integer"}}}
		}
	}
];

module.exports = mappings;