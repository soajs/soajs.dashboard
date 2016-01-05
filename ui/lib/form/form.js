function buildFormWithModal($scope, $modal, opts, cb) {
	var formConfig = angular.copy(opts.form);
	formConfig.name = opts.name;
	formConfig.label = opts.label;
	formConfig.actions = opts.actions;
	formConfig.timeout = opts.timeout;
	formConfig.msgs = opts.msgs;
	formConfig.buttonLabels = opts.buttonLabels;
	formConfig.data = opts.data;
	formConfig.ngDataApi = opts.ngDataApi;

	var m = ($modal && $modal !== null) ? true : false;

	buildForm($scope, m, formConfig, function () {
		if (opts.postBuild && (typeof(opts.postBuild) == 'function')) {
			opts.postBuild();
		}
	});

	if ($modal && $modal !== null) {
		var formContext = $scope;
		$scope.form.openForm = function () {
			$modal.open({
				template: "<ngform></ngform>",
				size: 'lg',
				backdropClass: "backdrop-soajs",
				backdrop: true,
				keyboard: false,
				controller: function ($scope, $modalInstance) {
					$scope.form = formContext.form;
					formContext.modalInstance = $modalInstance;
					formContext.modalScope = $scope;
					fixBackDrop();
					if (cb && typeof(cb) === 'function') {
						cb();
					}
				}
			});
		};
		$scope.form.openForm();

		$scope.form.closeModal = function () {
			$scope.modalInstance.close();
		};

	}
}

