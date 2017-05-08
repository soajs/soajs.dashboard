'use strict';
var dashboards = [
	{
		"id": "Metricbeat-Docker-task",
		"_type": "dashboard",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Metricbeat-Docker-container",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"Docker-CPU-usage\",\"panelIndex\":4,\"row\":5,\"size_x\":4,\"size_y\":5,\"type\":\"visualization\"},{\"col\":5,\"id\":\"Docker-memory-usage\",\"panelIndex\":5,\"row\":5,\"size_x\":4,\"size_y\":5,\"type\":\"visualization\"},{\"col\":9,\"id\":\"Docker-Network-IO\",\"panelIndex\":6,\"row\":5,\"size_x\":4,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Container\",\"panelIndex\":7,\"row\":3,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"size_x\":12,\"size_y\":2,\"panelIndex\":8,\"type\":\"visualization\",\"id\":\"Time-Picker\",\"col\":1,\"row\":1}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-5\":{\"vis\":{\"legendOpen\":true}},\"P-7\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}},\"P-6\":{\"vis\":{\"legendOpen\":false}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	},
	{
		"id": "Metricbeat-Docker-service",
		"_type": "dashboard",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Metricbeat-Docker-service",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"Docker-CPU-usage\",\"panelIndex\":4,\"row\":6,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Docker-memory-usage\",\"panelIndex\":5,\"row\":6,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Network-IO\",\"panelIndex\":6,\"row\":10,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Containers\",\"panelIndex\":8,\"row\":3,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Time-Picker\",\"panelIndex\":9,\"row\":1,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"},{\"size_x\":12,\"size_y\":6,\"panelIndex\":10,\"type\":\"search\",\"id\":\"Service-Errors-%env%\",\"col\":1,\"row\":15,\"columns\":[\"docker.container.name\",\"err.name\",\"err.code\",\"msg\",\"err.stack\"],\"sort\":[\"@timestamp\",\"desc\"]}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-5\":{\"vis\":{\"legendOpen\":true}},\"P-7\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}},\"P-8\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	},
	{
		"id": "Metricbeat-Docker-other",
		"_type": "dashboard",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Metricbeat-Docker-other",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"Docker-CPU-usage\",\"panelIndex\":4,\"row\":6,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Docker-memory-usage\",\"panelIndex\":5,\"row\":6,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Network-IO\",\"panelIndex\":6,\"row\":10,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Containers\",\"panelIndex\":8,\"row\":3,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Time-Picker\",\"panelIndex\":9,\"row\":1,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-5\":{\"vis\":{\"legendOpen\":true}},\"P-7\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}},\"P-8\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	}
];

module.exports = dashboards;