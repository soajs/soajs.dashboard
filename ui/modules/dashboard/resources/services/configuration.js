"use strict";
var resourceConfigurationService = soajsApp.components;
resourceConfigurationService.service('resourceConfiguration', ['$http', '$timeout', 'injectFiles', function ($http, $timeout, injectFiles) {
	
	function loadDriverSchema(currentScope, resource, settings, editMode, cb){
		let type = (resource && Object.keys(resource).length > 0) ? resource.type : settings.type;
		let category = (resource && Object.keys(resource).length > 0) ? resource.category: settings.category;
		
		let schemaFile = "modules/dashboard/resources/drivers/" + type + "/" + category + "/driver.json";
		let dynamicEntries = [];
		
		$http.get(schemaFile).success(function(entries) {
			
			let cssFile = "modules/dashboard/resources/drivers/" + type + "/" + category + "/driver.css";
			let logoPath = "modules/dashboard/resources/drivers/" + type + "/" + category + "/logo.png";
			currentScope.driverLogo = logoPath;
			
			currentScope.driverConfigurationSchema = entries;
			for(let i in entries){
				let clone = angular.copy(entries[i]);
				
				if(clone.multi){
					if(clone.limit && clone.limit !== 0){
						//fixed multi limit
						replicateInput(clone, clone.limit);
					}
					else{
						//add another la yenfezir
						replicateInput(clone, null);
					}
				}
				else{
					dynamicEntries.push(clone);
				}
			}
			
			let formConfig = {
				timeout: $timeout,
				data: resource.config,
				"entries": dynamicEntries
			};
			buildForm(currentScope, null, formConfig, function(){
				currentScope.form.refresh();
				
				injectFiles.injectCss(cssFile);
				// console.log('form inputs have been loaded....');
				// console.log(currentScope.form.formData);
				return cb(null, true);
			});
		}).catch(function(error){
			return cb(null, true);
		});
		
		function replicateInput(original, limit){
			if(original.entries){
				if(!currentScope.resourceDriverCounter){
					currentScope.resourceDriverCounter = {};
				}
				
				if(!currentScope.resourceDriverCounter[original.name]){
					currentScope.resourceDriverCounter[original.name] = 0;
				}
				
				if(!limit){
					let arraycount = (resource && resource.config && resource.config[original.name] && Array.isArray(resource.config[original.name])) ? resource.config[original.name].length : 1;
					
					for(let i =0; i < arraycount; i++){
						pushOneDynamicEntry(original);
					}
					
					if(editMode){
						//hook add another
						dynamicEntries.push({
							"type": "html",
							"name": "another" + original.name,
							"value": "<input type='button' value='Add Another' class='btn btn-primary'/>",
							"onAction": function(id, value, form){
								let another = angular.copy(original);
								another.name = another.name + currentScope.resourceDriverCounter[original.name];
								allMyEntries(another.entries, currentScope.resourceDriverCounter[original.name], original.name);
								
								//hook the remove entry input
								another.entries.push({
									"type": "html",
									"name": "remove" + another.name,
									"value": "<span class='icon icon-cross red'></span>",
									"onAction": function(id, value, form){
										let currentEntryCount = parseInt(id.replace("remove" + original.name, ''));
										for( let i = form.entries.length -1; i>=0; i--){
											if(form.entries[i].name === original.name + currentEntryCount){
												form.entries.splice(i, 1);
											}
										}
									}
								});
								
								let max = 0;
								let match = false;
								for( let i=0; i < form.entries.length -1; i++){
									let regexp = new RegExp("^" + original.name);
									if(form.entries[i].name && regexp.test(form.entries[i].name)){
										match = true;
										let tcount = parseInt(form.entries[i].name.replace(original.name, ''));
										if(tcount > max){
											max= tcount;
										}
									}
								}
								
								if(match) {
									for (let i = 0; i < form.entries.length - 1; i++) {
										if (form.entries[i].name && form.entries[i].name === original.name + max) {
											let pos = i + 1;
											form.entries.splice(pos, 0, another);
											currentScope.resourceDriverCounter[original.name]++;
											break;
										}
									}
								}
								else{
									//all inputs removed
									//push before add another button
									currentScope.resourceDriverCounter[original.name] =0;
									for (let i = 0; i < form.entries.length - 1; i++) {
										if (form.entries[i].name && form.entries[i].name === "another" + original.name + max) {
											let pos = i;
											form.entries.splice(pos, 0, another);
											currentScope.resourceDriverCounter[original.name]++;
											break;
										}
									}
								}
							}
						});
					}
				}
				else{
					for(let i =0; i< limit; i++){
						let input = angular.copy(original);
						input.name = input.name + i;
						allMyEntries(input.entries, i, original.name);
						dynamicEntries.push(input);
					}
					currentScope.resourceDriverCounter[original.name] = limit;
				}
			}
		}
		
		function pushOneDynamicEntry(original){
			let input = angular.copy(original);
			input.name = input.name + currentScope.resourceDriverCounter[original.name];
			allMyEntries(input.entries, currentScope.resourceDriverCounter[original.name], original.name);
			
			if(editMode){
				//hook the remove entry input
				input.entries.push({
					"type": "html",
					"name": "remove" + input.name,
					"value": "<span class='icon icon-cross red'></span>",
					"onAction": function(id, value, form){
						let currentEntryCount = parseInt(id.replace("remove" + original.name, ''));
						for( let i = form.entries.length -1; i>=0; i--){
							if(form.entries[i].name === original.name + currentEntryCount){
								form.entries.splice(i, 1);
							}
						}
					}
				});
			}
			
			currentScope.resourceDriverCounter[original.name]++;
			dynamicEntries.push(input);
		}
		
		function allMyEntries(entries, countValue, parentName){
			entries.forEach(function(oneEntry){
				if(oneEntry.entries){
					allMyEntries(oneEntry.entries, countValue, oneEntry.name);
				}
				if(resource && resource.config && resource.config[parentName] && Array.isArray(resource.config[parentName])){
					if(resource.config[parentName][countValue]){
						oneEntry.value = resource.config[parentName][countValue][oneEntry.name];
					}
				}
				if(oneEntry.name){
					oneEntry.name = oneEntry.name + countValue;
				}
			});
		}
	}
	
	function mapConfigurationFormDataToConfig(currentScope, cb){
		let config = {};
		
		//pull all array inputs
		if(currentScope.driverConfigurationSchema){
			let data = angular.copy(currentScope.form.formData);
			for(let inputName in currentScope.driverConfigurationSchema){
				if(currentScope.resourceDriverCounter && currentScope.resourceDriverCounter[inputName]){
					config[currentScope.driverConfigurationSchema[inputName].name] = [];
					for(let i =0; i < currentScope.resourceDriverCounter[inputName]; i++){
						
						let arrData = {};
						//get array item schema
						currentScope.driverConfigurationSchema[inputName].entries.forEach((oneEntry)=>{
							doOneLevelInput(oneEntry.name + i, oneEntry.name, oneEntry, data, arrData, currentScope.form.entries);
							delete data[oneEntry.name + i];
							delete data["remove" + inputName + i];
						});
						
						//push array item data
						config[currentScope.driverConfigurationSchema[inputName].name].push(arrData);
					}
					delete data['another' + inputName];
				}
				
				// pull remaining inputs
				else if(data[currentScope.driverConfigurationSchema[inputName].name]){
					doOneLevelInput(currentScope.driverConfigurationSchema[inputName].name, currentScope.driverConfigurationSchema[inputName].name, currentScope.driverConfigurationSchema[inputName], data, config, currentScope.form.entries);
					delete data[currentScope.driverConfigurationSchema[inputName].name];
				}
				
				//pull complexe and complicated inputs
				else if(currentScope.driverConfigurationSchema[inputName].type === 'group'){
					if(!config[inputName]){
						config[inputName] = {};
					}
					doOneLevelInput(inputName, inputName, currentScope.driverConfigurationSchema[inputName], data, config[inputName], currentScope.form.entries);
				}
			}
		}
		
		currentScope.formData.config = config;
		return cb();
		
		function doOneLevelInput(fromName, toName, oneEntry, from, to, entries){
			if(oneEntry.entries){
				oneEntry.entries.forEach((subEntry) =>{
					if(!to[subEntry.name]){
						to[subEntry.name] = {};
					}
					
					entries.forEach((oneformSubEntry) =>{
						if(oneEntry.name === oneformSubEntry.name){
							doOneLevelInput(subEntry.name, subEntry.name, subEntry, from, to, oneformSubEntry.entries);
							delete from[fromName + '.' + subEntry.name];
						}
					});
				});
			}
			else if(oneEntry.type === 'jsoneditor'){
				entries.forEach((entry)=>{
					if(entry.name === oneEntry.name){
						let tData = JSON.parse(entry.editor.getValue());
						to[toName] = tData;
						delete from[toName];
					}
				});
			}
			else if(from[fromName]){
				to[toName] = from[fromName];
				delete from[fromName];
			}
		}
	}
	
	return {
		"loadDriverSchema": loadDriverSchema,
		"mapConfigurationFormDataToConfig": mapConfigurationFormDataToConfig
	}
}]);