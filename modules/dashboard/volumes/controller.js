'use strict';
var volumesApp = soajsApp.components;

volumesApp.controller('volumesAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$window', '$cookies', 'volumesService', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $window, $cookies, volumesService) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	
	//get selected environment record
	$scope.selectedEnvironment = $cookies.getObject('myEnv', {'domain': interfaceDomain});
	
	//set selected deployer
	$scope.envDeployer = $scope.selectedEnvironment.deployer;
	$scope.envType = $scope.envDeployer.type;
	$scope.envPlatform = '';
	if ($scope.envType !== 'manual') {
		$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
	}
	
	$scope.namespaceConfig = {
		defaultValue: {
			id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
			name: '--- All Namespaces ---'
		}
	};
	
	constructModulePermissions($scope, $scope.access, volumesAppConfig.permissions);
	
	$scope.listVolumes = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/volume/claims',
				params: {
					env: $scope.selectedEnvironment.code,
					namespace: $scope.namespaceConfig.namespace
				}
			},
			function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				} else {
					response.forEach((volume) => {
						volume.accessModes = volume.accessModes.join(' - ');
					});
					
					$scope.volumes = response;
					
					let options = {
						grid: volumesAppConfig.volumesGrid,
						data: $scope.volumes,
						left: [],
						top: []
					};
					
					if ($scope.access.delete) {
						options.left.push({
							'label': 'Delete Volume', //TODO: translation
							'icon': 'bin',
							'handler': 'deleteVolume',
							'msg': "Are you sure you want to delete this volume ?"
						});
						options.top.push({
							'label': 'Delete Volumes(s)', //TODO: translation
							'icon': 'bin',
							'handler': 'deleteVolumes',
							'msg': "Are you sure you want to delete the selected volume(s) ?"
						});
					}
					
					buildGrid($scope, options);
				}
			});
	};
	
	$scope.addVolume = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "newVolume.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				volumesService.addVolume($scope, $modalInstance, currentScope);
			}
		});
	};// add storage with Gi
	
	$scope.deleteVolume = function (volume) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/volume/claim',
			params: {
				name: volume.name,
				env: $scope.selectedEnvironment.code,
				namespace: $scope.namespaceConfig.namespace
			}
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Volume deleted successfully.');
				$scope.listVolumes();
			}
		});
	};
	
	$scope.deleteVolumes = function () {
		overlayLoading.show();
		let config = {
			'method': 'delete',
			'routeName': "/dashboard/volume/claim",
			"params": {
				'name': '%name%',
				'env': $scope.selectedEnvironment.code,
				'namespace': $scope.namespaceConfig.namespace
			},
			'override': {
				'fieldName': 'name',
			},
			'msg': {
				'error': "Error Removing the selected volume(s)",
				'success': "Selected Volume(s) have been removed"
			}
		};
		
		multiRecordUpdate(ngDataApi, $scope, config, function () {
			overlayLoading.hide();
			$scope.listVolumes();
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
			} else {
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/environment/list"
				}, function (error, envList) {
					if (error) {
						currentScope.displayAlert('danger', error.message);
					}
					for (let i = response.length - 1; i >= 0; i--) {
						envList.forEach((oneEnv) => {
							let deployerInfo = oneEnv.deployer.selected.split(".");
							if (oneEnv.deployer.selected.indexOf("container.kubernetes") !== -1) {
								if (oneEnv.code.toLowerCase() !== currentScope.selectedEnvironment.code.toLowerCase())
									if (response[i] && response[i].name && response[i].name === oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].namespace.default) {
										response.splice(i, 1);
									}
							}
						});
					}
					currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
					currentScope.namespaces = currentScope.namespaces.concat(response);
					
					currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'
					
					if (cb && typeof (cb) === 'function') {
						return cb();
					}
				});
			}
		});
	};
	
	// Start here
	if ($scope.access.list && $scope.envType !== 'manual') {
		$scope.listNamespaces($scope, () => {
		});
		$scope.listVolumes();
	}
	
}]);
