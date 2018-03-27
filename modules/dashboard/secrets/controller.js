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

	$scope.namespaceConfig = {
		defaultValue: {
			id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
			name: '--- All Namespaces ---'
		}
	};

	constructModulePermissions($scope, $scope.access, secretsAppConfig.permissions);

	$scope.listSecrets = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/secrets/list',
			params: {
				env: $scope.selectedEnvironment.code,
				namespace: $scope.namespaceConfig.namespace
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
								return false;

								var input = {
									name: formData.secretName,
									env: currentScope.selectedEnvironment.code,
									type: 'Opaque',
									namespace: currentScope.selectedNamespace
								};

								if(formData.secretData) {
									input.data = formData.secretData;
									delete formData.file;
								}
								else {
									delete formData.secretData;
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

				formConfig[1].tabs[0].entries[1].onAction = function(id, value, form){
					enableTextMode(value, form.entries[1].tabs[0].entries[1]);
				};
				function enableTextMode (textMode, editor) {
					$scope.textMode = textMode;
					if (textMode) {
						editor.type ='textarea';
					} else {
						editor.type ='jsoneditor';
					}
				}

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

	$scope.listNamespaces = function (currentScope, cb) {
		if (currentScope.envPlatform !== 'kubernetes') {
			//in case of swarm deployment, set namespace value to All Namespaces and set filter value to null in order to always display all fields
			currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
			currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id;
			return cb();
		}

		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cloud/namespaces/list',
			params: {
				env: currentScope.selectedEnvironment.code.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
				currentScope.namespaces = currentScope.namespaces.concat(response);

				currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'

				if (cb && typeof(cb) === 'function') {
					return cb();
				}
			}
		});
	}

	// Start here
	if ($scope.access.list && $scope.envType !== 'manual') {
		$scope.listNamespaces($scope, () => {});
		$scope.listSecrets();
	}

}]);
