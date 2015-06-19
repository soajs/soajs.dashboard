function buildFormWithModal($scope, $modal, opts) {
	var formConfig = angular.copy(opts.form);
	formConfig.name = opts.name;
	formConfig.label = opts.label;
	formConfig.actions = opts.actions;
	formConfig.timeout = opts.timeout;
	formConfig.msgs = opts.msgs;
	formConfig.buttonLabels = opts.buttonLabels;
	formConfig.data = opts.data;

	var m = ($modal && $modal !== null) ? true : false;

	buildForm($scope, m, formConfig, function() {
		if(opts.postBuild && (typeof(opts.postBuild) == 'function')) {
			opts.postBuild();
		}
	});

	if($modal && $modal !== null) {
		var formContext = $scope;
		$scope.form.openForm = function() {
			$modal.open({
				template: "<ngform></ngform>",
				size: 'lg',
				backdrop: false,
				keyboard: false,
				controller: function($scope, $modalInstance) {
					$scope.form = formContext.form;
					formContext.modalInstance = $modalInstance;
				}
			});
		};
		$scope.form.openForm();

		$scope.form.closeModal = function() {
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

	context.form.closeAlert = function(i) {
		context.form.alerts.splice(i, 1);
	};

	context.form.displayAlert = function(type, msg) {
		context.form.alerts = [];
		context.form.alerts.push({'type': type, 'msg': msg});
		context.form.closeAllAlerts();
	};

	context.form.closeAllAlerts = function(instant) {
		if(instant){
			context.form.alerts = [];
		}
		else{
			context.form.timeout(function() { context.form.alerts = []; }, 7000);
		}
	};

	function rebuildData(fieldEntry) {
		var keys = Object.keys(configuration.data);
		keys.forEach(function(inputName) {
			if(fieldEntry.name === inputName) {
				if(Array.isArray(fieldEntry.value)) {
					fieldEntry.value.forEach(function(oneValue) {
						if(Array.isArray(configuration.data[inputName])) {
							if(configuration.data[inputName].indexOf(oneValue.v) !== -1) {
								oneValue.selected = true;
							}
						}
						else if(oneValue.v === configuration.data[inputName]) {
							oneValue.selected = true;
						}
					});
				}
				else {
					fieldEntry.value = configuration.data[inputName];
				}
			}
		});
	}

	function updateFormData(oneEntry) {
		if(oneEntry.value) {
			if(Array.isArray(oneEntry.value)) {
				context.form.formData[oneEntry.name] = [];
				oneEntry.value.forEach(function(oneValue) {
					if(oneValue.selected === true) {
						context.form.formData[oneEntry.name].push(oneValue.v);
					}
				});
			}
			else {
				context.form.formData[oneEntry.name] = oneEntry.value;
			}
		}

		if(oneEntry.type === 'date-picker') {
			if(typeof(oneEntry.min) === 'object') {
				oneEntry.min = oneEntry.min.getTime();
			}

			oneEntry.openDate = function($event, index) {
				$event.preventDefault();
				$event.stopPropagation();
				context.form.entries[index].opened = true;
			};
		}

		if(oneEntry.type === 'select') {
			if(oneEntry.onChange && typeof(oneEntry.onChange.action) === 'function') {
				oneEntry.action = oneEntry.onChange;
			}
			else {
				oneEntry.action = {};
			}
		}
	}

	if(configuration.data) {
		for(var i = 0; i < context.form.entries.length; i++) {
			if(context.form.entries[i].type === 'group') {
				context.form.entries[i].entries.forEach(function(oneSubEntry) {
					rebuildData(oneSubEntry);
				});
			}
			else {
				rebuildData(context.form.entries[i]);
			}
		}
	}

	for(var i = 0; i < context.form.entries.length; i++) {
		if(context.form.entries[i].type === 'group') {
			context.form.entries[i].icon = (context.form.entries[i].collapsed) ? "plus" : "minus";
			context.form.entries[i].entries.forEach(function(oneSubEntry) {
				updateFormData(oneSubEntry);
			});
		}
		else {
			updateFormData(context.form.entries[i]);
		}
	}

	context.form.do = function(functionObj) {
		if(functionObj.type === 'submit') {
			if(context.form.itemsAreValid()) {
				functionObj.action(context.form.formData);
			}
		}
		else {
			functionObj.action();
		}
	};
	context.form.callObj = function(functionObj) {
		if(functionObj) {
			if(functionObj.action) {
				functionObj.action();
			}
		}
	};
	context.form.call = function(action, id, data) {
		if(action) {
			if(typeof(action) == 'function') {
				action(id, data);
			}
		}
	};

	// testAction
	context.form.itemsAreValid = function() {
		var entries = context.form.entries;
		var data = context.form.formData;
		// for external keys, the form might be empty
		//if(JSON.stringify(data) === '{}') { return false; }
		for(var i = 0; i < entries.length; i++) {
			var oneEntry = entries[i];
			if(oneEntry.required && (!data[oneEntry.name] || data[oneEntry.name] === 'undefined' || data[oneEntry.name] === '')) {
				return false;
			}
		}
		return true;
	};

	context.form.toggleSelection = function(fieldName, value) {
		if(!context.form.formData[fieldName]) {
			context.form.formData[fieldName] = [];
		}

		if(context.form.formData[fieldName].indexOf(value) === -1) {
			context.form.formData[fieldName].push(value);
		}
		else {
			var idx = context.form.formData[fieldName].indexOf(value);
			context.form.formData[fieldName].splice(idx, 1);
		}
	};
	if(cb && (typeof(cb) == 'function')) {
		context.form.timeout(function() {
			cb();
		}, 1000);
	}

	context.form.showHide = function(oneEntry) {
		var name = oneEntry.name;

		if(oneEntry.collapsed) {
			oneEntry.collapsed = false;
			oneEntry.icon = "minus";
			//jQuery('#' + name).slideDown(1000);
		}
		else {
			oneEntry.collapsed = true;
			oneEntry.icon = "plus";
			//jQuery('#' + name).slideUp(1000);
		}
	};
}

soajsApp.directive('ngform', function() {
	return {
		restrict: 'E',
		templateUrl: 'lib/form/form.tmpl'
	};
});