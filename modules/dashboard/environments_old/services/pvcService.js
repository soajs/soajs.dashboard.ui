"use strict";
var pvcApp = soajsApp.components;
pvcApp.service('pvcService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {
	
	function addVolume($scope, $modalInstance, currentScope, actions, extraInputs, data, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(environmentsConfig.form.addVolume);
		
		if (extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0) {
			formConfig = formConfig.concat(extraInputs);
		}
		
		if (!actions) {
			actions = [
				{
					'type': 'submit',
					'label': "Create PVC",
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
			name: 'newPVC',
			actions: actions
		};
		
		$scope.save = function (formData, cb) {
			$scope.$valid = true;
			let input = {
				name: formData.name,
				configuration : {
					env: currentScope.selectedEnvironment.code,
				},
				storage: formData.storage + "Gi",
				accessModes: formData.accessModes,
				storageClassName: formData.storageClassName,
				volumeMode: formData.volumeMode
			};
			
			$modalInstance.close();
			
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'post',
				routeName: '/infra/kubernetes/pvc',
				data: input
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					currentScope.displayAlert('success', 'PVC created successfully.');
					currentScope.listPVC();
					$modalInstance.close();
				}
			});
			
			if (cb && typeof cb === 'function') {
				return cb(input);
			}
		};
		
		buildForm($scope, $modalInstance, options, function () {
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	return {
		'addVolume': addVolume
	}
}]);
