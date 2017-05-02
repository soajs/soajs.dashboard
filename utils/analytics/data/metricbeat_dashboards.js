'use strict';
var dashboards = [
	{
		"id": "Metricbeat-Docker-container",
		"_type": "dashboard",
		"_shipper": "metricbeat",
		"_source": {
			"env": "%env%",
			"title": "Metricbeat-Docker-container",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"Docker-CPU-usage\",\"panelIndex\":4,\"row\":3,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Docker-memory-usage\",\"panelIndex\":5,\"row\":3,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Network-IO\",\"panelIndex\":6,\"row\":7,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Container\",\"panelIndex\":7,\"row\":1,\"size_x\":12,\"size_y\":2,\"type\":\"visualization\"}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-5\":{\"vis\":{\"legendOpen\":true}},\"P-7\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}}}]}"
			}
		}
	},
	{
		"id": "Metricbeat-Docker-service",
		"_type": "dashboard",
		"_shipper": "metricbeat",
		"_source": {
			"env": "%env%",
			"title": "Metricbeat-Docker-service",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"Docker-CPU-usage\",\"panelIndex\":4,\"row\":4,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Docker-memory-usage\",\"panelIndex\":5,\"row\":4,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Docker-Network-IO\",\"panelIndex\":6,\"row\":8,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"size_x\":12,\"size_y\":3,\"panelIndex\":8,\"type\":\"visualization\",\"id\":\"Docker-Containers\",\"col\":1,\"row\":1}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-5\":{\"vis\":{\"legendOpen\":true}},\"P-7\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}}}]}"
			}
		}
	}
];

module.exports = dashboards;