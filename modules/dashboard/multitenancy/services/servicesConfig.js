"use strict";
var multiTenantServiceConfig = soajsApp.components;
multiTenantServiceConfig.service('mtsc', ['$timeout', '$modal', 'ngDataApi', 'checkApiHasAccess', function ($timeout, $modal, ngDataApi, checkApiHasAccess) {
	
	function updateConfiguration(currentScope, tId, appId, appPackage, key, env, value) {
		let data = {};
		if (value) {
			data.config = angular.copy(value);
		}
		
		if (env) {
			data.envCode = env;
		}
		
		// console.log(currentScope);
		getServices(currentScope, appPackage, env, (services) => {
			let formEntries = angular.copy(tenantConfig.form.keyConfig);
			
			//set disable oauth value
			data.disableOauth = false;
			if (data && data.oauth && Object.hasOwnProperty.call(data.oauth, 'disabled')) {
				data.disableOauth = data.oauth.disabled;
			}
			
			//loop through the tabs of the form and build the sub sections
			formEntries.entries.forEach((oneEntry) => {
				if (oneEntry.type === 'tabset') {
					oneEntry.tabs.forEach((oneTab) => {
						
						//set the throttling configuration
						if (oneTab.name === 'throttling') {
							if (currentScope.availableEnvThrottling[data.envCode.toLowerCase()]) {
								oneTab.description = {
									"type": "info",
									"content": "<p>You can override the default throttling configuration that is configured in the <a href='#/environments'>Registry</a> for this key in this environment.</p>" +
									"<hr /><p>If you are not familiar with API Traffic Throttling works, <a target='_blank' href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/679641089/API+Traffic+Throttling'>Click Here</a></p>"
								};
								
								if (services && Array.isArray(services) && services.length > 0) {
									services.forEach((oneService) => {
										
										let serviceThrottlingConfiguration = angular.copy(tenantConfig.form.oneServiceThrottlingTmpl);
										serviceThrottlingConfiguration.name += "_" + oneService.name;
										serviceThrottlingConfiguration.label = oneService.name;
										serviceThrottlingConfiguration.entries.forEach((oneThrottleConfigEntry) => {
											if (oneThrottleConfigEntry.name === 'public') {
												oneThrottleConfigEntry.value[0].v = '--inherit--';
												let label = currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy;
												if(label === null){
													label = "throttling OFF";
												}
												oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", label);
											}
											
											if (oneThrottleConfigEntry.name === 'private') {
												oneThrottleConfigEntry.value[0].v = '--inherit--';
												let label = currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy;
												if(label === null){
													label = "throttling OFF";
												}
												oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", label);
											}
											
											//set the values ...
											for (let strategyName in currentScope.availableEnvThrottling[data.envCode.toLowerCase()]) {
												if (['privateAPIStrategy', 'publicAPIStrategy'].indexOf(strategyName) === -1) {
													if (
														(oneThrottleConfigEntry.name === 'public' && currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy !== strategyName) ||
														(oneThrottleConfigEntry.name === 'private' && currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy !== strategyName)
													) {
														oneThrottleConfigEntry.value.push({
															'v': strategyName,
															'l': strategyName,
															'group': 'Strategies'
														});
													}
												}
											}
											
											oneThrottleConfigEntry.name += "_" + oneService.name;
											
											//if already set in servicesConfig, assign it
											if (data.config && data.config[oneService.name] && data.config[oneService.name].SOAJS && data.config[oneService.name].SOAJS.THROTTLING){
												let oneStrategy = (oneThrottleConfigEntry.name.includes("public_")) ? "publicAPIStrategy" : "privateAPIStrategy";
												if(data.config[oneService.name].SOAJS.THROTTLING.hasOwnProperty(oneStrategy)){
													data[oneThrottleConfigEntry.name] = data.config[oneService.name].SOAJS.THROTTLING[oneStrategy];
												}
											}
											
											oneThrottleConfigEntry.value.push({
												'v': null,
												'group': 'Common',
												'l': "Turn OFF Throttling"
											});
											
											if(data[oneThrottleConfigEntry.name] === null){
												oneThrottleConfigEntry.value.forEach((oneV) => {
													delete oneV.selected;
													if(oneV.v === null){
														oneV.selected = true;
													}
												});
											}
										});
										oneTab.entries.push(serviceThrottlingConfiguration);
										
									});
								}
							}
							else {
								oneTab.description = {
									"type": "warning",
									"content": "<p>This environment has no throttling configuration.</p>" +
									"<ol>" +
									"<li>Configure throttling in the <a href='#/environments'>Registry</a> of this environment</li>" +
									"<li>Override registry throttling configuration here for this tenant for this key.</p></li>" +
									"</ol><hr />" +
									"<p>If you are not familiar with API Traffic Throttling works, <a target='_blank' href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/679641089/API+Traffic+Throttling'>Click Here</a></p>"
								};
							}
						}
						
						//set the oauth disable button value
						if (oneTab.name === 'oauthTab') {
							oneTab.entries.forEach((oneTabEntry) => {
								if (oneTabEntry.name === 'disableOauth') {
									oneTabEntry.value = null;
									if (data.config && data.config.oauth && data.config.oauth.disabled) {
										oneTabEntry.value = data.config.oauth.disabled;
									}
								}
							});
						}
						
						//set the imfv configuration per service
						if (oneTab.name === 'imfvTab') {
							
							// oneServiceIMFVTmpl
							if (services && Array.isArray(services) && services.length > 0) {
								services.forEach((oneService) => {
									
									//if service is an not an rms, override the imfv
									if(SOAJSRMS.indexOf("soajs." + oneService.name) === -1){
										let imfvMethods = [];
										for (let method in oneService.apisList) {
											let oneMethodIMFV = {
												"type": "group",
												"label": method.toUpperCase(),
												"collapsed": true,
												"icon": "plus",
												"entries": []
											};
											
											oneService.apisList[method].forEach((oneAPI) => {
												let oneAPIIMFV = {
													"type": "jsoneditor",
													'onLoad': loadEditor,
													'onChange': changeEditorValue,
													'height': '100px',
													"name": "imfv__dot__" + oneService.name + "__dot__" + method + "__dot__" + oneAPI.v,
													"label": oneAPI.l + " [ " + oneAPI.v + " ]",
													"fieldMsg": "Leave empty to use the default <a target='_blank' href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/61353979/IMFV'>IMFV</a> or provide a custom configuration and it will override the <b>IMFV</b> for this API only."
												};
												
												if (data.config && data.config[oneService.name] && data.config[oneService.name].SOAJS &&
													data.config[oneService.name].SOAJS.IMFV && data.config[oneService.name].SOAJS.IMFV.schema &&
													data.config[oneService.name].SOAJS.IMFV.schema[method] && data.config[oneService.name].SOAJS.IMFV.schema[method][oneAPI.v]
												) {
													oneAPIIMFV.value = JSON.stringify(data.config[oneService.name].SOAJS.IMFV.schema[method][oneAPI.v], null, 2);
												}
												oneMethodIMFV.entries.push(oneAPIIMFV);
											});
											imfvMethods.push(oneMethodIMFV);
										}
										
										let oneServiceIMFVConfiguration = angular.copy(tenantConfig.form.oneServiceIMFVTmpl);
										oneServiceIMFVConfiguration.name += "_" + oneService.name;
										oneServiceIMFVConfiguration.label = oneService.name;
										oneServiceIMFVConfiguration.entries = imfvMethods;
										oneTab.entries.push(oneServiceIMFVConfiguration);
									}
								});
							}
							
							if(oneTab.entries.length === 1){
								oneTab.entries.push({
									"type": "html",
									"value": "<div class='alert alert-warning'><p>No available services whose <b>IMFV</b> you can override for this tenant.</p></div>"
								});
							}
						}
					});
				}
			});
			data.customConfig = angular.copy(data.config);
			if(data.customConfig){
				delete data.customConfig.SOAJS;
				//delete data.customConfig.oauth;
				for(let oneService in data.customConfig){
					delete data.customConfig[oneService].SOAJS;
				}
			}
			let options = {
				timeout: $timeout,
				form: formEntries,
				name: 'updatekeyConfig',
				label: translation.updateKeyConfiguration[LANG],
				data: data,
				sub: true,
				actions: [
					{
						'type': 'submit',
						'label': translation.submit[LANG],
						'btn': 'primary',
						'action': function (formData) {
							let newConfigObject = {};
							
							//set the custom json first
							if (formData.customConfig) {
								newConfigObject = formData.customConfig;
								delete formData.customConfig;
							}
							
							//set the oauth
							if ( newConfigObject.oauth &&  newConfigObject.oauth.SOAJS) {
								delete newConfigObject.oauth.SOAJS;
							}
							
							//check if oauth is disabled
							if (formData.disableOauth) {
								if (!newConfigObject.oauth) {
									newConfigObject.oauth = {};
								}
								newConfigObject.oauth.disabled = true;
								delete formData.disableOauth;
							}
							else if (newConfigObject.oauth) {
								delete newConfigObject.oauth.disabled;
							}
							
							//set the throttling
							if (services && services.length > 0) {
								services.forEach((oneService) => {
									//add public api throttling strategy
									if (Object.hasOwnProperty.call(formData, 'public_' + oneService.name)) {
										if (!newConfigObject[oneService.name]) {
											newConfigObject[oneService.name] = {};
										}
										
										if (!newConfigObject[oneService.name].SOAJS) {
											newConfigObject[oneService.name].SOAJS = {};
										}
										if (!newConfigObject[oneService.name].SOAJS.THROTTLING) {
											newConfigObject[oneService.name].SOAJS.THROTTLING = {};
										}
										
										if (formData['public_' + oneService.name] === '--inherit--') {
											delete newConfigObject[oneService.name].SOAJS.THROTTLING['publicAPIStrategy'];
										}
										else if (formData['public_' + oneService.name] === null) {
											newConfigObject[oneService.name].SOAJS.THROTTLING['publicAPIStrategy'] = 'null';
										}
										else if (currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy !== formData['public_' + oneService.name]) {
											newConfigObject[oneService.name].SOAJS.THROTTLING['publicAPIStrategy'] = formData['public_' + oneService.name];
										}
										
										delete formData['public_' + oneService.name];
									}
									
									//add private api throttling strategy
									if (Object.hasOwnProperty.call(formData, 'private_' + oneService.name)) {
										if (!newConfigObject[oneService.name]) {
											newConfigObject[oneService.name] = {};
										}
										
										if (!newConfigObject[oneService.name].SOAJS) {
											newConfigObject[oneService.name].SOAJS = {};
										}
										if (!newConfigObject[oneService.name].SOAJS.THROTTLING) {
											newConfigObject[oneService.name].SOAJS.THROTTLING = {};
										}
										
										if (formData['private_' + oneService.name] === null) {
											newConfigObject[oneService.name].SOAJS.THROTTLING['privateAPIStrategy'] = 'null';
										}
										else if (currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy !== formData['private_' + oneService.name]) {
											newConfigObject[oneService.name].SOAJS.THROTTLING['privateAPIStrategy'] = formData['private_' + oneService.name];
										}
										delete formData['private_' + oneService.name];
									}
									
								});
							}
							
							//check & set imfv
							for (let entry in formData) {
								if (entry.indexOf("__dot__") !== -1) {
									let combo = entry.split("__dot__");
									if (combo.length === 4) {
										//set the service
										if (!newConfigObject[combo[1]]) {
											newConfigObject[combo[1]] = {};
										}
										
										if (!newConfigObject[combo[1]].SOAJS) {
											newConfigObject[combo[1]].SOAJS = {};
										}
										
										if (!newConfigObject[combo[1]].SOAJS.IMFV) {
											newConfigObject[combo[1]].SOAJS.IMFV = {};
										}
										
										if (!newConfigObject[combo[1]].SOAJS.IMFV.schema) {
											newConfigObject[combo[1]].SOAJS.IMFV.schema = {};
										}
										
										//set the method
										if (!newConfigObject[combo[1]].SOAJS.IMFV.schema[combo[2]]) {
											newConfigObject[combo[1]].SOAJS.IMFV.schema[combo[2]] = {};
										}
										
										//set the api
										newConfigObject[combo[1]].SOAJS.IMFV.schema[combo[2]][combo[3]] = formData[entry];
										delete formData[entry];
									}
								}
							}
							
							let postData = {
								'envCode': formData.envCode,
								'config': newConfigObject
							};
							
							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "put",
								"routeName": "/multitenant/admin/tenant/application/key/config",
								"data": postData,
								"params": {"id": tId, "appId": appId, "key": key}
							}, function (error) {
								if (error) {
									currentScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								else {
									currentScope.mt.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG], tId);
									currentScope.modalInstance.close();
									currentScope.form.formData = {};
									currentScope.reloadConfiguration(tId, appId, key);
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							currentScope.modalInstance.dismiss('cancel');
							currentScope.form.formData = {};
						}
					}
				]
			};
			
			buildFormWithModal(currentScope, $modal, options, () => {
				currentScope.form.formData = data;
			});
		});
		
		function loadEditor(_editor) {
			reloadEditor(_editor, 100, () => {
				changeEditorValue(_editor);
			});
		}
		
		function changeEditorValue(_editor) {
			currentScope.form.entries.forEach((oneEntry) => {
				if (oneEntry.type === 'tabset') {
					oneEntry.tabs.forEach((oneTab) => {
						oneTab.entries.forEach((oneServiceAccordion) => {
							if (oneServiceAccordion.entries) {
								oneServiceAccordion.entries.forEach((oneMethodGroup) => {
									if (oneMethodGroup.entries) {
										oneMethodGroup.entries.forEach((oneAPI) => {
											if (oneAPI.name === _editor.container.id) {
												oneAPI.ngModel = oneAPI.value;
												_editor.setValue(oneAPI.value);
											}
										});
									}
								});
							}
						});
					});
				}
			});
		}
	}
	
	//use the currentScope to loop over the entries of the form and for each entry matching the id of the editor, set the value
	function reloadEditor(_editor, fixedHeight, cb) {
		_editor.$blockScrolling = Infinity;
		_editor.scrollToLine(0, true, true);
		_editor.scrollPageUp();
		_editor.clearSelection();
		_editor.setShowPrintMargin(false);
		
		function heightUpdateFunction(computedHeightValue) {
			var newHeight =
				_editor.getSession().getScreenLength()
				* _editor.renderer.lineHeight
				+ _editor.renderer.scrollBar.getWidth() + 10;
			
			if (computedHeightValue) {
				newHeight = parseInt(computedHeightValue);
			}
			else if (fixedHeight && parseInt(fixedHeight) && parseInt(fixedHeight) > newHeight) {
				newHeight = parseInt(fixedHeight);
			}
			
			_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
			_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
			$timeout(function () {
				document.getElementById(_editor.container.id).style.height = newHeight.toString() + "px";
			}, 5);
		}
		
		$timeout(function () {
			if (_editor) {
				_editor.heightUpdate = heightUpdateFunction;
			}
			
			// Set initial size to match initial content
			heightUpdateFunction();
			
			// Whenever a change happens inside the ACE editor, update
			// the size again
			_editor.getSession().on('change', heightUpdateFunction);
			return cb();
		}, 1000);
	}
	
	//get the services this application has access to from product package acl
	function getServices(currentScope, appPackage, env, cb) {
		let services = [];
		let prodPackage;
		currentScope.availablePackages.forEach((oneProdPackage) => {
			if (oneProdPackage.pckCode === appPackage) {
				prodPackage = oneProdPackage;
				if(oneProdPackage.acl && oneProdPackage.acl[env.toLowerCase()]){
					services = Object.keys(oneProdPackage.acl[env.toLowerCase()]);
					for (let i = services.length - 1; i >= 0; i--) {
						if (tenantConfig.excludedServices.indexOf(services[i]) !== -1) {
							services.splice(i, 1);
						}
					}
				}
				
			}
		});
		
		getServicesFromDB(currentScope, prodPackage ? prodPackage.acl : null, env, services, cb);
	}
	
	function getServicesFromDB(currentScope, acl, env, serviceNames, cb) {
		
		let opts = {
			"method": "get",
			"routeName": "/marketplace/items/type/all",
			"params": {
				"type": 'service'
			}
		};
		if (serviceNames && serviceNames.length > 0){
			opts.routeName = "/marketplace/items/type/names";
			opts.params = {
				"names": serviceNames,
				"types": ["service"]
			};
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				overlayLoading.hide();
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				for (var x = 0; x < response.records.length; x++) {
				
					if (response.records[x].versions) {
						var v = returnLatestVersion(response.records[x].versions);
						let latest;
						response.records[x].versions.forEach((oneVersion)=>{
							if (!latest){
								latest = oneVersion;
							}
							console.log(oneVersion)
							console.log(latest)
							if (oneVersion.version && latest.version &&
								parseFloat(oneVersion.version) > parseFloat(latest.version)){
								latest = oneVersion;
							}
						});
						if (response.records[x].versions[v]) {
							response.records[x].apisList = latest.apis;
						}
					}
					
					//reshape apisList based on methods
					let contractSchema = {};
					if(response.records[x].apisList) {
						response.records[x].apisList.forEach((oneAPI) => {
							if (!contractSchema[oneAPI.m]) {
								contractSchema[oneAPI.m] = [];
							}
							contractSchema[oneAPI.m].push(oneAPI);
						});
						
						response.records[x].apisList = contractSchema;
						delete response.records[x].versions;
						
						//remove apis that tenant has no access to
						for (let method in response.records[x].apisList) {
							for (let i = response.records[x].apisList[method].length - 1; i >= 0; i--) {
								let oneAPI = response.records[x].apisList[method][i];
								let aclClone = {};
								if (acl){
									aclClone[env] = angular.copy(acl[env]);
									checkApiHasAccess(aclClone, response.records[x].name, oneAPI.v, method, null, (access) => {
										if (!access) {
											response.records[x].apisList[method].splice(i, 1);
										}
									});
								}
							}
							
							if (response.records[x].apisList[method].length === 0) {
								delete response.records[x].apisList[method];
							}
						}
					}
				}
				return cb(response.records);
			}
		});
	}
	
	return {
		'updateConfiguration': updateConfiguration
	}
}]);