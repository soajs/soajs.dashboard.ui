"use strict";
var multiTenantServiceConfig = soajsApp.components;
multiTenantServiceConfig.service('mtsc', ['$timeout', '$modal', function ($timeout, $modal) {
	
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
			
			if(!currentScope.availableEnvThrottling[data.envCode.toLowerCase()]){
				formEntries.entries[1].tabs.splice(0, 1);
			}
			
			// var provisionThrottling = {
			
				// can be null means throttling is off, if not set means inherit from registry
				// "publicAPIStrategy" : "default"
			
				// can be null means throttling is off, if not set means inherit from registry
				// "privateAPIStrategy": null

			// }
			
			formEntries.entries.forEach((oneEntry) => {
				if (oneEntry.type === 'tabset') {
					oneEntry.tabs.forEach((oneTab) => {
						
						//set the throttling configuration
						if (oneTab.name === 'throttling') {
							if (services && Array.isArray(services) && services.length > 0) {
								
								services.forEach((oneService) => {
									
									let serviceThrottlingConfiguration = angular.copy(tenantConfig.form.oneServiceThrottlingTmpl);
									serviceThrottlingConfiguration.name += "_" + oneService;
									serviceThrottlingConfiguration.label = oneService;
									serviceThrottlingConfiguration.entries.forEach((oneThrottleConfigEntry) => {
										
										//set the values ...
										for (let strategyName in currentScope.availableEnvThrottling[data.envCode.toLowerCase()]) {
											if (['privateAPIStrategy', 'publicAPIStrategy'].indexOf(strategyName) !== -1) {
												if (oneThrottleConfigEntry.name === 'public') {
													oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy);
												}
												
												if (oneThrottleConfigEntry.name === 'private') {
													oneThrottleConfigEntry.value[0].l = oneThrottleConfigEntry.value[0].l.replace("$strategy$", currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy);
												}
											}
											else {
												if (
													currentScope.availableEnvThrottling[data.envCode.toLowerCase()].publicAPIStrategy !== strategyName &&
													currentScope.availableEnvThrottling[data.envCode.toLowerCase()].privateAPIStrategy !== strategyName
												) {
													let selected = false;
													if(data[oneService] && data[oneService].SOAJS && data[oneService].SOAJS.THROTTLING && data[oneService].SOAJS.THROTTLING[strategyName]){
														selected = true;
													}
													oneThrottleConfigEntry.value.push({
														'v': strategyName,
														'l': strategyName,
														'selected': selected
													});
												}
											}
										}
										oneThrottleConfigEntry.name += "_" + oneService;
									});
									oneTab.entries.push(serviceThrottlingConfiguration);
									
								});
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
									let oneServiceIMFVConfiguration = angular.copy(tenantConfig.form.oneServiceIMFVTmpl);
									oneServiceIMFVConfiguration.name += "_" + oneService;
									oneServiceIMFVConfiguration.label = oneService;
									oneServiceIMFVConfiguration.entries.forEach((oneIMFVConfigEntry) => {
										
										//set the values ...
										oneIMFVConfigEntry.value = "{}";
										if(data && data[oneService] && data[oneService].SOAJS && data[oneService].SOAJS.IMFV && data[oneService].SOAJS.IMFV.schema){
											oneIMFVConfigEntry.value = data[oneService].SOAJS.IMFV.schema || "{}";
										}
										oneIMFVConfigEntry.name += "_" + oneService;
										
										
									});
									oneTab.entries.push(oneServiceIMFVConfiguration);
									
								});
							}
						}
					});
				}
			});
			
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
							var configObj;
							if (formData.config && (formData.config != "")) {
								try {
									configObj = formData.config;
								}
								catch (e) {
									currentScope.form.displayAlert('danger', translation.errorInvalidConfigJsonObject[LANG]);
									return;
								}
							}
							else {
								configObj = {};
							}
							
							var postData = {
								'envCode': formData.envCode,
								'config': configObj
							};
							
							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "put",
								"routeName": "/dashboard/tenant/application/key/config/update",
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
				$timeout(() => {
					currentScope.form.refresh();
					console.log(currentScope.form);
				}, 1000);
			});
		});
	}
	
	//get the services this application has access to from product package acl
	function getServices(currentScope, appPackage, env, cb) {
		let services = [];
		
		currentScope.availablePackages.forEach((oneProdPackage) => {
			if (oneProdPackage.pckCode === appPackage) {
				services = Object.keys(oneProdPackage.acl[env.toLowerCase()]);
				for (let i = services.length - 1; i >= 0; i--) {
					if (tenantConfig.excludedServices.indexOf(services[i]) !== -1) {
						services.splice(i, 1);
					}
				}
			}
		});
		return cb(services);
	}
	
	return {
		'updateConfiguration': updateConfiguration
	}
}]);