'use strict';
//done
var topbeat = [
	{
		"id": "Topbeat-%injector%",
		"_type": "dashboard",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"title": "Metrics-%injector%",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"System-load-%injector%\",\"panelIndex\":2,\"row\":1,\"size_x\":12,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Process-status-%injector%\",\"panelIndex\":4,\"row\":5,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Memory-usage-%injector%\",\"panelIndex\":5,\"row\":9,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"CPU-usage-%injector%\",\"panelIndex\":7,\"row\":9,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"CPU-usage-per-process-%injector%\",\"panelIndex\":8,\"row\":13,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Memory-usage-per-process-%injector%\",\"panelIndex\":9,\"row\":13,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-processes-%injector%\",\"panelIndex\":10,\"row\":17,\"size_x\":6,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Servers-%injector%\",\"panelIndex\":11,\"row\":5,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Disk-utilization-over-time-%injector%\",\"panelIndex\":12,\"row\":17,\"size_x\":6,\"size_y\":5,\"type\":\"visualization\"},{\"id\":\"Disk-usage-%injector%\",\"type\":\"visualization\",\"panelIndex\":13,\"size_x\":6,\"size_y\":4,\"col\":1,\"row\":22},{\"id\":\"Disk-usage-overview-%injector%\",\"type\":\"visualization\",\"panelIndex\":14,\"size_x\":6,\"size_y\":4,\"col\":7,\"row\":22}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	}
];

module.exports = topbeat;