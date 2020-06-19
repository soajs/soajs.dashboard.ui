"use strict";
let registryApp = soajsApp.components;
registryApp.controller('registryCtrl', ['$scope', '$cookies', 'ngDataApi', 'injectFiles', 'throttlingSrv', '$routeParams', function ($scope, $cookies, ngDataApi, injectFiles, throttlingSrv, $routeParams) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.getRegistry = function (overlay) {
		if (overlay) {
			overlayLoading.show();
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry",
			"params": {
				"env": $scope.envCode
			}
		}, function (error, response) {
			if (overlay) {
				overlayLoading.hide();
			}
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.registry = response || null;
				throttlingSrv.get($scope, $scope.envCode, (error, response) => {
					$scope.throttling = response.throttling;
					$scope.throttlingStrategies = response.throttlingStrategies;
				});
			}
		});
	};
	
	$scope.updateRegisrty = function (data) {
		$scope.$parent.go('/registry/' + data.code);
	};
	
	$scope.updateThrottling = function (throttling) {
		throttlingSrv.update($scope, $scope.envCode, throttling);
	};
	$scope.addThrottlingStrategy = function (throttling) {
		throttlingSrv.addStrategy($scope, $scope.envCode, throttling);
	};
	$scope.updateThrottlingStrategy = function (throttling, strategy) {
		throttlingSrv.updateStrategy($scope, $scope.envCode, throttling, strategy);
	};
	$scope.removeThrottlingStrategy = function (throttling, strategy) {
		throttlingSrv.removeStrategy($scope, $scope.envCode, throttling, strategy);
	};
	
	
	$scope.editRegistry = function (code) {
		if (overlay) {
			overlayLoading.show();
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/console/registry",
			"params": {
				"env": code
			}
		}, function (error, response) {
			if (overlay) {
				overlayLoading.hide();
			}
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			}
			else {
				$scope.formEnvironment = response;
				if ($scope.formEnvironment.services && $scope.formEnvironment.services.config) {
					if ($scope.formEnvironment.services.config.logger) {
						$scope.formEnvironment.config_loggerObj = JSON.stringify($scope.formEnvironment.services.config.logger, null, 2);
						$scope.jsonEditor.logger.data = $scope.formEnvironment.config_loggerObj;
						$scope.jsonEditor.logger.editor.setValue($scope.jsonEditor.logger.data);
						fixEditorHeigh($scope.jsonEditor.logger.editor)
					}
				}
			}
		});
	};
	$scope.save = function () {
		let postData = angular.copy($scope.formEnvironment);
		let data = {
			"domain": postData.domain,
			"sitePrefix": postData.sitePrefix,
			"apiPrefix": postData.apiPrefix,
			"port": postData.port,
			"protocol": postData.protocol,
			"description": postData.description,
			"services": {
				"controller": postData.services.controller,
				"config": {
					"awareness": {
						"cacheTTL": postData.services.config.awareness.cacheTTL,
						"healthCheckInterval": postData.services.config.awareness.healthCheckInterval,
						"autoRelaodRegistry": postData.services.config.awareness.autoRelaodRegistry,
						"maxLogCount": postData.services.config.awareness.maxLogCount,
						"autoRegisterService": postData.services.config.awareness.autoRegisterService
					},
					"logger": postData.services.config.logger,
					"ports": {
						"controller": postData.services.config.ports.controller,
						"maintenanceInc": postData.services.config.ports.maintenanceInc,
						"randomInc": postData.services.config.ports.randomInc
					},
					"oauth": {
						"accessTokenLifetime": postData.services.config.oauth.accessTokenLifetime,
						"refreshTokenLifetime": postData.services.config.oauth.refreshTokenLifetime,
						"debug": postData.services.config.oauth.debug,
						"getUserFromToken": postData.services.config.oauth.getUserFromToken
					},
					"cors": postData.services.config.cors
				}
			}
		};
		console.log(data);
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/console/registry",
			"params": {
				"env": postData.code
			},
			"data": data
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
			} else {
				$scope.$parent.displayAlert('success', 'Registry updated successfully');
			}
		});
	};
	$scope.jsonEditor = {
		custom: {
			data: ""
		},
		logger: {
			data: ""
		}
	};
	$scope.editorLoaded = function (_editor) {
		//bug in jsoneditor: setting default mode to 'code' does not display data
		//to fix this, use another mode, load data, wait, switch mode, wait, start listener to validate json object
		$scope.jsonEditor.logger.editor = _editor;
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
	
	//NOTE: check if edit registry
	if ($routeParams.code) {
		$scope.editRegistry($routeParams.code);
	} else {
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			if ($scope.envCode) {
				$scope.getRegistry();
			}
		}
	}
	
	injectFiles.injectCss("modules/dashboard/environments2/environments.css");
}]);
