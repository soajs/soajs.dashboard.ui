'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$localStorage', '$cookies', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $localStorage, $cookies) {
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
		$scope.add = true;
		var formConfig;
		var data;

		var submitAction = {
			method: 'post',
			routeName: '/dashboard/secrets/add',
			params: {}
		};

		$modal.open({
			templateUrl: "newSecret.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
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
								
								console.log(formData);
								
								var input = {
									name: formData.secretName,
									env: $scope.selectedEnvironment,
									type: 'Opaque',
									namespace: $scope.selectedNamespace
								};

								if(formData.secretData) {
									input.data = formData.secretData;
								}
								else {
									input.data = formData.file;
								}

								console.log({
									method: 'post',
									routeName: '/dashboard/secrets/add',
									params: input
								});
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
				
				formConfig[1].onAction = function(id, value, form){
					enableTextMode(value, form.entries[2]);
				};
				
				function enableTextMode (textMode, editor) {
					$scope.textMode = textMode;
					if (textMode) {
						editor.type ='textarea';
					} else {
						editor.type ='jsoneditor';
					}
				}
				
				buildForm($scope, $modalInstance, options, function () {

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
