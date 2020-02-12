"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hacloudCtrl', ['$scope', '$cookies', '$timeout', 'nodeSrv', 'hacloudSrv', 'deploySrv','metricsSrv', 'orchestrateVMS', 'injectFiles', 'ngDataApi', function ($scope, $cookies, $timeout, nodeSrv, hacloudSrv, deploySrv, metricsSrv, orchestrateVMS, injectFiles, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	var autoRefreshTimeoutInstance;
	var autoRefreshTimeoutMetrics;

	$scope.serviceProviders = environmentsConfig.providers;
	$scope.localDeployment = false;
    $scope.nodes = {};
	$scope.services = {};

	$scope.ShowMetrics = {};
	$scope.servicesMetrics = {};
	
	$scope.oldStyle = false;

	$scope.kubernetesSystemDeployments = KUBERNETES_SYSTEM_DEPLOYMENTS;

	$scope.namespaceConfig = {
		defaultValue: {
			id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
			name: '--- All Namespaces ---'
		}
	};

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.refreshIntervals = [
		{
			v: 5,
			l: '5 Seconds'
		},
		{
			v: 10,
			l: '10 Seconds'
		},
		{
			v: 30,
			l: '30 Seconds'
		},
		{
			v: 60,
			l: '1 Minute'
		},
		{
			v: 300,
			l: '5 Minutes'
		},
		{
			v: 600,
			l: '10 Minutes'
		},
		{
			v: 1800,
			l: '30 Minutes',
			selected: true
		},
		{
			v: 3600,
			l: '1 Hour'
		}
	];
	$scope.selectedInterval = {
		v: 1800,
		l: '30 Minutes',
		selected: true
	};
	if($cookies.getObject('selectedInterval', {'domain': interfaceDomain})){
		$scope.selectedInterval = $cookies.getObject('selectedInterval', {'domain': interfaceDomain});
	}

	$scope.changeSectionType = function(sectionType){
		$scope.sectionType = sectionType;
	};

	$scope.changeInterval = function(oneInt){
		$scope.refreshIntervals.forEach(function(oneInterval){
			if(oneInterval.v === oneInt.v){
				if(oneInt.v !== $scope.selectedInterval.v){
					$scope.selectedInterval = oneInt;
					$cookies.putObject('selectedInterval', oneInt, {'domain': interfaceDomain});
					//force reload autoRefresh
					$scope.autoRefresh();
					$scope.autoRefreshMetrics()
				}
			}
		});
	};

	$scope.autoRefresh = function(){
		var tValue = $scope.selectedInterval.v * 1000;
		autoRefreshTimeoutInstance = $timeout(function(){
			$scope.listServices(function(){
				if(!$scope.destroyed) {
					$scope.autoRefresh();
				}
				else{
					$timeout.cancel(autoRefreshTimeoutInstance);
				}
			});
		}, tValue);
	};

	$scope.autoRefreshMetrics = function () {
		var tValue = $scope.selectedInterval.v  * 1000;
		autoRefreshTimeoutMetrics = $timeout(function () {
			$scope.getServicesMetrics(function () {
				if(!$scope.destroyed){
					$scope.autoRefreshMetrics();
				}
				else{
					$timeout.cancel(autoRefreshTimeoutMetrics);
				}
			});
		}, tValue);
	};

	$scope.generateNewMsg = function (env, type, msg) {
		$scope.waitMessage.type = type;
		$scope.waitMessage.message = msg;
		$timeout(function () {
			$scope.waitMessage.close();
		}, 7000);
	};

	$scope.showHideContent = function (service) {
		service.expanded = !service.expanded;
	};

	$scope.showHideGroupContent = function (groupName) {
		$scope.groups[groupName].showContent = !$scope.groups[groupName].showContent;
	};

	$scope.showHideGroupContent2= function (group) {
		group.expanded = !group.expanded;
	};

	$scope.getEnvironment = function(cb){
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment",
			"params":{
				"code": $scope.envCode
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.myEnvironment = response;
				
				if(cb && typeof cb === 'function'){
					return cb();
				}
			}
		});
	};
	
	$scope.scaleNodes = function(providerInfo){
		nodeSrv.scaleNodes($scope, providerInfo);
	};

	$scope.deployNewEnv = function () {
		deploySrv.deployEnvironment($scope);
	};
	
	$scope.listNodes = function () {
		nodeSrv.listNodes($scope);
    };

    $scope.addNode = function () {
	    nodeSrv.addNode($scope);
    };

    $scope.changeTag = function(node){
	    nodeSrv.changeTag($scope, node);
    };

    $scope.removeNode = function (nodeId) {
	    nodeSrv.removeNode($scope, nodeId);
    };

    $scope.updateNode = function (node, type, newStatus) {
	    nodeSrv.updateNode($scope, node, type, newStatus);
    };

	$scope.listServices = function (cb) {
		hacloudSrv.listServices($scope, cb);
	};

	$scope.listNamespaces = function (cb) {
		hacloudSrv.listNamespaces($scope, cb);
	};
	
	$scope.deleteService = function (service, groupName) {
		hacloudSrv.deleteService($scope, service, groupName);
	};

	$scope.scaleService = function (service, groupName) {
		hacloudSrv.scaleService($scope, service, groupName);
	};

	$scope.redeployService = function (service) {
		hacloudSrv.redeployService($scope, service);
	};

	$scope.rebuildService = function (service, type) {
		hacloudSrv.rebuildService($scope, service, type);
	};

	$scope.inspectService = function (service) {
		hacloudSrv.inspectService($scope, service);
	};

	$scope.reloadServiceRegistry = function (service) {
		hacloudSrv.reloadServiceRegistry($scope, service);
	};

	$scope.loadServiceProvision = function (service) {
		hacloudSrv.loadServiceProvision($scope, service);
	};
	
	$scope.executeOperation = function (service, operation) {
		hacloudSrv.executeOperation($scope, service, operation);
	};

	$scope.executeHeartbeatTest = function (service) {
		hacloudSrv.executeHeartbeatTest($scope, service);
	};

	$scope.executeAwarenessTest = function (service) {
		hacloudSrv.executeAwarenessTest($scope, service);
	};

	$scope.loadDaemonStats = function(service){
		hacloudSrv.loadDaemonStats($scope, service);
	};

	$scope.loadDaemonGroupConfig = function(service){
		hacloudSrv.loadDaemonGroupConfig($scope, service);
	};

	$scope.hostLogs = function (service, task) {
		hacloudSrv.hostLogs($scope, service, task);
	};

	$scope.getServicesMetrics = function (cb) {
		metricsSrv.getServicesMetrics($scope, cb);
	};

	$scope.showHideFailures = function(service){
		service.tasks.forEach(function(oneTask){
			if(Object.hasOwnProperty.call(oneTask, 'hideIt')){
				oneTask.hideIt = !oneTask.hideIt;
			}
		});
	};

	$scope.checkHeapster = function(cb) {
		hacloudSrv.checkHeapster($scope, cb);
	};

	$scope.checkMetricsServer = function(cb) {
		metricsSrv.checkMetricsServer($scope, cb);
	};

	$scope.deployHeapster = function(){
		deploySrv.deployHeapster($scope);
	};

	$scope.deployMetricsServer = function(){
		deploySrv.deployMetricsServer($scope);
	};
	
	$scope.autoScale = function (service) {
		hacloudSrv.autoScale($scope, service);
	};

	$scope.envAutoScale = function () {
		hacloudSrv.envAutoScale($scope);
	};

	$scope.numToArray = function(num) {
		return new Array(num);
	};

	$scope.showHideMetrics = function(containerName){
		$scope.ShowMetrics[containerName] = !($scope.ShowMetrics[containerName]);
	};
	
	/** VM Operations **/
	$scope.listInfraProviders = function() {
		
		$scope.showVMs = false;
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
	};
	
	if (!$scope.vms){
		$scope.vms = {};
	}
	
	$scope.vms.listVMLayers = function() {
		orchestrateVMS.listVMLayers($scope);
	};
	
	$scope.vms.inspectVMLayer = function(oneVMLayer){
		orchestrateVMS.inspectVMLayer($scope, oneVMLayer);
	};
	
	$scope.vms.deleteVMLayer = function(oneVMLayer) {
		orchestrateVMS.deleteVMLayer($scope, oneVMLayer);
	};
	
	$scope.vms.maintenanceOp = function(oneVMLayer, oneVMInstance, operation) {
		orchestrateVMS.maintenanceOp($scope, oneVMLayer, oneVMInstance, operation);
	};
	
	$scope.vms.getVMLogs = function(oneVMLayer, oneVMInstance) {
		orchestrateVMS.getVMLogs($scope, oneVMLayer, oneVMInstance);
	};
	
	$scope.vms.deleteVM = function(oneVMLayer, oneVMInstance) {
		orchestrateVMS.deleteVM($scope, oneVMLayer, oneVMInstance);
	};

	injectFiles.injectCss('modules/dashboard/environments/environments.css');
	if($cookies.getObject('myEnv', {'domain': interfaceDomain})){
		$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
		$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
		if($scope.envDeployer && $scope.envDeployer.selected){
			$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
			
			$scope.localDeployment = ($scope.envDeployer.selected.includes("docker.local"))
		}
	}
	
	if ($scope.access.hacloud.nodes.list && $scope.envCode) {
		$scope.getEnvironment();
		$scope.listNodes();
	}
	
	if ($scope.access.listHosts && $scope.envCode) {
		$scope.listServices(function () {
			$scope.listNamespaces(function () {
				$scope.checkHeapster(function () {
					$scope.autoRefresh();
				});
			});
		});
	}
	if ($scope.access.hacloud.services.metrics) {
		$scope.checkMetricsServer(function () {
			$scope.getServicesMetrics(function () {
				$scope.autoRefreshMetrics();
			});
		});
	}
	
	if ($scope.access.vm.list) {
		$scope.getEnvironment(() => {
			$scope.listInfraProviders();
		});
	}
	
	$scope.$on("$destroy", function () {
		$scope.destroyed = true;
		$timeout.cancel(autoRefreshTimeoutInstance);
		$timeout.cancel(autoRefreshTimeoutMetrics);
	});
}]);

environmentsApp.filter('bytesToGbytes', function () {
	return function (number) {
		number = number / 1024 / 1024 / 1024;
		return number.toFixed(2);
	};
});

environmentsApp.filter('capitalizeFirst', function () {
	return function (string) {
		return string.charAt(0).toUpperCase() + string.substring(1);
	};
});
