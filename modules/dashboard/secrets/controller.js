'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$window', '$cookies', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $window, $cookies) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};

	//get selected environment record
	$scope.selectedEnvironment = $cookies.getObject('myEnv', { 'domain': interfaceDomain });

	//set selected deployer
	$scope.envDeployer = $scope.selectedEnvironment.deployer;
	$scope.envType = $scope.envDeployer.type;
	$scope.envPlatform = '';
	if($scope.envType !== 'manual') {
		$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
	}
	
	constructModulePermissions($scope, $scope.access, secretsAppConfig.permissions);

	$scope.listSecrets = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/secrets/list',
			params: {
				env: $scope.selectedEnvironment.code,
				namespace: $scope.selectedNamespace
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.secrets = response;

				var options = {
					grid: secretsAppConfig.secretsGrid,
					data: $scope.secrets,
					left: [],
					top: []
				};

				if ($scope.access.delete) {
					options.left.push({
						'label': 'Delete Secret', //TODO: translation
						'icon': 'bin',
						'handler': 'deleteSecret'
					});
					options.top.push({
						'label': 'Delete Secrets', //TODO: translation
						'icon': 'bin',
						'handler': 'deleteSecrets'
					});
				}

				buildGrid($scope,options);
			}
		});
	};

	$scope.addSecret = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "newSecret.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				$scope.textMode = false;
				
				var formConfig = angular.copy(secretsAppConfig.form.addSecret);

				var options = {
					timeout: $timeout,
					entries: formConfig,
					name: 'newSecret',
					actions: [
						{
							'type': 'submit',
							'label': "Create Secret",
							'btn': 'primary',
							action: function (formData) {
								var input = {
									name: formData.secretName,
									env: currentScope.selectedEnvironment.code,
									type: 'Opaque',
									namespace: currentScope.selectedNamespace
								};
								
								if(!input.data && formData.file){
									delete $scope.editor;
									delete formData.secretData;
									input.data = formData.file;
								}
								
								if(formData.secretData) {
									input.data = formData.secretData;
									delete formData.file;
								}
								
								if(!input.data && $scope.editor){
									input.data = $scope.editor.ngModel;
									try{
										input.data = JSON.parse(input.data);
									}
									catch(e){
										$window.alert("Invalid JSON content provided in editor!");
									}
									delete formData.file;
								}

								if(!input.data || input.data === "" || ((input.data === "{}" || (typeof input.data === 'object' && Object.keys(input.data).length === 0)) && !formData.secretData && !formData.file)){
									$scope.form.displayAlert("danger", "Provide a value for your secret to proceed!");
									return false;
								}
								
								
								console.log(JSON.stringify({
									method: 'post',
									routeName: '/dashboard/secrets/add',
									params: input
								},null, 2));
								return false;
								getSendDataFromServer($scope, ngDataApi, {
									method: 'post',
									routeName: '/dashboard/secrets/add',
									params: input
								}, function (error, response) {
									if (error) {
										$scope.displayAlert('danger', error.message);
									}
									else {
										$scope.displayAlert('success', 'Secret created successfully.')
										$scope.listSecrets();
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
				
				function enableTextMode (textMode, editor) {
					$scope.textMode = textMode;
					if (textMode) {
						editor.type ='textarea';
						delete $scope.editor;
					} else {
						editor.type ='jsoneditor';
						$scope.editor = editor;
					}
				}
				
				formConfig[1].tabs[0].entries[0].onAction = function(id, value, form){
					enableTextMode(value, form.entries[1].tabs[0].entries[1]);
					delete form.formData.secretData;
				};
				
				formConfig[1].tabs[0].onAction = function (id, value, form){
					delete form.formData.file;
				};
				
				formConfig[1].tabs[1].onAction = function (id, value, form){
					form.formData.secretData = "";
					if($scope.editor){
						$scope.editor.ngModel = "{}";
					}
				};
				
				$scope.showContent = function(id, value, form){
					if(!form.formData.file){
						form.formData.file = value;
					}
				};
				
				$scope.removFile = function(form){
					if(form && form.formData){
						delete form.formData.file
					}
				};
				
				buildForm($scope, $modalInstance, options, function () {
					$scope.editor = $scope.form.entries[1].tabs[0].entries[1];
				});
			}
		});

	};

	$scope.deleteSecret = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/secrets/delete',
			params: {
				name: secret.name,
				env: $scope.selectedEnvironment.code,
				namespace: $scope.selectedNamespace
			}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Secret deleted successfully.');
				$scope.listSecrets();
			}
		});
	};

	$scope.deleteSecrets = function(){};
	
	// Start here
	if ($scope.access.list && $scope.envType !== 'manual') {
		$scope.listSecrets();
	}

}]);
