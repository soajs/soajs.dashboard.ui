"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('secretsService', ['ngDataApi', '$timeout', function (ngDataApi, $timeout) {
	
	function addSecret($scope, $modalInstance, currentScope) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(secretsAppConfig.form.addSecret);
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			name: 'newSecret',
			actions: [
				{
					'type': 'submit',
					'label': "Create Secret",
					'btn': 'primary',
					action: function (formData) {
						let input = {
							name: formData.secretName,
							env: currentScope.selectedEnvironment.code,
							type: 'Opaque',
							namespace: currentScope.namespaceConfig.namespace
						};
						
						if (!input.data && formData.file) {
							delete $scope.editor;
							delete formData.secretData;
							input.data = formData.file;
						}
						
						if (formData.secretData) {
							input.data = formData.secretData;
							delete formData.file;
						}
						
						if (!input.data && $scope.editor) {
							input.data = $scope.editor.ngModel;
							delete formData.file;
						}
						
						if (!input.data || input.data === "" || ((input.data === "{}" || (typeof input.data === 'object' && Object.keys(input.data).length === 0)) && !formData.secretData && !formData.file)) {
							$scope.form.displayAlert("danger", "Provide a value for your secret to proceed!");
							return false;
						}
						
						getSendDataFromServer(currentScope, ngDataApi, {
							method: 'post',
							routeName: '/dashboard/secrets/add',
							data: input
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', 'Secret created successfully.');
								currentScope.listSecrets();
								$modalInstance.close();
							}
						});
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
		
		function enableTextMode(textMode, editor) {
			$scope.textMode = textMode;
			if (textMode) {
				editor.type = 'textarea';
				delete $scope.editor;
			} else {
				editor.type = 'jsoneditor';
				$scope.editor = editor;
			}
		}
		
		formConfig[1].tabs[0].entries[0].onAction = function (id, value, form) {
			enableTextMode(value, form.entries[1].tabs[0].entries[1]);
			delete form.formData.secretData;
		};
		
		formConfig[1].tabs[0].onAction = function (id, value, form) {
			delete form.formData.file;
		};
		
		formConfig[1].tabs[1].onAction = function (id, value, form) {
			form.formData.secretData = "";
			if ($scope.editor) {
				$scope.editor.ngModel = "{}";
			}
		};
		
		$scope.showContent = function (id, value, form) {
			if (!form.formData.file) {
				form.formData.file = value;
			}
		};
		
		$scope.removFile = function (form) {
			if (form && form.formData) {
				delete form.formData.file
			}
		};
		
		buildForm($scope, $modalInstance, options, function () {
			$scope.editor = $scope.form.entries[1].tabs[0].entries[1];
		});
	}
	
	return {
		'addSecret': addSecret
	}
}]);