function buildForm(context, modal, configuration, cb) {
	context.form = {
		alerts: [],
		label: configuration.label,
		msgs: configuration.msgs,
		action: configuration.action,
		entries: configuration.entries,
		timeout: configuration.timeout,
		modal: modal,
		actions: configuration.actions,
		labels: {},
		formData: {}
	};

	context.form.closeAlert = function (i) {
		context.form.alerts.splice(i, 1);
	};

	context.form.displayAlert = function (type, msg) {
		context.form.alerts = [];
		context.form.alerts.push({'type': type, 'msg': msg});
		context.form.closeAllAlerts();
	};

	context.form.closeAllAlerts = function (instant) {
		if (instant) {
			context.form.alerts = [];
		}
		else {
			context.form.timeout(function () {
				context.form.alerts = [];
			}, 7000);
		}
	};

	function rebuildData(fieldEntry) {
		var keys = Object.keys(configuration.data);
		keys.forEach(function (inputName) {
			if (fieldEntry.name === inputName) {
				if (Array.isArray(fieldEntry.value)) {
					fieldEntry.value.forEach(function (oneValue) {
						oneValue.selected = false;
						if (Array.isArray(configuration.data[inputName])) {
							if (configuration.data[inputName].indexOf(oneValue.v) !== -1) {
								oneValue.selected = true;
							}
						}
						else if (oneValue.v === configuration.data[inputName]) {
							oneValue.selected = true;
						}
					});
				}
				else {
					fieldEntry.value = configuration.data[inputName];
					context.form.formData[inputName] = configuration.data[inputName];
				}
			}
		});
	}

	function updateFormData(oneEntry) {
		if (oneEntry.value) {
			if (Array.isArray(oneEntry.value)) {
				context.form.formData[oneEntry.name] = [];
				oneEntry.value.forEach(function (oneValue) {
					if (oneValue.selected === true) {
						context.form.formData[oneEntry.name].push(oneValue.v);
					}
				});
			}
			else {
				context.form.formData[oneEntry.name] = oneEntry.value;
			}
		}
		else if (oneEntry.type === 'number') {
			if (oneEntry.value === 0) {
				context.form.formData[oneEntry.name] = oneEntry.value;
			}
		}

		if (['document', 'audio', 'image', 'video'].indexOf(oneEntry.type) !== -1) {
			if (oneEntry.limit === undefined) {
				oneEntry.limit = 0;
			}
			else if (oneEntry.limit === 0) {
				oneEntry.addMore = true;
			}

			if (oneEntry.value && Array.isArray(oneEntry.value) && oneEntry.value.length > 0) {
				if (oneEntry.limit < oneEntry.value.length) {
					oneEntry.limit = oneEntry.value.length;
				}
			}
		}

		if (oneEntry.type === 'date-picker') {
			if (typeof(oneEntry.min) === 'object') {
				oneEntry.min = oneEntry.min.getTime();
			}

			oneEntry.openDate = function ($event, index) {
				$event.preventDefault();
				$event.stopPropagation();
				context.form.entries[index].opened = true;
			};
		}

		if (oneEntry.type === 'select') {
			if (oneEntry.onChange && typeof(oneEntry.onChange.action) === 'function') {
				oneEntry.action = oneEntry.onChange;
			}
			else {
				oneEntry.action = {};
			}
		}
	}

	if (configuration.data) {
		for (var i = 0; i < context.form.entries.length; i++) {
			if (context.form.entries[i].type === 'group') {
				context.form.entries[i].entries.forEach(function (oneSubEntry) {
					rebuildData(oneSubEntry);
				});
			}
			else {
				rebuildData(context.form.entries[i]);
			}
		}
		context.form.refData = configuration.data;
	}

	for (var i = 0; i < context.form.entries.length; i++) {
		if (context.form.entries[i].type === 'group') {
			context.form.entries[i].icon = (context.form.entries[i].collapsed) ? "plus" : "minus";
			context.form.entries[i].entries.forEach(function (oneSubEntry) {
				updateFormData(oneSubEntry);
			});
		}
		else {
			updateFormData(context.form.entries[i]);
		}
	}

	context.form.do = function (functionObj) {
		if (functionObj.type === 'submit') {
			var data = angular.copy(context.form.formData);
			if (context.form.itemsAreValid(data)) {
				functionObj.action(data);
			}
		}
		else {
			functionObj.action();
		}
	};
	context.form.callObj = function (functionObj) {
		if (functionObj) {
			if (functionObj.action) {
				functionObj.action();
			}
		}
	};
	context.form.call = function (action, id, data, form) {
		if (action) {
			if (typeof(action) == 'function') {
				action(id, data, form);
			}
		}
	};

	// testAction
	context.form.itemsAreValid = function (data) {
		var entries = context.form.entries;

		// for external keys, the form might be empty
		for (var i = 0; i < entries.length; i++) {
			var oneEntry = entries[i];
			if (oneEntry.type === 'group') {
				continue;
			}
			else if(oneEntry.type ==='radio' || oneEntry.type ==='select' || oneEntry.type ==='multi-select'){
				if(Array.isArray(data[oneEntry.name])){
					data[oneEntry.name] = data[oneEntry.name][0];
				}
			}
			if(data[oneEntry.name] === 'false') data[oneEntry.name] = false;
			if(data[oneEntry.name] === 'true') data[oneEntry.name] = true;

			if (oneEntry.required && (data[oneEntry.name] === null || data[oneEntry.name] === 'undefined' || data[oneEntry.name] === '')) {
				return false;
			}
		}
		return true;
	};

	context.form.toggleSelection = function (fieldName, value) {
		if (!context.form.formData[fieldName]) {
			context.form.formData[fieldName] = [];
		}

		if (context.form.formData[fieldName].indexOf(value) === -1) {
			context.form.formData[fieldName].push(value);
		}
		else {
			var idx = context.form.formData[fieldName].indexOf(value);
			context.form.formData[fieldName].splice(idx, 1);
		}
	};
	if (cb && (typeof(cb) == 'function')) {
		context.form.timeout(function () {
			cb();
		}, 1000);
	}

	context.form.showHide = function (oneEntry) {
		if (oneEntry.collapsed) {
			oneEntry.collapsed = false;
			oneEntry.icon = "minus";
		}
		else {
			oneEntry.collapsed = true;
			oneEntry.icon = "plus";
		}
	};

	context.form.addNewInput = function (input) {
		if (input.limit === 0) {
			input.limit = 1;
		}
		input.limit++;
		input.addMore = true;
	};

	context.form.downloadFile = function (config, mediaType) {
		var options = {
			routeName: config.routeName,
			method: 'get',
			headers: config.headers,
			responseType: 'arraybuffer',
			params: config.params
		};
		getSendDataFromServer(context, configuration.ngDataApi, options, function (error, data) {
			switch (mediaType) {
				case 'image':
					var blob = new Blob([data], {type: config.metadata.mime});
					var URL = window.URL || window.webkitURL;
					config.src = URL.createObjectURL(blob);
					break;
				default:
					openSaveAsDialog(config.filename, data, config.contentType);
					break;
			}
		});
	};

	context.form.removeFile = function (entry, i) {
		getSendDataFromServer(context, configuration.ngDataApi, {
			"method": "get",
			"routeName": entry.removeFileUrl + entry.value[i]._id
		}, function (error) {
			if (error) {
				context.form.displayAlert('danger', error.message);
			}
			else {
				context.form.displayAlert('success', 'File Removed Successfully.');
				//remove the html input
				var loc = context.form.formData[entry.name].indexOf(entry.value[i].v);
				context.form.formData[entry.name].splice(loc, 1);
				entry.value.splice(i, 1);
			}
		});
	};

	context.form.uploadFileToUrl = function (Upload, config, cb) {
		var options = {
			url: apiConfiguration.domain + config.uploadUrl,
			params: config.data || null,
			file: config.file,
			headers: {
				key: apiConfiguration.key
			}
		};
		if (config.headers) {
			for (var i in config.headers) {
				options.headers[i] = config.headers[i];
			}
		}

		Upload.upload(options).progress(function (evt) {
			var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			config.progress.value = progressPercentage;
		}).success(function (response, status, headers, config) {
			if (!response.result) {
				return cb(new Error(response.errors.details[0].message));
			}
			else {
				return cb(null, response);
			}
		}).error(function (data, status, header, config) {
			return cb(new Error("Error Occured while uploading file: " + config.file));
		});
	};
}

soajsApp.directive('ngform', function () {
	return {
		restrict: 'E',
		templateUrl: 'lib/form/form.tmpl'
	};
});

soajsApp.directive('fileModel', ['$parse', function ($parse) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var model = $parse(attrs.fileModel);
			var modelSetter = model.assign;

			element.bind('change', function () {
				scope.$apply(function () {
					modelSetter(scope, element[0].files[0]);
				});
			});
		}
	};
}]);

soajsApp.directive('fileModelMulti', ['$parse', function ($parse) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var model = $parse(attrs.fileModelMulti);
			var modelSetter = model.assign;

			element.bind('change', function () {
				scope.$apply(function () {
					modelSetter(scope, element[0].files);
				});
			});
		}
	};
}]);