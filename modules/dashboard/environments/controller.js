"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$cookies', 'ngDataApi', 'Upload', 'injectFiles', '$localStorage', '$window', 'customRegistrySrv', 'throttlingSrv', function ($scope, $timeout, $modal, $routeParams, $cookies, ngDataApi, Upload, injectFiles, $localStorage, $window, customRegistrySrv, throttlingSrv) {
	$scope.$parent.isUserLoggedIn();
	$scope.newEntry = true;
	$scope.envId = null;
	$scope.formEnvironment = { services: {} };
	$scope.formEnvironment.config_loggerObj = '';
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	function putMyEnv(record) {
		var data = {
			"_id": record._id,
			"code": record.code,
			"sensitive": record.sensitive,
			"domain": record.domain,
			"profile": record.profile,
			"sitePrefix": record.sitePrefix,
			"apiPrefix": record.apiPrefix,
			"description": record.description,
			"deployer": record.deployer,
			"pending": record.pending,
			"error": record.error
		};
		for (let container in data.deployer.container) {
			for (let driver in data.deployer.container[container]) {
				if (data.deployer.container[container][driver].auth && data.deployer.container[container][driver].auth.token) {
					delete data.deployer.container[container][driver].auth.token;
				}
			}
		}
		$cookies.putObject('myEnv', data, { 'domain': interfaceDomain });
		$scope.$parent.switchEnvironment(data);
		$timeout(() => {
			$scope.$parent.rebuildMenus(function () {
			});
		}, 100);
	}
	
	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};
	
	$scope.jsonEditor = {
		custom: {
			data: ""
		},
		logger: {
			data: ""
		}
	};
	
	$scope.generateNewMsg = function (env, type, msg) {
		$scope.grid.rows.forEach(function (oneEnvRecord) {
			if (oneEnvRecord.code === env) {
				oneEnvRecord.hostInfo = {
					waitMessage: {
						"type": type,
						"message": msg
					}
				};
				
				$timeout(function () {
					oneEnvRecord.hostInfo.waitMessage.message = '';
					oneEnvRecord.hostInfo.waitMessage.type = '';
				}, 7000);
			}
		});
	};
	
	$scope.closeWaitMessage = function (context) {
		if (!context) {
			context = $scope;
		}
		context.waitMessage.message = '';
		context.waitMessage.type = '';
	};
	
	$scope.goToDeploymentProgress = function (oneEnv) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment",
			"params": {
				"id": oneEnv._id
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (response && response.template) {
					if (!$localStorage.addEnv) {
						$localStorage.addEnv = {};
					}
					$localStorage.addEnv.gi = { code: oneEnv.code };
					$scope.$parent.go("#/environments-add");
				}
			}
		});
	};
	
	$scope.listEnvironments = function (environmentId, afterDelete) {
		if (environmentId) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment",
				"params": {
					"id": environmentId
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$scope.envId = environmentId;
					$scope.newEntry = false;
					$scope.formEnvironment = response;
					if (!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')) {
						$scope.formEnvironment.services.config.session.proxy = undefined;
					}
					
					if ($scope.formEnvironment.services && $scope.formEnvironment.services.config) {
						if ($scope.formEnvironment.services.config.logger) {
							$scope.formEnvironment.config_loggerObj = JSON.stringify($scope.formEnvironment.services.config.logger, null, 2);
							$scope.jsonEditor.logger.data = $scope.formEnvironment.config_loggerObj;
							$scope.jsonEditor.logger.editor.setValue($scope.jsonEditor.logger.data);
							fixEditorHeigh($scope.jsonEditor.logger.editor)
						}
					}
					
					if ($scope.formEnvironment.deployer.type === 'manual') {
						$scope.formEnvironment.machineip = $scope.formEnvironment.deployer.manual.nodes;
					}
					else {
						let deployerInfo = $scope.formEnvironment.deployer.selected.split(".");
						if (deployerInfo[1] !== 'docker' && deployerInfo[2] !== 'local') {
							$scope.formEnvironment.machineip = $scope.formEnvironment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes;
						}
					}
					
					$scope.waitMessage.message = '';
					$scope.waitMessage.type = '';
					$scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
					
					renderThrottling(response);
				}
			});
		}
		else {
			var options = {
				"method": "get",
				"routeName": "/dashboard/environment/list",
				"params": {}
			};
			getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$localStorage.environments = angular.copy(response);
					if (afterDelete && (response.length === 0)) {
						$scope.$parent.rebuildMenus(function () {
						});
					}

					var myEnvCookie = $cookies.getObject('myEnv', { 'domain': interfaceDomain });
					var found = false;
					var newList = [];
					if (myEnvCookie) {
						for (var i = response.length - 1; i >= 0; i--) {
							if (response[i].code === myEnvCookie.code) {
								if (response[i].deployer.type === 'manual') {
									response[i].machineip = response[i].deployer.manual.nodes;
								}
								else {
									let deployerInfo = response[i].deployer.selected.split(".");
									if ((deployerInfo[1] !== 'docker' && deployerInfo[2] !== 'local') || (deployerInfo[1] === 'docker' && deployerInfo[2] !== 'local')) {
										response[i].machineip = response[i].deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes;
									}
								}
								
								newList.push(response[i]);
								putMyEnv(response[i]);
								found = true;
							}
						}
					}
					
					if (!found && response && response[0]) {
						if (response[0].deployer.type === 'manual') {
							response[0].machineip = response[0].deployer.manual.nodes;
						}
						else {
							let deployerInfo = response[0].deployer.selected.split(".");
							if ((deployerInfo[1] !== 'docker' && deployerInfo[2] !== 'local') || (deployerInfo[1] === 'docker' && deployerInfo[2] !== 'local')) {
								response[0].machineip = response[0].deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes;
							}
						}
						
						newList.push(response[0]);
						putMyEnv(response[0]);
					}
					
					$scope.grid = { rows: newList };
					if ($scope.grid.rows && $scope.grid.rows.length) {
						$scope.jsonEditor.custom.data = JSON.stringify($scope.grid.rows[0].custom, null, 2);
					}
					renderThrottling($scope.grid.rows[0]);
				}
			});
		}
		
		function renderThrottling(environment) {
			//render throttling strategies
			$scope.throttlingStrategies = [];
			if (environment && environment.services && environment.services.config && environment.services.config.throttling && Object.keys(environment.services.config.throttling).length > 0) {
				for (let strategy in environment.services.config.throttling) {
					if (['publicAPIStrategy', 'privateAPIStrategy'].indexOf(strategy) === -1) {
						$scope.throttlingStrategies.push(strategy);
					}
				}
			}
		}
	};
	
	$scope.assignThrottlingStrategy = function (oneEnv) {
		throttlingSrv.assignThrottlingStrategy($scope, oneEnv);
	};
	
	$scope.removeThrottlingStrategy = function (oneEnv, strategy) {
		throttlingSrv.removeThrottlingStrategy($scope, oneEnv, strategy);
	};
	
	$scope.addThrottlingStrategy = function (oneEnv) {
		throttlingSrv.addThrottlingStrategy($scope, oneEnv);
	};
	
	$scope.modifyThrottlingStrategy = function (oneEnv, strategy) {
		throttlingSrv.modifyThrottlingStrategy($scope, oneEnv, strategy);
	};
	
	$scope.customLoaded = function (_editor) {
		$scope.jsonEditor.custom.editor = _editor;
		// _editor.$blockScrolling = Infinity;
		_editor.setValue($scope.jsonEditor.custom.data);
		fixEditorHeigh(_editor);
	};
	
	$scope.editorLoaded = function (_editor) {
		//bug in jsoneditor: setting default mode to 'code' does not display data
		//to fix this, use another mode, load data, wait, switch mode, wait, start listener to validate json object
		$scope.jsonEditor.logger.editor = _editor;
		// _editor.$blockScrolling = Infinity;
		_editor.setValue("");
		fixEditorHeigh(_editor);
	};
	
	function fixEditorHeigh(_editor) {
		_editor.$blockScrolling = Infinity;
		_editor.scrollToLine(0, true, true);
		_editor.scrollPageUp();
		_editor.clearSelection();
		_editor.setShowPrintMargin(false);
	}
	
	$scope.getDeploymentMode = function (deployer, value) {
		if (!deployer.ui) {
			deployer.ui = {};
		}
		deployer.ui[value] = (deployer.type === value);
	};
	
	$scope.getDeploymentDriver = function (deployer, value, technology, type) {
		deployer.ui[value] = (deployer.selected === technology + '.' + value);
	};
	
	$scope.updateEnvironment = function (data) {
		$scope.$parent.go('/environments/environment/' + data._id);
	};
	
	$scope.save = function (cb) {
		var postData = angular.copy($scope.formEnvironment);
		
		if (typeof($scope.formEnvironment.services.config.session.proxy) === 'undefined') {
			postData.services.config.session.proxy = 'undefined';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === false) {
			postData.services.config.session.proxy = 'false';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === true) {
			postData.services.config.session.proxy = 'true';
		}
		delete postData.dbs;
		postData.services.config.oauth.grants = ['password', 'refresh_token'];
		
		postData.services.config.agent = {
			"topologyDir": "/opt/soajs/"
		};
		
		if ($scope.formEnvironment.config_loggerObj) {
			try {
				postData.services.config.logger = JSON.parse($scope.jsonEditor.logger.data);
			}
			catch (e) {
				$scope.displayAlert('danger', 'Logger Config: Invalid JSON Object');
				return;
			}
		}
		
		postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";
		
		if (postData.services.config.throttling) {
			if (postData.services.config.throttling.publicAPIStrategy === null) {
				postData.services.config.throttling.publicAPIStrategy = '';
			}
			if (postData.services.config.throttling.privateAPIStrategy === null) {
				postData.services.config.throttling.privateAPIStrategy = '';
			}
		}
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": (($scope.newEntry) ? "post" : "put"),
			"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
			"params": ($scope.newEntry) ? {} : { "id": $scope.envId },
			"data": postData
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (cb && typeof cb === 'function') {
					return cb();
				}
				else {
					var successMessage = translation.environment[LANG] + ' ' + (($scope.newEntry) ? translation.created[LANG] : translation.updated[LANG]) + ' ' + translation.successfully[LANG];
					$scope.$parent.displayAlert('success', successMessage);
				}
			}
		});
	};
	
	$scope.UpdateTenantSecurity = function () {
		if ($scope.access.tenantKeyUpdate) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/dashboard/environment/key/update",
				"params": { "id": $scope.envId },
				"data": {
					'algorithm': $scope.formEnvironment.services.config.key.algorithm,
					'password': $scope.formEnvironment.services.config.key.password
				}
			}, function (error, response) {
				if (error) {
					$scope.waitMessage.type = 'danger';
					$scope.waitMessage.message = getCodeMessage(error.code, 'dashboard', error.message);
				}
				else {
					$scope.newKeys = [];
					$scope.isDashEnv = false;
					var keyUpdateSuccess;
					if ($scope.formEnvironment.code.toLowerCase() === "dashboard" || $scope.formEnvironment.code.toLowerCase() === "portal") {
						$scope.isDashEnv = true;
					}
					var currentScope = $scope;

					if (response.newKeys) {
						for (var app in response.newKeys) {
							response.newKeys[app].newKeys.forEach(function (oneKey) {
								oneKey.extKeys.forEach(function (oneExtKey) {
									if (!oneExtKey.deprecated) {
										$scope.newKeys.push({
											appPackage: response.newKeys[app].package,
											key: oneKey.key,
											extKey: oneExtKey.extKey
										});
									}
								});
							});
						}
					}
					else {
						// $scope.$parent.displayAlert('success', translation.keySecurityHasBeenUpdated[LANG]);
					}
					keyUpdateSuccess = $modal.open({
						templateUrl: 'modules/dashboard/environments/directives/keyUpdateSuccess.tmpl',
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope) {
							fixBackDrop();
							$scope.currentScope = currentScope;
							$scope.reloadDashboard = function () {
								location.reload(true);
								keyUpdateSuccess.close();
							};
						}
					});
				}
			});
		}
	};
	
	$scope.removeEnvironment = function (row) {
		
		var currentScope = $scope;
		$modal.open({
			templateUrl: 'deleteEnvironment.tmpl',
			size: 'm',
			backdrop: 'static',
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				$scope.deleteEnv = row.code.toUpperCase();
				$scope.container = (row.deployer.type === 'container');
				
				fixBackDrop();
				$scope.confirmDeleteProductsAndTenants = function (flag) {
					overlayLoading.show();
					deletePortalProductsAndTenants($scope, function (error) {
						overlayLoading.hide();
						if (error) {
							currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						
						overlayLoading.show();
						deleteEnvironment($scope, flag, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.deleteEnvError = error.message;
							}
							else if (response) {
								$modalInstance.close();
								currentScope.displayAlert('success', translation.selectedEnvironmentRemoved[LANG]);
								for (let i = currentScope.$parent.leftMenu.environments.length - 1; i >= 0; i--) {
									if (currentScope.$parent.leftMenu.environments[i].code.toUpperCase() === $scope.deleteEnv) {
										currentScope.$parent.leftMenu.environments.splice(i, 1);
									}
								}
								currentScope.listEnvironments(null, true);
							}
							else {
								currentScope.displayAlert('danger', translation.unableRemoveSelectedEnvironment[LANG]);
							}
						});
						
					});
				};
				
				$scope.onlyDeleteEnv = function (flag) {
					overlayLoading.show();
					deleteEnvironment($scope, flag, function (error, response) {
						overlayLoading.hide();
						if (error) {
							$scope.deleteEnvError = error.message;
						} else {
							if (response) {
								$modalInstance.close();
								currentScope.displayAlert('success', translation.selectedEnvironmentRemoved[LANG]);
								for (let i = currentScope.$parent.leftMenu.environments.length - 1; i >= 0; i--) {
									if (currentScope.$parent.leftMenu.environments[i].code.toUpperCase() === $scope.deleteEnv) {
										currentScope.$parent.leftMenu.environments.splice(i, 1);
									}
								}
								currentScope.listEnvironments(null, true);
							}
							else {
								currentScope.displayAlert('danger', translation.unableRemoveSelectedEnvironment[LANG]);
							}
						}
					});
				};
				
				$scope.cancel = function () {
					$modalInstance.close();
				};
			}
		});
		
		
		function deletePortalProductsAndTenants(currentScope, cb) {
			//remove product portal
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "delete",
				"routeName": "/dashboard/product/delete",
				"params": { "code": "PORTAL" }
			}, function (error) {
				if (error) {
					cb(error);
				}
				else {
					//remove tenant portal
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "delete",
						"routeName": "/dashboard/tenant/delete",
						"params": { "code": "PRTL" }
					}, cb);
				}
			});
		}
		
		function deleteEnvironment(currentScope, flag, cb) {
			let opts = {
				"method": "delete",
				"routeName": "/dashboard/environment/delete",
				"params": { "id": row['_id'] }
			};
			
			if (flag) {
				opts.params.force = true;
			}
			getSendDataFromServer(currentScope, ngDataApi, opts, cb);
		}
	};

	$scope.startLimit = 0;
	$scope.totalCount = 0;
	$scope.endLimit = environmentsConfig.customRegistryIncrement;
	$scope.increment = environmentsConfig.customRegistryIncrement;
	$scope.showNext = true;
	
	$scope.getPrev = function () {
		$scope.startLimit = $scope.startLimit - $scope.increment;
		if (0 <= $scope.startLimit) {
			$scope.listCustomRegistry();
			$scope.showNext = true;
		}
		else {
			$scope.startLimit = 0;
		}
	};
	
	$scope.getNext = function () {
		var startLimit = $scope.startLimit + $scope.increment;
		if (startLimit < $scope.totalCount) {
			$scope.startLimit = startLimit;
			$scope.listCustomRegistry();
		}
		else {
			$scope.showNext = false;
		}
	};
	
	$scope.getLast = function () {
		$scope.startLimit = $scope.totalCount - ($scope.totalCount % $scope.increment);
		$scope.listCustomRegistry();
		$scope.showNext = false;
	};
	
	$scope.getFirst = function () {
		$scope.startLimit = 0;
		$scope.listCustomRegistry();
		if ($scope.increment < $scope.totalCount) {
			$scope.showNext = true;
		}
	};
	
	$scope.listCustomRegistry = function (cb) {
		customRegistrySrv.listCustomRegistry($scope, cb);
	};
	
	$scope.manageCustomRegistry = function (customRegistry, action) {
		customRegistrySrv.manageCustomRegistry($scope, customRegistry, action);
	};
	
	$scope.deleteCustomRegistry = function (customRegistry) {
		customRegistrySrv.deleteCustomRegistry($scope, customRegistry);
	};
	
	$scope.togglePlugCustomRegistry = function (customRegistry, plug) {
		customRegistrySrv.togglePlugCustomRegistry($scope, customRegistry, plug);
	};
	
	$scope.upgradeCustomRegistry = function () {
		customRegistrySrv.upgradeCustomRegistry($scope);
	};
	
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
	//default operation
	if ($routeParams.id) {
		if ($scope.access.editEnvironment) {
			$scope.listEnvironments($routeParams.id);
		}
	}
	else {
		if ($scope.access.listEnvironments) {
			$scope.listEnvironments(null);
		}
	}
	if ($scope.access.customRegistry.list) {
		if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
			$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		}
		$scope.listCustomRegistry();
	}
	
	$scope.$parent.$parent.collapseExpandMainMenu(false);
}]);

environmentsApp.filter('customRegSearch', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				if ((oneInput.name && oneInput.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) || (oneInput.author && oneInput.author.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1)) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});
