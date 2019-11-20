"use strict";
var volumesApp = soajsApp.components;
volumesApp.service('volumesService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {
	
	function addVolume($scope, $modalInstance, currentScope, actions, extraInputs, data, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(volumesAppConfig.form.addVolume);
		
		if (extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0) {
			formConfig = formConfig.concat(extraInputs);
		}
		
		if (!actions) {
			actions = [
				{
					'type': 'submit',
					'label': "Create Volume",
					'btn': 'primary',
					action: function (formData) {
						$scope.save(formData);
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
		}
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			data: data,
			name: 'newVolume',
			actions: actions
		};
		
		$scope.save = function (formData, cb) {
			$scope.$valid = true;
			let input = {
				name: formData.name,
				namespace: formData.namespace,
				env: currentScope.selectedEnvironment.code,
				storage: formData.storage + "Gi",
				accessModes: formData.accessModes
			};
			
			console.log(input);
			
			$modalInstance.close();
			
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/volume/claim',
				data: input
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					currentScope.displayAlert('success', 'Volume created successfully.');
					currentScope.listVolumes();
					$modalInstance.close();
				}
			});
			
			if (cb && typeof cb === 'function') {
				return cb(input);
			}
		};
		
		buildForm($scope, $modalInstance, options, function () {
			if (data && data.namespace && extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0) {
				$scope.form.formData.namespace = data.namespace;
			}
			
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	return {
		'addVolume': addVolume
	}
}]);
