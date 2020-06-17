"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('secretsService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {

	function addSecret($scope, $modalInstance, currentScope, actions, extraInputs, data, cb) {

		$scope.textMode = false;

		let formConfig = angular.copy(environmentsConfig.form.addSecret);

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

		

		$scope.save = function(formData, cb){
			$scope.$valid = true;
			let input = {
				name: formData.secretName,
				configuration : {
					env: currentScope.selectedEnvironment.code,
				}
			};
			let routeName = '/infra/kubernetes/secret';
			if (formData.secretType === 'kubernetes.io/dockercfg') {
				routeName = '/infra/kubernetes/secret/registry';
				input.content = {};
				input.content.username = formData.registryUsername;
				input.content.password = formData.registryPassword;
				input.content.server = formData.registryServer;
				input.content.email = formData.registryEmail;
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
				input.content = [{
					name : formData.secretLabel,
					content: typeof input.data === "string" ? input.data :  input.data.toString()
				}];
				delete input.data;
				delete input.datatype;
			}
			if($scope.$valid && $modalInstance){
				$modalInstance.close();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'post',
					routeName: routeName,
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
		
		formConfig[1].tabs[0].entries[1].onAction = function (id, value, form) {
			enableTextMode(value, form.entries[1].tabs[0].entries[2]);
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
		formConfig[1].tabs[2].onAction = function (id, value, form) {
			form.formData.secretType =  "kubernetes.io/dockercfg";
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
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			data: data,
			name: 'newSecret',
			actions: actions
		};
		buildForm($scope, $modalInstance, options, function () {
			$scope.editor = $scope.form.entries[1].tabs[0].entries[1];
			
			if(cb && typeof cb === 'function'){
				return cb();
			}
		});
	}

	return {
		'addSecret': addSecret
	}
}]);
