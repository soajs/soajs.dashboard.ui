"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hostsCtrl', ['$scope', '$cookies', '$timeout', 'envHosts', 'orchestrateVMS', 'ngDataApi', 'injectFiles', function ($scope, $cookies, $timeout, envHosts, orchestrateVMS, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.groups = {};

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.showHideContent = function (type) {
		if (type === 'nginx') {
			$scope.showNginxHosts = !$scope.showNginxHosts;
		}
		else if (type === 'controller') {
			$scope.showCtrlHosts = !$scope.showCtrlHosts;
		}
	};

	$scope.showHideGroupContent = function (groupName) {
		$scope.groups[groupName].showContent = !$scope.groups[groupName].showContent;
	};

	$scope.generateNewMsg = function (env, type, msg) {
		$scope.waitMessage.type = type;
		$scope.waitMessage.message = msg;
		$timeout(function () {
			$scope.waitMessage.close();
		}, 7000);
	};

	$scope.closeWaitMessage = function (context) {
		if (!context) {
			context = $scope;
		}
		context.waitMessage.message = '';
		context.waitMessage.type = '';
	};

	$scope.getEnvironment = function (envCode, cb) {
		envHosts.getEnvironment($scope, envCode, cb);
	};

	$scope.listHosts = function (env, noPopulate) {
		$scope.waitMessage.close();
		$scope.getEnvironment(env, function () {
			envHosts.listHosts($scope, env, noPopulate);
		});
	};

	$scope.executeHeartbeatTest = function (env, oneHost) {
		envHosts.executeHeartbeatTest($scope, env, oneHost);
	};

	$scope.executeAwarenessTest = function (env, oneHost) {
		envHosts.executeAwarenessTest($scope, env, oneHost);
	};

	$scope.reloadRegistry = function (env, oneHost, cb) {
		envHosts.reloadRegistry($scope, env, oneHost, cb);
	};

	$scope.loadProvisioning = function (env, oneHost) {
		envHosts.loadProvisioning($scope, env, oneHost);
	};

	$scope.loadDaemonStats = function (env, oneHost) {
		envHosts.loadDaemonStats($scope, env, oneHost);
	};

	$scope.loadDaemonGroupConfig = function(env, oneHost) {
		envHosts.loadDaemonGroupConfig($scope, env, oneHost);
	};

	$scope.downloadProfile = function (env) {
		envHosts.downloadProfile($scope, env);
	};
	
	/** VM Operations **/
	$scope.listInfraProviders = function() {
		
		$scope.showVMs = false;
		$scope.getEnvironment($scope.envCode, function () {
			if($scope.myEnvironment.restriction){
				
				let options = {
					"method": "get",
					"routeName": "/dashboard/infra",
					"params":{
						"exclude": [ "groups", "regions", 'templates'],
						"id": Object.keys($scope.myEnvironment.restriction)[0]
					}
				};
				
				getSendDataFromServer($scope, ngDataApi, options, function (error, result) {
					if(error){
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else{
						$scope.cloudProvider = result;
						//check for vm
						if($scope.cloudProvider.technologies.includes("vm")){
							$scope.showVMs = true;
						}
					}
				});
				
			}
		});
	};
	
	$scope.listVMLayers = function() {
		orchestrateVMS.listVMLayers($scope);
	};
	
	$scope.inspectVMLayer = function(oneVMLayer){
		orchestrateVMS.inspectVMLayer($scope, oneVMLayer);
	};
	
	$scope.deleteVMLayer = function(oneVMLayer) {
		orchestrateVMS.deleteVMLayer($scope, oneVMLayer);
	};
	
	$scope.maintenanceOp = function(oneVMLayer, oneVMInstance, operation) {
		orchestrateVMS.maintenanceOp($scope, oneVMLayer, oneVMInstance, operation);
	};
	
	$scope.getVMLogs = function(oneVMLayer, oneVMInstance) {
		orchestrateVMS.getVMLogs($scope, oneVMLayer, oneVMInstance);
	};
	
	$scope.deleteVM = function(oneVMLayer, oneVMInstance) {
		orchestrateVMS.deleteVM($scope, oneVMLayer, oneVMInstance);
	};

	if ($scope.access.listHosts) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		if ($scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
			$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
			$scope.listHosts($scope.envCode);
		}
	}
	if ($scope.access.vm.list) {
		$scope.listInfraProviders();
	}
}]);
