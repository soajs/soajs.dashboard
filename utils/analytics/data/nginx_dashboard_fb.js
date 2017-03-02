'use strict';
//done
var nginx = [
	{
		"id": "Filebeat-%injector%",
		"_type": "dashboard",
		"_shipper": "filebeat",
		"_service": "nginx",
		"_injector": "service",
		"_source": {
			"title": "Nginx-%injector%",
			"hits": 0,
			"description": "",
			"panelsJSON": "[{\"col\":1,\"id\":\"TimeStamp-%injector%\",\"panelIndex\":1,\"row\":5,\"size_x\":10,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Bytes-%injector%\",\"panelIndex\":2,\"row\":1,\"size_x\":10,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-10-IP's-%injector%\",\"panelIndex\":3,\"row\":9,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":5,\"id\":\"Agents-%injector%\",\"panelIndex\":4,\"row\":9,\"size_x\":5,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Map-%injector%\",\"panelIndex\":6,\"row\":13,\"size_x\":5,\"size_y\":4,\"type\":\"visualization\"},{\"col\":10,\"id\":\"Response-Codes-%injector%\",\"panelIndex\":7,\"row\":9,\"size_x\":3,\"size_y\":4,\"type\":\"visualization\"},{\"col\":10,\"id\":\"Top-10-Requests-%injector%\",\"panelIndex\":8,\"row\":13,\"size_x\":3,\"size_y\":4,\"type\":\"visualization\"},{\"col\":6,\"id\":\"Top-10-Countries-%injector%\",\"panelIndex\":9,\"row\":13,\"size_x\":4,\"size_y\":4,\"type\":\"visualization\"},{\"col\":1,\"id\":\"Top-10-Nginx-Errors-%injector%\",\"panelIndex\":10,\"row\":17,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":11,\"id\":\"Sum-of-bytes-%injector%\",\"panelIndex\":11,\"row\":1,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":11,\"id\":\"request-count-%injector%\",\"panelIndex\":12,\"row\":3,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":7,\"id\":\"Top-5-Methods-%injector%\",\"panelIndex\":13,\"row\":17,\"size_x\":6,\"size_y\":4,\"type\":\"visualization\"},{\"col\":11,\"id\":\"error-count-%injector%\",\"panelIndex\":14,\"row\":7,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"},{\"col\":11,\"id\":\"nginx-access-count-%injector%\",\"panelIndex\":15,\"row\":5,\"size_x\":2,\"size_y\":2,\"type\":\"visualization\"}]",
			"optionsJSON": "{\"darkTheme\":false}",
			"uiStateJSON": "{\"P-4\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-6\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-7\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-8\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}},\"P-9\":{\"spy\":{\"mode\":{\"fill\":false,\"name\":null}}}}",
			"version": 1,
			"timeRestore": false,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[{\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}]}"
			}
		}
	}
];

module.exports = nginx;