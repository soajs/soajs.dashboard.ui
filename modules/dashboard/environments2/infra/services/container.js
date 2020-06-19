"use strict";

let platformContainerServices = soajsApp.components;
platformContainerServices.service('platformCntnr', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	/**
	 * Update the namespace configuration when technology is kubernetes
	 * @param currentScope
	 * @param driver
	 */
	function updateNamespaceConfig(currentScope, driver) {
		let currentConfig = angular.copy(currentScope.containers.config);
		let modal = $modal.open({
			templateUrl: "updateNamespaceConfig.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				
				$scope.title = 'Update Namespace Configuration';
				
				$scope.namespaces = {
					ui: {
						selection: [
							{value: 'existing', label: 'Choose Existing Namespace'},
							{value: 'new', label: 'Create New Namespace'}
						],
						list: [],
					},
					data: {
						selection: 'existing',
						default: currentConfig.namespace
					}
				};
				
				$scope.reset = function () {
					if ($scope.namespaces.data.selection === 'new') {
						$scope.namespaces.data.default = '';
					} else {
						$scope.namespaces.data.default = currentConfig.namespace;
					}
				};
				
				$scope.listNamespaces = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/infra/kubernetes/clusters/Namespace',
						params: {
							//configuration: {env: currentScope.envCode.toLowerCase()}
							configuration: {env: currentScope.envCode}
						}
					}, function (error, namespaces) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						} else {
							if (namespaces && namespaces.items) {
								namespaces.items.forEach(function (oneNamespace) {
									if (oneNamespace && oneNamespace.metadata) {
										$scope.namespaces.ui.list.push({
											value: oneNamespace.metadata.name,
											label: oneNamespace.metadata.name
										});
									}
								});
							}
						}
					});
				};
				
				$scope.onSubmit = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/console/environment',
						params: {},
						data: {
							code: currentScope.envCode,
							settings: {
								namespace: $scope.namespaces.data.default
							}
						}
					}, function (error) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							currentScope.containers.config.namespace = $scope.namespaces.data.default;
							$scope.closeModal();
							currentScope.displayAlert('success', 'Namespace configuration updated successfully');
						}
					});
				};
				
				$scope.closeModal = function () {
					$scope.namespaces.data = {};
					modal.close();
				};
				
				$scope.listNamespaces();
			}
		});
	}
	
	/**
	 * render the display if the environment is a containerized development and print what it is already using
	 * @param currentScope
	 */
	function checkContainerTechnology(currentScope) {
		let registry = currentScope.deployer;
		let depSeleted = _get(["selected"], registry);
		let regConf = null;
		if (depSeleted && depSeleted.includes("kubernetes")) {
			regConf = _get([].concat(depSeleted.split(".")), registry);
		}
		
		if (regConf) {
			currentScope.containers = {};
			currentScope.containers.platform = "kubernetes";
			currentScope.containers.config = regConf.configuration;
			currentScope.containers.config.namespace = regConf.namespace;
			currentScope.containers.location = depSeleted;
		}
	}
	
	return {
		'checkContainerTechnology': checkContainerTechnology,
		'updateNamespace': updateNamespaceConfig
	}
}]);
