"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['ngDataApi', '$timeout', '$modal', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $cookies, Upload) {

	function renderDisplay(currentScope) {
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		if(currentScope.environment.type !== 'manual'){
			currentScope.platform = currentScope.environment.selected.split(".")[1];
			currentScope.driver = currentScope.environment.selected.split(".")[2];
			currentScope.config = currentScope.environment.container[currentScope.platform][currentScope.driver];
			
			if(currentScope.originalEnvironment.certs){
				let certs = [];
				currentScope.originalEnvironment.certs.forEach((oneCert)=>{
					if(oneCert.metadata.env[currentScope.envCode.toUpperCase()]){
						certs.push({
							_id: oneCert._id,
							filename: oneCert.filename,
							certType: oneCert.metadata.certType
						});
					}
				});
				currentScope.config.certs = certs;
			}
		}
		
		currentScope.oldDocker = false;
		if(!currentScope.config.auth && !currentScope.config.auth.token && currentScope.config.certs && currentScope.config.certs.length > 0){
			currentScope.oldDocker = true;
		}
	}

	function updateNamespaceConfig(currentScope, driver) {
		var currentConfig = angular.copy(currentScope.config);
		var modal = $modal.open({
			templateUrl: "updateNamespaceConfig.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				
				$scope.title = 'Update Namespace Configuration';
				
				$scope.namespaces = {
					ui: {
						selection: [
							{ value: 'existing', label: 'Choose Existing Namespace' },
							{ value: 'new', label: 'Create New Namespace' }
						],
						list: [],
						type: [
							{ value: 'global', label: 'Global' },
							{ value: 'perService', label: 'Per Service' }
						]
					},
					data: {
						selection: 'existing',
						default: currentConfig.namespace.default,
						type: (currentConfig.namespace.perService) ? 'perService' : 'global'
					}
				};

				$scope.reset = function () {
					if ($scope.namespaces.data.selection === 'new') {
						$scope.namespaces.data.default = '';
					}
					else {
						$scope.namespaces.data.default = currentConfig.namespace.default;
					}
				};

				$scope.listNamespaces = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cloud/namespaces/list',
						params: {
							env : currentScope.envCode.toLowerCase()
						}
					}, function (error, namespaces) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							namespaces.forEach(function (oneNamespace) {
								$scope.namespaces.ui.list.push({ value: oneNamespace.id, label: oneNamespace.name });
							});
						}
					});
				};

				$scope.onSubmit = function () {
					var newConfig = {
						namespace: {
							default: $scope.namespaces.data.default,
							perService: (($scope.namespaces.data.type === 'perService') ? true : false)
						}
					};
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error, result) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.closeModal();
							currentScope.displayAlert('success', 'Namespace configuration updated successfully');
							currentScope.getEnvPlatform();
						}
					});
				};

				$scope.closeModal = function () {
					$scope.namespaces.data = {};
					$scope.driver = {};
					modal.close();
				};

				$scope.listNamespaces();
			}
		});
	}

	return {
		'renderDisplay': renderDisplay,
		'updateNamespaceConfig': updateNamespaceConfig
	}
}]);
