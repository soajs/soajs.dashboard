'use strict';

var catalogApp = soajsApp.components;
catalogApp.controller ('catalogAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, catalogAppConfig.permissions);

    $scope.catalogImage = './themes/' + themeToUse + '/img/catalog.png';
	
    function setEditorContent(id, value, height, currentScope){
	    $timeout(function(){
	        var editor = ace.edit(id);
	        renderJSONEditor(editor, id, value, height, currentScope);
	    }, 1000);
    }
    
	function renderJSONEditor(_editor, id, value, height, currentScope){
		if(value && value !== ''){
			currentScope.form.formData[id] = value;
			_editor.setValue(JSON.stringify(value, null, 2));
		}
		else{
			currentScope.form.formData[id] = value;
			_editor.setValue('');
		}
		
		_editor.on('change', function(){
			var editor = ace.edit(id);
			let v = editor.getValue();
			if(v && v !== ''){
				try{
					currentScope.form.formData[id] = JSON.parse(v);
				}
				catch(err){
				
				}
			}
		});
		
		_editor.setShowPrintMargin(false);
		_editor.scrollToLine(0, true, true);
		_editor.clearSelection();
		var heightUpdateFunction = function () {
			var newHeight =
				_editor.getSession().getScreenLength()
				* _editor.renderer.lineHeight
				+ _editor.renderer.scrollBar.getWidth() + 10;
			
			if (height) {
				newHeight = parseInt(height);
			}
			
			_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
			_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
			jQuery('#' + id).height(newHeight.toString());
			_editor.resize(true);
		};
		
		$timeout(function () {
			_editor.heightUpdate = heightUpdateFunction();
			// Set initial size to match initial content
			heightUpdateFunction();
			
			// Whenever a change happens inside the ACE editor, update
			// the size again
			_editor.getSession().on('change', heightUpdateFunction);
			_editor.setOption("highlightActiveLine", false);
		}, 1000);
	}
	
	function reRenderEnvVar(id, value, form){
		var counter = parseInt(id.replace('envVarType', ''));
		var tmp;
		switch(value){
			case 'computed':
				tmp = angular.copy(catalogAppConfig.form.computedVar);
				break;
			case 'static':
				tmp = angular.copy(catalogAppConfig.form.staticVar);
				break;
			case 'userInput':
				tmp = angular.copy(catalogAppConfig.form.userInputVar);
				tmp.entries.forEach(function(oneEntry){
					oneEntry.name += counter;
				});
				break;
		}
		
		tmp.name += counter;
		form.formData['envVarType' + counter] = value;
		form.entries[7].tabs[1].entries.forEach(function(oneEnvVarGroup){
			if(oneEnvVarGroup.type ==='group' && oneEnvVarGroup.name === 'envVarGroup' + counter){
				if(oneEnvVarGroup.entries.length >= 5){
					oneEnvVarGroup.entries.splice(3, 1);
				}
				
				oneEnvVarGroup.entries.splice(3, 0, tmp);
			}
		});
	}
	
	$scope.upgradeAll = function(){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/upgrade'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', "Catalog Recipes have been upgraded to the latest version.");
				$scope.listRecipes();
			}
		});
	};
	
    $scope.listRecipes = function () {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/catalog/recipes/list'
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
	            $scope.originalRecipes = $scope.recipes = response;
	
	            $scope.oldStyle = false;
	            $scope.originalRecipes.forEach(function(oneRecipe){
	            	if(oneRecipe.type === 'soajs'){
			            $scope.oldStyle = true;
		            }
	            });
	            
	            if(!$scope.oldStyle){
		            $scope.recipeTypes = {};
		
		            $scope.originalRecipes.forEach(function(oneRecipe){
			            if(!oneRecipe.v){
				            oneRecipe.v = 1;
			            }
			            
			            if(!$scope.recipeTypes[oneRecipe.type]){
				            $scope.recipeTypes[oneRecipe.type] = {};
			            }
			
			            if(!$scope.recipeTypes[oneRecipe.type][oneRecipe.subtype]){
				            $scope.recipeTypes[oneRecipe.type][oneRecipe.subtype] = [];
			            }
		            });
		
		            $scope.recipes.forEach(function(oneRecipe){
			            if($scope.recipeTypes[oneRecipe.type] && $scope.recipeTypes[oneRecipe.type][oneRecipe.subtype]){
				            $scope.recipeTypes[oneRecipe.type][oneRecipe.subtype].push(oneRecipe);
			            }
		            });
	            }
	            $scope.listArchives();
	            
            }
        });
    };
	
	$scope.listArchives = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list',
			'params':{
				'version': true
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.originalArchives = $scope.archives = response;
				
				if($scope.oldStyle === false){
					$scope.originalArchives.forEach(function(oneRecipe){
						if(oneRecipe.type === 'soajs'){
							$scope.oldStyle = true;
						}
					});
				}
				
				if(!$scope.oldStyle){
					$scope.recipeTypesArchives = {};
					
					$scope.originalArchives.forEach(function(oneRecipe){
						
						if(!$scope.recipeTypesArchives[oneRecipe.type]){
							$scope.recipeTypesArchives[oneRecipe.type] = {};
						}
						
						if(!$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype]){
							$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype] = [];
						}
					});
					
					$scope.archives.forEach(function(oneRecipe){
						if($scope.recipeTypesArchives[oneRecipe.type] && $scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype]){
							$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype].push(oneRecipe);
						}
					});
				}
			}
		});
	};
    
	function proceedWithForm(currentScope, mainFormConfig, data, submitAction){
		
		var envCounter = 0, volumeCounter = 0, portCounter = 0, labelCounter = 0;
		
		$modal.open({
			templateUrl: "editRecipe.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				
				$scope.recipe = {
					v : data.v || 1,
					ts: data.ts,
					name: data.name
				};
				
				var formConfig = angular.copy(mainFormConfig);
				
				$scope.addNewEnvVar = function (){
					var envVars = angular.copy(catalogAppConfig.form.envVars);
					envVars.name += envCounter;
					
					envVars.entries[1].name += envCounter;
					envVars.entries[2].name += envCounter;
					envVars.entries[2].onAction = reRenderEnvVar;
					
					if(!submitAction){
						envVars.entries.pop();
					}
					else{
						envVars.entries[envVars.entries.length-1].name += envCounter;
						envVars.entries[envVars.entries.length-1].onAction = function(id, value, form){
							
							var count = parseInt(id.replace('envVarRemove', ''));
							for(let i = form.entries[7].tabs[1].entries.length -1; i >=0; i--){
								if(form.entries[7].tabs[1].entries[i].name === 'envVarGroup' + count){
									//remove from formData
									for(var fieldname in form.formData){
										if(['envVarName' + count, 'envVarType' + count, 'computedVar' + count, 'staticVar' + count, 'userInputLabel' + count, 'userInputDefault' + count, 'userInputFieldMsg' + count].indexOf(fieldname) !== -1){
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[7].tabs[1].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if($scope.form && $scope.form.entries){
						$scope.form.entries[7].tabs[1].entries.splice($scope.form.entries[7].tabs[1].entries.length -1,0, envVars);
					}
					else{
						formConfig[7].tabs[1].entries.splice($scope.form.entries[7].tabs[1].entries.length -1, 0, envVars);
					}
					envCounter++;
				};
				
				$scope.addNewVolume = function(value, mountValue){
					var tmp = angular.copy(catalogAppConfig.form.volumeInput);
					tmp.name += volumeCounter;
					tmp.entries[0].name += volumeCounter;
					tmp.entries[1].name += volumeCounter;
					if(!submitAction){
						tmp.entries.pop()
					}
					else{
						tmp.entries[2].name += volumeCounter;
						tmp.entries[2].onAction = function(id, value, form){
							var count = parseInt(id.replace('rVolume', ''));
							
							for(let i = form.entries[5].tabs[5].entries.length -1; i >=0; i--){
								if(form.entries[5].tabs[5].entries[i].name === 'volumeGroup' + count){
									//remove from formData
									for(var fieldname in form.formData){
										if(['volume' + count, 'volumeMount' + count].indexOf(fieldname) !== -1){
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[5].tabs[5].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if($scope.form && $scope.form.entries){
						$scope.form.entries[5].tabs[5].entries.splice($scope.form.entries[5].tabs[5].entries.length -1, 0, tmp);
						if(value){
							setEditorContent('volume' + volumeCounter, value, tmp.entries[0].height, $scope);
							if(mountValue){
								setEditorContent('volumeMount' + volumeCounter, mountValue, tmp.entries[1].height, $scope);
							}
							else{
								setEditorContent('volumeMount' + volumeCounter, {}, tmp.entries[1].height, $scope);
							}
						}
						else{
							setEditorContent('volume' + volumeCounter, {}, tmp.entries[0].height, $scope);
							setEditorContent('volumeMount' + volumeCounter, {}, tmp.entries[1].height, $scope);
						}
					}
					else{
						formConfig[5].tabs[5].entries.splice($scope.form.entries[5].tabs[5].entries.length -1, 0, tmp);
						if(value){
							setEditorContent('volume' + volumeCounter, value, tmp.entries[0].height, $scope);
							if(mountValue){
								setEditorContent('volumeMount' + volumeCounter, mountValue, tmp.entries[1].height, $scope);
							}
							else{
								setEditorContent('volumeMount' + volumeCounter, {}, tmp.entries[1].height, $scope);
							}
						}
						else{
							setEditorContent('volume' + volumeCounter, {}, tmp.entries[0].height, $scope);
							setEditorContent('volumeMount' + volumeCounter, {}, tmp.entries[1].height, $scope);
						}
					}
					volumeCounter++;
				};
				
				$scope.addNewPort = function(value){
					var tmp = angular.copy(catalogAppConfig.form.portInput);
					tmp.name += portCounter;
					tmp.entries[0].name += portCounter;
					tmp.entries[1].name += portCounter;
					if(!submitAction){
						tmp.entries.pop();
					}
					else{
						tmp.entries[1].onAction = function(id, value, form){
							var count = parseInt(id.replace('rPort', ''));
							
							for(let i = form.entries[5].tabs[6].entries.length -1; i >=0; i--){
								if(form.entries[5].tabs[6].entries[i].name === 'portGroup' + count){
									//remove from formData
									for(var fieldname in form.formData){
										if(['port' + count].indexOf(fieldname) !== -1){
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[5].tabs[6].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[6].entries.splice($scope.form.entries[5].tabs[6].entries.length -1, 0, tmp);
						//$scope.form.entries[11].entries.push(tmp);
						if(value){
							setEditorContent('port' + portCounter, value, tmp.entries[0].height, $scope)
						}
						else {
							setEditorContent('port' + portCounter, {}, tmp.entries[0].height, $scope)
						}
					}
					else{
						formConfig[5].tabs[6].entries.splice($scope.form.entries[5].tabs[6].entries.length -1, 0, tmp);
						if(value){
							setEditorContent('port' + portCounter, value, tmp.entries[0].height, $scope)
						}
						else {
							setEditorContent('port' + portCounter, {}, tmp.entries[0].height, $scope)
						}
					}
					portCounter++;
				};
				
				$scope.addNewLabel = function(value){
					var tmp = angular.copy(catalogAppConfig.form.labelInput);
					tmp.name += labelCounter;
					tmp.entries[0].name += labelCounter;
					tmp.entries[1].name += labelCounter;
					tmp.entries[2].name += labelCounter;
					if(!submitAction){
						tmp.entries.pop();
					}
					else{
						tmp.entries[2].onAction = function(id, value, form){
							var count = parseInt(id.replace('rLabel', ''));
							
							for(let i = form.entries[5].tabs[7].entries.length -1; i >=0; i--){
								if(form.entries[5].tabs[7].entries[i].name === 'labelGroup' + count){
									//remove from formData
									for(var fieldname in form.formData){
										if(['labelName' + count , 'labelValue' + count].indexOf(fieldname) !== -1){
											delete form.formData[fieldname];
										}
									}
									//remove from formEntries
									form.entries[5].tabs[7].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[7].entries.splice($scope.form.entries[5].tabs[7].entries.length -1, 0, tmp);
					}
					else{
						formConfig[5].tabs[7].entries.splice($scope.form.entries[5].tabs[7].entries.length -1, 0, tmp);
					}
					labelCounter++;
				};
				
				if(submitAction){
					formConfig[5].tabs[5].entries[0].onAction = function(id, value, form){
						$scope.addNewVolume();
					};
					
					formConfig[5].tabs[6].entries[0].onAction = function(id, value, form){
						$scope.addNewPort();
					};
					
					formConfig[5].tabs[7].entries[0].onAction = function(id, value, form){
						$scope.addNewLabel();
					};
					
					formConfig[7].tabs[1].entries[0].onAction = function(id, value, form){
						$scope.addNewEnvVar();
					};
				}
				else{
					formConfig[5].tabs[5].entries.pop();
					formConfig[5].tabs[6].entries.pop();
					formConfig[5].tabs[7].entries.pop();
					formConfig[7].tabs[1].entries.pop();
				}
				
				var formData = mapDataToForm($scope, false);
				
				var options = {
					timeout: $timeout,
					entries: formConfig,
					name: 'editRecipe',
					data: formData,
					actions: [
						{
							type: 'reset',
							label: (submitAction) ? 'Cancel' : 'Close',
							btn: 'danger',
							action: function () {
								$modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};
				
				if(submitAction && !data.locked){
					options.actions.splice(0,0, {
						type: 'submit',
							label: 'Submit',
						btn: 'primary',
						action: function (fData) {
							var formData = fromToAPI(fData, envCounter, volumeCounter, portCounter, labelCounter);
							
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, {
								method: submitAction.method,
								routeName: submitAction.routeName,
								params: submitAction.params,
								data: {
									catalog: formData
								}
							}, function (error, response) {
								overlayLoading.hide();
								if (error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.form.displayAlert('success', 'Recipe Saved Successfully');
									$modalInstance.close();
									$scope.form.formData = {};
									currentScope.listRecipes();
								}
							});
						}
					});
				}
				
				buildForm($scope, $modalInstance, options, function(){
					$scope.form.formData = mapDataToForm($scope, true);
					$scope.form.refresh(true);
				});
			}
		});
		
		function mapDataToForm(modalScope, postForm){
			var output = {
				name: data.name,
				description: data.description,
				type: data.type,
				subtype: data.subtype,
				imagePrefix: data.recipe.deployOptions.image.prefix,
				imageName: data.recipe.deployOptions.image.name,
				imageTag: data.recipe.deployOptions.image.tag,
				imagePullPolicy: data.recipe.deployOptions.image.pullPolicy,
				condition: (data.recipe.deployOptions.restartPolicy) ? data.recipe.deployOptions.restartPolicy.condition: '',
				maxAttempts: (data.recipe.deployOptions.restartPolicy) ? data.recipe.deployOptions.restartPolicy.maxAttempts: '',
				network: data.recipe.deployOptions.container.network,
				workingDir: data.recipe.deployOptions.container.workingDir
			};
			if (data.recipe.buildOptions.cmd
				&& data.recipe.buildOptions.cmd.deploy
				&& data.recipe.buildOptions.cmd.deploy.command){
				output.command = data.recipe.buildOptions.cmd.deploy.command[0];
				
				if(data.recipe.buildOptions.cmd.deploy.args){
					output.arguments = data.recipe.buildOptions.cmd.deploy.args.join("\n");
				}
			}
			if(data.recipe.deployOptions.image && Object.hasOwnProperty.call(data.recipe.deployOptions.image, 'override')){
				output['imageOverride'] = data.recipe.deployOptions.image.override.toString();
			}
			else{
				output['imageOverride'] = 'false';
			}
			
			if(data.recipe.deployOptions.specifyGitConfiguration && Object.hasOwnProperty.call(data.recipe.deployOptions, 'specifyGitConfiguration')) {
				output['specifyGitConfiguration'] = data.recipe.deployOptions.specifyGitConfiguration.toString();
			}
			else{
				output['specifyGitConfiguration'] = 'false';
			}
			
			if(data.recipe.buildOptions.settings && Object.hasOwnProperty.call(data.recipe.buildOptions.settings, 'accelerateDeployment')){
				output.accelerateDeployment = data.recipe.buildOptions.settings.accelerateDeployment.toString();
			}
			else{
				output.accelerateDeployment = 'false';
			}
			
			if(postForm){
				output["readinessProbe"] =  data.recipe.deployOptions.readinessProbe;
				setEditorContent("readinessProbe", output['readinessProbe'], mainFormConfig[5].tabs[2].entries[0].height, modalScope);
				
				//volumes
				if(data.recipe.deployOptions.voluming && ((data.recipe.deployOptions.voluming.volumes && data.recipe.deployOptions.voluming.volumes.length > 0) || (data.recipe.deployOptions.voluming.volumeMounts && data.recipe.deployOptions.voluming.volumeMounts.length > 0))){
					data.recipe.deployOptions.voluming.volumes.forEach(function(oneVolume){
						output['volume' + volumeCounter] = oneVolume;
						var mountVolume;
						if(data.recipe.deployOptions.voluming.volumeMounts && data.recipe.deployOptions.voluming.volumeMounts[volumeCounter]){
							output['volumeMount' + volumeCounter] = data.recipe.deployOptions.voluming.volumeMounts[volumeCounter];
							mountVolume = data.recipe.deployOptions.voluming.volumeMounts[volumeCounter];
						}
						else{
							output['volumeMount' + volumeCounter] = {};
							mountVolume = {};
						}
						modalScope.addNewVolume(oneVolume, mountVolume);
					});
				}
				else if(!data.recipe.deployOptions.voluming || (data.recipe.deployOptions.voluming && data.recipe.deployOptions.voluming.volumes.length === 0 && data.recipe.deployOptions.voluming.volumeMounts.length === 0)){
					modalScope.form.entries[5].tabs[5].entries.splice(modalScope.form.entries[5].tabs[5].entries.length -1, 0, {
						'type':'html',
						'value': "<br /><div class='alert alert-warning'>No Volumes Configured for this Recipe.</div><br />"
					});
				}
				
				//ports
				if(data.recipe.deployOptions.ports && data.recipe.deployOptions.ports.length > 0){
					data.recipe.deployOptions.ports.forEach(function(onePort){
						output['port' + portCounter] = onePort;
						modalScope.addNewPort(onePort);
					});
				}
				else if(!data.recipe.deployOptions.ports || data.recipe.deployOptions.ports.length === 0){
					modalScope.form.entries[5].tabs[6].entries.splice(modalScope.form.entries[5].tabs[6].entries.length-1, 0, {
						'type':'html',
						'value': "<br /><div class='alert alert-warning'>No Ports Configured for this Recipe.</div><br />"
					});
				}
				
				//env variables
				if(data.recipe.buildOptions.env && Object.keys(data.recipe.buildOptions.env).length > 0){
					for(var oneVar in data.recipe.buildOptions.env){
						output['envVarName' + envCounter] = oneVar;
						output['envVarType' + envCounter] = data.recipe.buildOptions.env[oneVar].type;
						switch(data.recipe.buildOptions.env[oneVar].type){
							case 'computed':
								output['computedVar' + envCounter] = data.recipe.buildOptions.env[oneVar].value;
								break;
							case 'static':
								output['staticVar' + envCounter] = data.recipe.buildOptions.env[oneVar].value;
								break;
							case 'userInput':
								output['userInputLabel' + envCounter] = data.recipe.buildOptions.env[oneVar].label;
								output['userInputDefault' + envCounter] = data.recipe.buildOptions.env[oneVar].default;
								output['userInputFieldMsg' + envCounter] = data.recipe.buildOptions.env[oneVar].fieldMsg;
								break;
						}
						modalScope.addNewEnvVar();
						//counter got incremented in method above, refill data starting from 0 instead of 1
						reRenderEnvVar('envVarType' + ( envCounter -1 ), data.recipe.buildOptions.env[oneVar].type, modalScope.form);
					}
				}
				else if(!data.recipe.buildOptions.env || Object.keys(data.recipe.buildOptions.env).length === 0){
					modalScope.form.entries[7].tabs[1].entries.splice(modalScope.form.entries[7].tabs[1].entries.length -1, 0, {
						'type':'html',
						'value': "<br /><div class='alert alert-warning'>No Environment Variables Configured for this Recipe.</div><br />"
					});
				}
				
				//service labels
				if(data.recipe.deployOptions.labels && Object.keys(data.recipe.deployOptions.labels).length > 0){
					for(let oneLabel in data.recipe.deployOptions.labels){
						output['labelName' + labelCounter] = oneLabel;
						output['labelValue' + labelCounter] = data.recipe.deployOptions.labels[oneLabel];
						modalScope.addNewLabel(data.recipe.deployOptions.labels[oneLabel]);
					}
				}
				else{
					modalScope.form.entries[5].tabs[7].entries.splice(modalScope.form.entries[5].tabs[7].entries.length -1, 0, {
						'type':'html',
						'value': "<br /><div class='alert alert-warning'>No Labels found for this Recipe.</div><br />"
					});
				}
			}
			
			return output;
		}
	}
 
	function fromToAPI(formData, envCounter, volumeCounter, portCounter, labelCounter){
		var apiData = {
			name: formData.name,
			type: formData.type,
			subtype: formData.subtype,
			description: formData.description,
			recipe:{
				deployOptions: {
					"image": {
						"prefix": formData.imagePrefix,
						"name": formData.imageName,
						"tag": formData.imageTag,
						"pullPolicy": formData.imagePullPolicy,
						"override": (formData.imageOverride === 'true')
					},
					"specifyGitConfiguration": (formData.specifyGitConfiguration === 'true'),
					"readinessProbe": formData.readinessProbe,
					"ports": [],
					"voluming": {
						"volumes": [],
						"volumeMounts": []
					},
					"restartPolicy": {
						"condition": formData.condition,
						"maxAttempts": formData.maxAttempts
					},
					"container": {
						"network": formData.network,
						"workingDir": formData.workingDir
					}
				},
				buildOptions: {
					"env": {}
				}
			}
		};
		
		if(formData.accelerateDeployment){
			if(!apiData.recipe.buildOptions.settings){
				apiData.recipe.buildOptions.settings = {};
			}
			apiData.recipe.buildOptions.settings.accelerateDeployment = (formData.accelerateDeployment === 'true');
		}
		
		if(formData.command && formData.arguments){
			if(!apiData.recipe.buildOptions.cmd){
				apiData.recipe.buildOptions.cmd = {
					deploy: {}
				};
			}
			
			apiData.recipe.buildOptions.cmd.deploy.command = [formData.command];
			apiData.recipe.buildOptions.cmd.deploy.args = formData.arguments.split("\n");
		}
		
		if(volumeCounter > 0){
			for(let i=0; i < volumeCounter; i++){
				let volume = formData['volume' + i];
				if(volume && Object.keys(volume).length > 0){
					apiData.recipe.deployOptions.voluming.volumes.push(volume);
				}
				
				let volumeMount = formData['volumeMount' +i];
				if(volumeMount && Object.keys(volumeMount).length > 0){
					apiData.recipe.deployOptions.voluming.volumeMounts.push(volumeMount);
				}
			}
		}
		
		if(portCounter > 0){
			for(let i=0; i < portCounter; i++){
				let port = formData['port' + i];
				if(port && Object.keys(port).length > 0){
					apiData.recipe.deployOptions.ports.push(port);
				}
			}
		}
		
		if(envCounter > 0){
			for(let i=0; i < envCounter; i++){
				if(!formData['envVarName' + i] || !formData['envVarType' + i]){
					continue;
				}
				apiData.recipe.buildOptions.env[formData['envVarName' + i]] = {
					'type': formData['envVarType' + i]
				};
				switch (formData['envVarType' + i]){
					case 'static':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].value = formData['staticVar' + i];
						break;
					case 'computed':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].value = formData['computedVar' + i];
						break;
					case 'userInput':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].label = formData['userInputLabel' + i];
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].default = formData['userInputDefault' + i];
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].fieldMsg = formData['userInputFieldMsg' + i];
						break;
				}
				
				//nothing to push
				if(Object.keys(apiData.recipe.buildOptions.env[formData['envVarName' + i]]).length === 0){
					delete apiData.recipe.buildOptions.env[formData['envVarName' + i]];
				}
			}
		}
		
		if(labelCounter > 0){
			apiData.recipe.deployOptions.labels = {};
			for(let i=0; i < labelCounter; i++){
				if(!formData['labelName' + i] || !formData['labelValue' + i]){
					continue;
				}
				apiData.recipe.deployOptions.labels[formData['labelName' + i]] = formData['labelValue' + i];
				
				//nothing to push
				if(!apiData.recipe.deployOptions.labels[formData['labelName' + i]]){
					delete apiData.recipe.deployOptions.labels[formData['labelName' + i]];
				}
			}
		}
		return apiData;
	}
	
    $scope.addRecipe = function (type) {
	    var formConfig;
	    var data;
	
	    var submitAction = {
		    method: 'post',
		    routeName: '/dashboard/catalog/recipes/add',
		    params: {}
	    };
	    var currentScope = $scope;
	    
    	if (type === 'blank') {
    		$modal.open({
			    templateUrl: "newRecipe.tmpl",
			    size: 'lg',
			    backdrop: true,
			    keyboard: true,
			    controller: function ($scope, $modalInstance) {
				    
			    	var formConfig = angular.copy(catalogAppConfig.form.add.new);
			    	
			    	formConfig[0].onAction = function(id, data, form){
			    		var categories = angular.copy(catalogAppConfig.form.add.categories);
			    		for(let i = categories.value.length -1; i >=0; i--){
			    			if(categories.value[i].group !== data){
			    				categories.value.splice(i, 1);
						    }
					    }
					    
					    if(form.entries.length > 1){
					        form.entries.splice(form.entries.length -1, 1);
					    }
					    if(categories.value.length > 0){
					        form.entries.push(categories);
					    }
				    };
			    	
				    var options = {
					    timeout: $timeout,
					    entries: formConfig,
					    name: 'newRecipe',
					    actions: [
						    {
							    'type': 'submit',
							    'label': "Proceed",
							    'btn': 'primary',
							    action: function(formData){
								    data = angular.copy(catalogAppConfig.templates.recipe);
								    data.type = formData.type;
								    data.subtype = formData.subtype;
								
								    $modalInstance.close();
								    $scope.form.formData = {};
								    $timeout(function(){
								    	var formEntries = angular.copy(catalogAppConfig.form.entries);
								    	
								    	if(data.type === 'other'){
										    delete formEntries[2].disabled;
										    delete formEntries[3].disabled;
									    }
									    else if (data.subtype === 'other'){
										    delete formEntries[3].disabled;
									    }
								    	
								        proceedWithForm(currentScope, formEntries, data, submitAction);
								    }, 100);
							    }
						    },
						    {
							    type: 'reset',
							    label: 'Cancel',
							    btn: 'danger',
							    action: function () {
								    $modalInstance.dismiss('cancel');
								    $scope.form.formData = {};
							    }
						    }
					    ]
				    };
				
				    buildForm($scope, $modalInstance, options, function(){
					   
				    });
			    }
		    });
        }
        else {
    		formConfig = angular.copy(catalogAppConfig.form.add);
        	var groups = [];
            $scope.recipes.forEach(function (oneRecipe) {
            	var label = oneRecipe.name;
            	if(oneRecipe.subtype){
            		label += " (" + oneRecipe.subtype + ")";
	            }
                formConfig.entries[0].value.push({ l: label, v: oneRecipe, group: oneRecipe.type });
            	
            	if(groups.indexOf(oneRecipe.type) === -1){
            		groups.push(oneRecipe.type);
	            }
            });
	        formConfig.entries[0].groups = groups;
            formConfig.entries[0].onAction = function (id, data, form) {
                let recipeTemplate = data;
                if(typeof recipeTemplate === 'string'){
	                recipeTemplate = JSON.parse(data);
                }
                delete recipeTemplate._id;
                delete recipeTemplate.locked;
	            $scope.modalInstance.close();
	            $timeout(function(){
		            formConfig = angular.copy(catalogAppConfig.form.entries);
		            proceedWithForm(currentScope, formConfig, recipeTemplate, submitAction);
	            }, 100);
            };
	
	        var options = {
		        timeout: $timeout,
		        form: formConfig,
		        name: 'addRecipe',
		        label: 'Add New Recipe'
	        };

	        buildFormWithModal($scope, $modal, options);
        }
    };

    $scope.updateRecipe = function (recipe) {
	    
    	var submitAction = {
			method: 'put',
			routeName: '/dashboard/catalog/recipes/update',
			params: {id: recipe._id}
	    };
	    
	    proceedWithForm($scope, catalogAppConfig.form.entries, recipe, submitAction);
    };
    
    $scope.viewRecipe = function(recipe){
	    proceedWithForm($scope, catalogAppConfig.form.entries, recipe, null);
    };

    $scope.deleteRecipe = function (recipe, versioning) {
    	var params = {
		    id: recipe._id
	    };
    	if(versioning){
    		params.id = recipe.refId;
    		params.version = recipe.v;
	    }
    	
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/catalog/recipes/delete',
            params: params
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'Recipe deleted successfully');
                $scope.listRecipes();
            }
        });
    };
    
    injectFiles.injectCss("modules/dashboard/catalogs/catalog.css");

    // Start here
    if ($scope.access.list) {
        $scope.listRecipes();
    }

}]);

catalogApp.filter('capitalizeFirst', function () {
    return function (input) {
        if (input && typeof input === 'string' && input.length > 0) {
            return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
        }
    }
});
