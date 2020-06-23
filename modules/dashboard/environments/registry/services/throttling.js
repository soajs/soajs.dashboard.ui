"use strict";

let throttlingService = soajsApp.components;
throttlingService.service('throttlingSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function get(currentScope, envCode, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry/throttling",
			"params": {
				"env": envCode
			}
		}, function (error, response) {
			let data = {};
			data.throttling = response || {};
			data.throttlingStrategies = [];
			if (response && Object.keys(response).length > 0) {
				for (let strategy in response) {
					if (response.hasOwnProperty(strategy)) {
						if (['publicAPIStrategy', 'privateAPIStrategy'].indexOf(strategy) === -1) {
							data.throttlingStrategies.push(strategy);
						}
					}
				}
			}
			return cb(error, data);
		});
	}
	
	function addStrategy(currentScope, envCode, throttling) {
		let formConfig = environmentsConfig.form.throttling;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addThrottlingStrategy',
			label: 'Add New Throttling Strategy',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						
						if (throttling[formData.name]) {
							currentScope.form.displayAlert('danger', 'This strategy already exists!');
							return false;
						}
						
						throttling[formData.name] = angular.copy(formData);
						delete throttling[formData.name].name;
						delete throttling[formData.name].tip;
						
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/console/registry/throttling",
							"params": {
								"env": envCode
							},
							"data": {
								"throttling": throttling
							}
						}, function (error) {
							if (error) {
								currentScope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
							} else {
								currentScope.$parent.displayAlert('success', "Throttling Strategy has been added to this Environment!.");
								currentScope.modalInstance.close();
								currentScope.throttlingStrategies.push(formData.name);
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
		
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function updateStrategy(currentScope, envCode, throttling, strategy) {
		let formConfig = environmentsConfig.form.throttling;
		let data = angular.copy(throttling[strategy]);
		data.name = strategy;
		
		let options = {
			timeout: $timeout,
			form: formConfig,
			data: data,
			name: 'modifyThrottlingStrategy',
			label: 'Modify Throttling Strategy',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						
						throttling[formData.name] = angular.copy(formData);
						delete throttling[formData.name].name;
						delete throttling[formData.name].tip;
						
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/console/registry/throttling",
							"params": {
								"env": envCode
							},
							"data": {
								"throttling": throttling
							}
						}, function (error) {
							if (error) {
								currentScope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
							} else {
								currentScope.$parent.displayAlert('success', "Throttling Strategy has been updated at this Environment!.");
								currentScope.modalInstance.close();
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
		
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function removeStrategy(currentScope, envCode, throttling, strategy) {
		
		if (throttling.privateAPIStrategy === strategy) {
			currentScope.$parent.displayAlert('danger', "You cannot remove this entry, it is assigned as the default Private APIs throttling strategy.");
		}
		else if (throttling.publicAPIStrategy === strategy) {
			currentScope.$parent.displayAlert('danger', "You cannot remove this entry, it is assigned as the default Public APIs throttling strategy.");
		}
		else {
			delete throttling[strategy];
			
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "put",
				"routeName": "/console/registry/throttling",
				"params": {
					"env": envCode
				},
				"data": {
					"throttling": throttling
				}
			}, function (error) {
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					currentScope.$parent.displayAlert('success', "Throttling Strategy has been removed from this Environment.");
					let index = currentScope.throttlingStrategies.indexOf(strategy);
					if (index > -1) {
						currentScope.throttlingStrategies.splice(index, 1);
					}
				}
			});
		}
	}
	
	function update(currentScope, envCode, throttling) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "put",
			"routeName": "/console/registry/throttling",
			"params": {
				"env": envCode
			},
			"data": {
				"throttling": throttling
			}
		}, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			} else {
				currentScope.$parent.displayAlert('success', "Throttling Strategy for this Environment has been updated!.");
			}
		});
	}
	
	return {
		'get': get,
		'update': update,
		'addStrategy': addStrategy,
		'updateStrategy': updateStrategy,
		'removeStrategy': removeStrategy
	}
}]);