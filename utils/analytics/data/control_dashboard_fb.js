'use strict';
//done + peter
//keep out for now
var controller = [
		{
			"id": "controller-%injector%",
			"_type": "dashboard",
			"_shipper": "filebeat",
			"_service": "controller",
			"_injector": "taskname",
			"_source": {
				"title": "controller",
				"hits": 0,
				"description": "",
				"panelsJSON": "[{\"col\":1,\"id\":\"System-load-2\",\"panelIndex\":1,\"row\":7,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Servers-2\",\"panelIndex\":3,\"row\":10,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Memory-usage-per-process-2\",\"panelIndex\":5,\"row\":10,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"CPU-usage-per-process-2\",\"panelIndex\":6,\"row\":14,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-processes-2\",\"panelIndex\":7,\"row\":14,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Controller-top-10-errors\",\"panelIndex\":10,\"row\":1,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":5,\"id\":\"Controller-top-10-Warnings\",\"panelIndex\":11,\"row\":1,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":9,\"id\":\"Controller-top-10-Fatal\",\"panelIndex\":12,\"row\":1,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":4,\"id\":\"date-time-picker\",\"panelIndex\":13,\"row\":5,\"size_x\":8,\"size_y\":2,\"type\":\"visualization\"}]",
				"optionsJSON": "{\"darkTheme\":false}",
				"uiStateJSON": "{}",
				"version": 1,
				"timeRestore": true,
				"timeTo": "2016-12-19T14:09:00.000Z",
				"timeFrom": "2016-12-19T14:00:00.000Z",
				"kibanaSavedObjectMeta": {
					"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
				}
			}
		}
];

module.exports = controller;