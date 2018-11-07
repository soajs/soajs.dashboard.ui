"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('secretsService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {

	function addSecret($scope, $modalInstance, currentScope, actions, extraInputs, data, cb) {

		$scope.textMode = false;

		let formConfig = angular.copy(secretsAppConfig.form.addSecret);

		if(extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0){
			formConfig = formConfig.concat(extraInputs);
		}

		if(!actions){
			actions = [
				{
					'type': 'submit',
					'label': "Create Secret",
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
			name: 'newSecret',
			actions: actions
		};

		$scope.save = function(formData, cb){
			$scope.$valid = true;
			let input = {
				name: formData.secretName,
				env: currentScope.selectedEnvironment.code,
				type: formData.secretType,
				namespace: currentScope.namespaceConfig.namespace,
			};
			if (formData.secretType === 'kubernetes.io/dockercfg') {
				input.data = {};
				input.data.username = formData.registryUsername;
				input.data.password = formData.registryPassword;
				input.data.server = formData.registryServer;
				input.data.email = formData.registryEmail;
			}
			else {
				if (!input.data && formData.file) {
					delete $scope.editor;
					delete formData.secretData;
					input.data = formData.file;
					input.datatype = "file";
				}
				
				if (formData.secretData) {
					input.data = formData.secretData;
					input.datatype = "text";
					delete formData.file;
				}
				
				if (!input.data && $scope.editor) {
					input.data = $scope.editor.ngModel;
					input.datatype = "editor";
					delete formData.file;
				}
				
				if (input.datatype === 'editor') {
					try {
						let x = JSON.parse(input.data);
					}
					catch (e) {
						$window.alert("Invalid JSON Content Provided");
						$scope.$valid = false;
						return false;
					}
				}
				if (!input.data || input.data === "" || ((input.data === "{}" || (typeof input.data === 'object' && Object.keys(input.data).length === 0)) && !formData.secretData && !formData.file)) {
					$window.alert("Provide a value for your secret to proceed!");
					$scope.$valid = false;
					return false;
				}
			}
			if(formData.type === 'kubernetes.io/dockercfg' || ($scope.$valid && $modalInstance)){
				if (typeof input.data === "object") {
					input.data = JSON.stringify(input.data);
				}
				$modalInstance.close();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/secrets/add',
					data: input
				}, function (error) {
					if (error) {
						currentScope.displayAlert('danger', error.message);
					}
					else {
						currentScope.displayAlert('success', 'Secret created successfully.');
						currentScope.listSecrets();
						$modalInstance.close();
					}
				});
			}

			if(cb && typeof cb === 'function'){
				return cb(input);
			}
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
			form.formData.secretType = "Opaque";
		};

		formConfig[1].tabs[1].onAction = function (id, value, form) {
			form.formData.secretData = "";
			if ($scope.editor) {
				$scope.editor.ngModel = "{}";
			}
			form.formData.secretType = "Opaque";
		};
		if (currentScope.envPlatform === 'kubernetes'
			|| currentScope.wizard
			&& currentScope.wizard.deployment
			&& currentScope.wizard.deployment.technology === 'kubernetes'){
			formConfig[1].tabs[2].onAction = function (id, value, form) {
				form.formData.secretType =  "kubernetes.io/dockercfg";
			};
		}
		else {
			delete formConfig[1].tabs[2];
		}
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

			if(data && data.namespace && extraInputs && Array.isArray(extraInputs) && extraInputs.length > 0){
				$scope.form.formData.namespace = data.namespace;
			}

			if(cb && typeof cb === 'function'){
				return cb();
			}
		});
	}

	return {
		'addSecret': addSecret
	}
}]);
