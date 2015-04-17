function buildFormWithModal($scope, $modal, opts) {
	var formConfig = angular.copy(opts.form);
	formConfig.name = opts.name;
	formConfig.label = opts.label;
	formConfig.actions = opts.actions;
	formConfig.timeout = opts.timeout;
	formConfig.msgs = opts.msgs;
	formConfig.buttonLabels = opts.buttonLabels;

	if(opts.data) {
		var keys = Object.keys(opts.data);
		for(var i = 0; i < formConfig.entries.length; i++) {
			keys.forEach(function(inputName) {
				if(formConfig.entries[i].name === inputName) {
					if(Array.isArray(formConfig.entries[i].value)) {
						formConfig.entries[i].value.forEach(function(oneValue) {
							if(oneValue.v === opts.data[inputName]) {
								oneValue.selected = true;
							}
						});
					}
					else {
						formConfig.entries[i].value = opts.data[inputName];
					}
				}
			});
		}
	}

	var m = ($modal && $modal !== null) ? true : false;
	buildForm($scope, m, formConfig, function(){
		if(opts.postBuild && (typeof(opts.postBuild)=='function') ){
			opts.postBuild();
		}
	});

	//if ($modal && $modal==true)
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

	context.form.displayAlert = function(type, msg) {
		context.form.alerts = [];
		context.form.alerts.push({'type': type, 'msg': msg});
		context.form.closeAllAlerts();
	};

	context.form.closeAllAlerts = function() {
		context.form.timeout(function() { context.form.alerts = []; }, 7000);
	};

	for(var i = 0; i < context.form.entries.length; i++) {
		var oneEntry = context.form.entries[i];
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
			oneEntry.min = oneEntry.min.getTime();
			oneEntry.openDate = function($event, index) {
				$event.preventDefault();
				$event.stopPropagation();
				context.form.entries[index].opened = true;
			};
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

	context.form.itemsAreValid = function() {
		var entries = context.form.entries;
		var data = context.form.formData;
		if(JSON.stringify(data) === '{}') { return false; }
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

	cb();
}

soajsApp.directive('ngform', function() {
	return {
		restrict: 'E',
		templateUrl: 'lib/form/form.tmpl'
	};
});

soajsApp.directive('ngaclform', function() {
	return {
		restrict: 'E',
		templateUrl: 'lib/form/aclForm.tmpl'
	};
});