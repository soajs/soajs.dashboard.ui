'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$window', '$cookies', 'secretsService', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $window, $cookies, secretsService) {
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

				let options = {
					grid: secretsAppConfig.secretsGrid,
					data: $scope.secrets,
					left: [],
					top: []
				};

				if ($scope.access.delete) {
					options.left.push({
						'label': 'Delete Secret', //TODO: translation
						'icon': 'bin',
						'handler': 'deleteSecret',
						'msg': "Are you sure you want to delete this secret ?"
					});
					options.top.push({
						'label': 'Delete Secret(s)', //TODO: translation
						'icon': 'bin',
						'handler': 'deleteSecrets',
						'msg': "Are you sure you want to delete the selected secret(s) ?"
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
				
				secretsService.addSecret($scope,$modalInstance,currentScope);
				
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
				namespace: $scope.namespaceConfig.namespace
			}
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Secret deleted successfully.');
				$scope.listSecrets();
			}
		});
	};

	$scope.deleteSecrets = function() {
		overlayLoading.show();
		let config = {
			'method': 'delete',
			'routeName': "/dashboard/secrets/delete",
			"params": {
				'name': '%name%',
				'env': $scope.selectedEnvironment.code,
				'namespace': $scope.namespaceConfig.namespace
			},
			'override':{
				'fieldName': 'name',
			},
			'msg': {
				'error': "Error Removing the selected secret(s)",
				'success': "Selected Secret(s) have been removed"
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function () {
			overlayLoading.hide();
			$scope.listSecrets();
		});
	};

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
	};

	// Start here
	if ($scope.access.list && $scope.envType !== 'manual') {
		$scope.listNamespaces($scope, () => {});
		$scope.listSecrets();
	}

}]);
