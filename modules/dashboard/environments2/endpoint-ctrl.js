"use strict";

var environmentsApp = soajsApp.components;

environmentsApp.controller('deployEndpointCtrl', ['$scope', '$cookies', 'injectFiles', 'deployRepos', function ($scope, $cookies, injectFiles, deployRepos) {
	$scope.$parent.isUserLoggedIn();

	$scope.defaultPageNumber = 1;
	$scope.defaultPerPage = 100;
	$scope.imagePath = './themes/' + themeToUse + '/img/loading.gif';

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account._id + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
		}
		else {
			jQuery('#a_' + account._id + " .body .inner").slideDown();
			account.icon = 'minus';
			account.hide = false;
		}
	};

	$scope.listEndpoints = function () {
		deployRepos.listEndpoints($scope);
	};

	$scope.listRepos = function (account, action) {
		deployRepos.listRepos($scope, account, action);
	};

	$scope.getCdData = function (cb) {
		deployRepos.getCdData($scope, cb);
	};

	$scope.getDeployedServices = function () {
		deployRepos.getDeployedServices($scope);
	};

	$scope.configureCD = function (repo) {
		deployRepos.configureCD($scope, repo);
	};

	$scope.deployService = function (oneRepo, service, version, gitAccount, daemonGrpConf) {
		deployRepos.deployService($scope, oneRepo, service, version, gitAccount, daemonGrpConf);
	};

	$scope.doDeploy = function (params) {
		deployRepos.doDeploy($scope, params, true);
	};

	$scope.checkHeapster = function () {
		deployRepos.checkHeapster($scope);
	};
	
	$scope.startService = function(oneRepo, version){
		deployRepos.startService($scope, oneRepo, version);
	};
	
	$scope.stopService = function(oneRepo, version){
		deployRepos.stopService($scope, oneRepo, version);
	};

	injectFiles.injectCss("modules/dashboard/environments2/environments.css");
	//default operation
	if ($scope.access.git.listAccounts) {
		if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
			$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		}
		
		if($scope.$parent.currentDeployer.type !== 'manual'){
			$scope.manualDeployment = false;
			$scope.listEndpoints();
			$scope.checkHeapster();
		}
	}
}]);
