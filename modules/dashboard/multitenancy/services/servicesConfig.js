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
			if(data && data.oauth && Object.hasOwnProperty.call(data.oauth, 'disabled')){
				data.disableOauth = data.oauth.disabled;
			}
			
			//hide throttling tab if no throttling is configured in this environment
			// if(!currentScope.availableEnvThrottling[data.envCode.toLowerCase()]){
			// 	formEntries.entries[1].tabs.splice(0, 1);
			// }
			
			//loop through the tabs of the form and build the sub sections
			formEntries.entries.forEach((oneEntry) => {
				if (oneEntry.type === 'tabset') {
					oneEntry.tabs.forEach((oneTab) => {
						
						//set the throttling configuration
						if (oneTab.name === 'throttling') {
							if(currentScope.availableEnvThrottling[data.envCode.toLowerCase()]){
								oneTab.description = {
									"type": "info",
										"content":  "<p>You can override the default throttling configuration that is configured in the <a href='#/environments'>Registry</a> for this key in this environment.</p>" +
									"<hr /><p>If you are not familiar with API Traffic Throttling works, <a target='_blank' href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/679641089/API+Traffic+Throttling'>Click Here</a></p>"
								};
								
								if (services && Array.isArray(services) && services.length > 0) {
									services.forEach((oneService) => {
										
										let serviceThrottlingConfiguration = angular.copy(tenantConfig.form.oneServiceThrottlingTmpl);
										serviceThrottlingConfiguration.name += "_" + oneService.name;
										serviceThrottlingConfiguration.label = oneService.name;
										serviceThrottlingConfiguration.entries.forEach((oneThrottleConfigEntry) => {
											
											if (oneThrottleConfigEntry.name === 'public') {
												oneThrottleConfigEntry.value[0].v = currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy;
												oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy);
											}
											
											if (oneThrottleConfigEntry.name === 'private') {
												oneThrottleConfigEntry.value[0].v = currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy;
												oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy);
											}
											
											//set the values ...
											for (let strategyName in currentScope.availableEnvThrottling[data.envCode.toLowerCase()]) {
												if (['privateAPIStrategy', 'publicAPIStrategy'].indexOf(strategyName) === -1) {
													if (
														(oneThrottleConfigEntry.name === 'public' && currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy !== strategyName) ||
														(oneThrottleConfigEntry.name === 'private' && currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy !== strategyName)
													) {
														let selected = false;
														if(data[oneService.name] && data[oneService.name].SOAJS && data[oneService.name].SOAJS.THROTTLING && data[oneService.name].SOAJS.THROTTLING[strategyName]){
															selected = true;
														}
														oneThrottleConfigEntry.value.push({
															'v': strategyName,
															'l': strategyName,
															'group': 'Strategies',
															'selected': selected
														});
													}
												}
											}
											
											oneThrottleConfigEntry.value.push({
												'v': null,
												'group': 'Common',
												'l': "Turn OFF Throttling"
											});
											
											oneThrottleConfigEntry.name += "_" + oneService.name;
										});
										oneTab.entries.push(serviceThrottlingConfiguration);
										
									});
								}
							}
							else {
								oneTab.description = {
									"type": "warning",
									"content":  "<p>This environment has no throttling configuration.</p>" +
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
									if (data.disableOauth) {
										oneTabEntry.value = data.disableOauth;
									}
								}
							});
						}
						
						//set the imfv configuration per service
						if(oneTab.name === 'imfvTab'){
							
							// oneServiceIMFVTmpl
							if (services && Array.isArray(services) && services.length > 0) {
								services.forEach((oneService) => {
									
									let imfvMethods = [];
									for(let method in oneService.apisList){
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
												"name": oneAPI.v,
												"label": oneAPI.l + " [ " + oneAPI.v + " ]",
												"value": {},
												"fieldMsg": "Leave empty to use the default <a target='_blank' href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/61353979/IMFV'>IMFV</a> or provide a custom configuration and it will override the <b>IMFV</b> for this API only."
											};
											
											if( data[oneService.name] && data[oneService.name].SOAJS &&
												data[oneService.name].SOAJS.IMFV && data[oneService.name].SOAJS.IMFV.schema &&
												data[oneService.name].SOAJS.IMFV.schema[oneAPI.v]
											){
												oneAPIIMFV.value = JSON.stringify(data[oneService.name].SOAJS.IMFV.schema[oneAPI.v], null, 2);
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
									
								});
							}
						}
					});
				}
			});
			
			data.customConfig = angular.copy(data.config);
			delete data.customConfig.SOAJS;
			delete data.customConfig.oauth;
			
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
							console.log(formData);
							
							// var configObj;
							// if (formData.config && (formData.config != "")) {
							// 	try {
							// 		configObj = formData.config;
							// 	}
							// 	catch (e) {
							// 		currentScope.form.displayAlert('danger', translation.errorInvalidConfigJsonObject[LANG]);
							// 		return;
							// 	}
							// }
							// else {
							// 	configObj = {};
							// }
							//
							// var postData = {
							// 	'envCode': formData.envCode,
							// 	'config': configObj
							// };
							//
							// getSendDataFromServer(currentScope, ngDataApi, {
							// 	"method": "put",
							// 	"routeName": "/dashboard/tenant/application/key/config/update",
							// 	"data": postData,
							// 	"params": {"id": tId, "appId": appId, "key": key}
							// }, function (error) {
							// 	if (error) {
							// 		currentScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							// 	}
							// 	else {
							// 		currentScope.mt.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG], tId);
							// 		currentScope.modalInstance.close();
							// 		currentScope.form.formData = {};
							// 		currentScope.reloadConfiguration(tId, appId, key);
							// 	}
							// });
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
				$timeout(() => {
					currentScope.form.refresh();
				}, 1000);
			});
		});
		
		function loadEditor(_editor){
			reloadEditor(_editor, 100, currentScope);
		}
		
		function changeEditorValue(_editor){
			currentScope.form.entries.forEach((oneEntry) => {
					if (oneEntry.type === 'tabset') {
						oneEntry.tabs.forEach((oneTab) => {
							oneTab.entries.forEach((oneServiceAccordion) => {
								if(oneServiceAccordion.entries){
									oneServiceAccordion.entries.forEach((oneMethodGroup) => {
										if(oneMethodGroup.entries){
											oneMethodGroup.entries.forEach((oneAPI) => {
												if(oneAPI.name === _editor.container.id){
													oneAPI.ngModel = JSON.stringify(oneAPI.value, null, 2);
													_editor.setValue(JSON.stringify(oneAPI.value, null, 2));
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
	function reloadEditor(_editor, fixedHeight, currentScope) {
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
			if(_editor){
				_editor.heightUpdate = heightUpdateFunction;
			}
			
			// Set initial size to match initial content
			heightUpdateFunction();
			
			// Whenever a change happens inside the ACE editor, update
			// the size again
			_editor.getSession().on('change', heightUpdateFunction);
		}, 1000);
	}
	
	//get the services this application has access to from product package acl
	function getServices(currentScope, appPackage, env, cb) {
		let services = [];
		let prodPackage;
		currentScope.availablePackages.forEach((oneProdPackage) => {
			if (oneProdPackage.pckCode === appPackage) {
				prodPackage = oneProdPackage;
				services = Object.keys(oneProdPackage.acl[env.toLowerCase()]);
				for (let i = services.length - 1; i >= 0; i--) {
					if (tenantConfig.excludedServices.indexOf(services[i]) !== -1) {
						services.splice(i, 1);
					}
				}
			}
		});
		
		getServicesFromDB(currentScope, prodPackage.acl, env, services, cb);
	}
	
	function getServicesFromDB(currentScope, acl, env, serviceNames, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list",
			"data": { "serviceNames": serviceNames }
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				for (var x = 0; x < response.records.length; x++) {
					if (response.records[x].apis) {
						response.records[x].apisList = response.records[x].apis;
					}
					else {
						if (response.records[x].versions) {
							var v = returnLatestVersion(response.records[x].versions);
							if (response.records[x].versions[v]) {
								response.records[x].apisList = response.records[x].versions[v].apis;
							}
						}
					}
					
					//reshape apisList based on methods
					let contractSchema = {};
					response.records[x].apisList.forEach((oneAPI) => {
						if(!contractSchema[oneAPI.m]){
							contractSchema[oneAPI.m] = [];
						}
						contractSchema[oneAPI.m].push(oneAPI);
					});
					
					response.records[x].apisList = contractSchema;
					delete response.records[x].versions;
					
					//remove apis that tenant has no access to
					for(let method in response.records[x].apisList){
						for(let i = response.records[x].apisList[method].length -1; i >= 0; i--){
							let oneAPI = response.records[x].apisList[method][i];
							let aclClone = {};
							aclClone[env] = angular.copy(acl[env]);
							checkApiHasAccess(aclClone, response.records[x].name, oneAPI.v, method, null, (access) => {
								if(!access){
									response.records[x].apisList[method].splice(i, 1);
								}
							});
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