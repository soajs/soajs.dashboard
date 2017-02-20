'use strict';
//done

//todo:
//_injector: ["taskname", "service", "env"]
var visuals = [
	{
		"id": "System-load-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"line\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"showCircles\":true,\"smoothLines\":false,\"interpolate\":\"linear\",\"scale\":\"linear\",\"drawLinesBetweenPoints\":true,\"radiusRatio\":9,\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"load.load1\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "System load",
			"version": 1,
			"savedSearchId": "System-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Servers-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"title": "Servers",
			"visState": "{\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"cpu.user_p\"}},{\"id\":\"3\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"cpu.system_p\"}},{\"id\":\"4\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"mem.total\"}},{\"id\":\"5\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"mem.used\"}},{\"id\":\"8\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"mem.used_p\"}},{\"id\":\"6\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"mem.free\"}},{\"id\":\"9\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{},\"title\":\"Servers\"}",
			"uiStateJSON": "{}",
			"description": "",
			"savedSearchId": "System-stats-%injector%",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Process-status-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"pie\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"isDonut\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"cardinality\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.pid\"}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"proc.state\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "Process status",
			"uiStateJSON": "{}",
			"version": 1,
			"savedSearchId": "Proc-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Memory-usage-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"mem.used_p\"}},{\"id\":\"2\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"swap.used_p\"}},{\"id\":\"3\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"4\",\"type\":\"terms\",\"schema\":\"split\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"row\":true}}],\"listeners\":{}}",
			"description": "",
			"title": "Memory usage",
			"uiStateJSON": "{}",
			"version": 1,
			"savedSearchId": "System-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "CPU-usage-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"cpu.system_p\"}},{\"id\":\"2\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"cpu.user_p\"}},{\"id\":\"3\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"4\",\"type\":\"terms\",\"schema\":\"split\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"row\":true}}],\"listeners\":{}}",
			"description": "",
			"title": "CPU usage",
			"uiStateJSON": "{}",
			"version": 1,
			"savedSearchId": "System-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "CPU-usage-per-process-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.cpu.user_p\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"proc.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "CPU usage per process",
			"version": 1,
			"savedSearchId": "Proc-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Memory-usage-per-process-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"title": "Memory usage per process",
			"visState": "{\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.mem.rss_p\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"proc.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{},\"title\":\"Memory usage per process\"}",
			"uiStateJSON": "{}",
			"description": "",
			"savedSearchId": "Proc-stats-%injector%",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-processes-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.cpu.user_p\"}},{\"id\":\"2\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.mem.rss\"}},{\"id\":\"3\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.mem.rss_p\"}},{\"id\":\"5\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"proc.mem.share\"}},{\"id\":\"6\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"proc.name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "Top processes",
			"version": 1,
			"savedSearchId": "Proc-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Disk-utilization-over-time-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"overlap\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.used_p\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"split\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"row\":true}},{\"id\":\"4\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"fs.mount_point\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "Disk utilization over time",
			"uiStateJSON": "{}",
			"version": 1,
			"savedSearchId": "Filesystem-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Disk-usage-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.used\"}},{\"id\":\"2\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.used_p\"}},{\"id\":\"3\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.total\"}},{\"id\":\"4\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.free\"}},{\"id\":\"5\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.free\"}},{\"id\":\"6\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"fs.device_name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}},{\"id\":\"7\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"fs.mount_point\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "Disk usage",
			"version": 1,
			"savedSearchId": "Filesystem-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Disk-usage-overview-%injector%",
		"_type": "visualization",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"visState": "{\"type\":\"histogram\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"scale\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"fs.used_p\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"beat.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"description": "",
			"title": "Disk usage overview",
			"version": 1,
			"savedSearchId": "Filesystem-stats-%injector%",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	}
];

module.exports = visuals;