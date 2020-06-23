/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   - mikehajj
 *  **********************************************************************************
 */

"use strict";
var throttlingService = soajsApp.components;
throttlingService.service('throttlingSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function assignThrottlingStrategy(currentScope, oneEnv){
		currentScope.newEntry = false;
		currentScope.envId = oneEnv._id;
		currentScope.formEnvironment = angular.copy(oneEnv);
		
		if(!currentScope.formEnvironment.services.config.throttling.publicAPIStrategy){
			currentScope.formEnvironment.services.config.throttling.publicAPIStrategy = "";
		}
		if(!currentScope.formEnvironment.services.config.throttling.privateAPIStrategy){
			currentScope.formEnvironment.services.config.throttling.privateAPIStrategy = "";
		}
		currentScope.save(() => {
			currentScope.$parent.displayAlert('success', "Throttling Strategy for this Environment has been updated!.");
		});
	}
	
	function removeThrottlingStrategy(currentScope, oneEnv, strategy){
		currentScope.newEntry = false;
		currentScope.envId = oneEnv._id;
		currentScope.formEnvironment = angular.copy(oneEnv);
		if(currentScope.formEnvironment.services.config.throttling.privateAPIStrategy === strategy){
			currentScope.$parent.displayAlert('danger', "You cannot remove this entry, it is assigned as the default Private APIs throttling strategy.");
		}
		else if(currentScope.formEnvironment.services.config.throttling.publicAPIStrategy === strategy){
			currentScope.$parent.displayAlert('danger', "You cannot remove this entry, it is assigned as the default Public APIs throttling strategy.");
		}
		else {
			delete currentScope.formEnvironment.services.config.throttling[strategy];
			
			if(!currentScope.formEnvironment.services.config.throttling.publicAPIStrategy){
				currentScope.formEnvironment.services.config.throttling.publicAPIStrategy = "";
			}
			if(!currentScope.formEnvironment.services.config.throttling.privateAPIStrategy){
				currentScope.formEnvironment.services.config.throttling.privateAPIStrategy = "";
			}
			currentScope.save(() => {
				currentScope.$parent.displayAlert('success', "Throttling Strategy has been removed from this Environment.");
				delete oneEnv.services.config.throttling[strategy];
				for(let i = currentScope.throttlingStrategies.length -1; i >=0; i--){
					if(currentScope.throttlingStrategies[i] === strategy){
						currentScope.throttlingStrategies.splice(i, 1);
					}
				}
			});
		}
	}
	
	function addThrottlingStrategy(currentScope, oneEnv){
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
						if(!oneEnv.services.config.throttling){
							oneEnv.services.config.throttling = {};
						}
						
						if(oneEnv.services.config.throttling[formData.name]){
							currentScope.form.displayAlert('danger', 'This strategy already exists!');
							return false;
						}
						
						currentScope.newEntry = false;
						currentScope.envId = oneEnv._id;
						currentScope.formEnvironment = angular.copy(oneEnv);
						currentScope.formEnvironment.services.config.throttling[formData.name] = angular.copy(formData);
						delete currentScope.formEnvironment.services.config.throttling[formData.name].name;
						delete currentScope.formEnvironment.services.config.throttling[formData.name].tip;
						
						if(!currentScope.formEnvironment.services.config.throttling.publicAPIStrategy){
							currentScope.formEnvironment.services.config.throttling.publicAPIStrategy = "";
						}
						if(!currentScope.formEnvironment.services.config.throttling.privateAPIStrategy){
							currentScope.formEnvironment.services.config.throttling.privateAPIStrategy = "";
						}
						
						currentScope.save(() => {
							currentScope.$parent.displayAlert('success', "Throttling Strategy has been added to this Environment!.");
							currentScope.modalInstance.close();
							oneEnv.services.config.throttling = currentScope.formEnvironment.services.config.throttling;
							currentScope.throttlingStrategies.push(formData.name);
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
	
	function modifyThrottlingStrategy(currentScope, oneEnv, strategy){
		let formConfig = environmentsConfig.form.throttling;
		let data = angular.copy(oneEnv.services.config.throttling[strategy]);
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
						currentScope.newEntry = false;
						currentScope.envId = oneEnv._id;
						currentScope.formEnvironment = angular.copy(oneEnv);
						currentScope.formEnvironment.services.config.throttling[formData.name] = angular.copy(formData);
						delete currentScope.formEnvironment.services.config.throttling[formData.name].name;
						delete currentScope.formEnvironment.services.config.throttling[formData.name].tip;
						
						if(!currentScope.formEnvironment.services.config.throttling.publicAPIStrategy){
							currentScope.formEnvironment.services.config.throttling.publicAPIStrategy = "";
						}
						if(!currentScope.formEnvironment.services.config.throttling.privateAPIStrategy){
							currentScope.formEnvironment.services.config.throttling.privateAPIStrategy = "";
						}
						
						currentScope.save(() => {
							currentScope.$parent.displayAlert('success', "Throttling Strategy has been updated at this Environment!.");
							currentScope.modalInstance.close();
							oneEnv.services.config.throttling = currentScope.formEnvironment.services.config.throttling;
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
	
	return {
		'assignThrottlingStrategy': assignThrottlingStrategy,
		'removeThrottlingStrategy': removeThrottlingStrategy,
		'modifyThrottlingStrategy': modifyThrottlingStrategy,
		'addThrottlingStrategy': addThrottlingStrategy
	}
}]);