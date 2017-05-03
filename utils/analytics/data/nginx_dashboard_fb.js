'use strict';
var nginx = [
	{
		"id": "Filebeat-%injector%",
		"_type": "dashboard",
		"_shipper": "filebeat",
		"_service": "nginx",
		"_injector": "service",
		"_source": {
			"env": "%env%",
			"title": "Nginx-%injector%",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"TimeStamp-nginx-dashboard\",\"panelIndex\":1,\"row\":7,\"size_x\":12,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Bytes-nginx-dashboard\",\"panelIndex\":2,\"row\":3,\"size_x\":12,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-10-IP's-nginx-dashboard\",\"panelIndex\":3,\"row\":11,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":5,\"id\":\"Agents-nginx-dashboard\",\"panelIndex\":4,\"row\":11,\"size_x\":5,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Map-nginx-dashboard\",\"panelIndex\":6,\"row\":15,\"size_x\":12,\"size_y\":4,\"type\":\"visualization\"},{\"col\":10,\"id\":\"Response-Codes-nginx-dashboard\",\"panelIndex\":7,\"row\":11,\"size_x\":3,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-10-Requests-nginx-dashboard\",\"panelIndex\":8,\"row\":19,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Top-10-Countries-nginx-dashboard\",\"panelIndex\":9,\"row\":19,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-10-Nginx-Errors-nginx-dashboard\",\"panelIndex\":10,\"row\":23,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Sum-of-bytes-nginx-dashboard\",\"panelIndex\":11,\"row\":1,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":3,\"id\":\"request-count-nginx-dashboard\",\"panelIndex\":12,\"row\":1,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Top-5-Methods-nginx-dashboard\",\"panelIndex\":13,\"row\":23,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":7,\"id\":\"error-count-nginx-dashboard\",\"panelIndex\":14,\"row\":1,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":5,\"id\":\"nginx-access-count-nginx-dashboard\",\"panelIndex\":15,\"row\":1,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":9,\"id\":\"Time-Picker\",\"panelIndex\":16,\"row\":1,\"size_x\":4,\"size_y\":2,\"type\":\"visualization\"}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-10\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}},\"P-3\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}},\"P-4\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-6\":{\"mapCenter\":[14.944784875088372,0.3515625],\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-7\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}},\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}},\"P-8\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}},\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}},\"P-9\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	}
];

module.exports = nginx;