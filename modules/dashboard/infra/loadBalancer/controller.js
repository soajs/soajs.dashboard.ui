"use strict";
var infraLoadBalancerApp = soajsApp.components;
infraLoadBalancerApp.controller('infraLoadBalancerCtrl', ['$scope', '$localStorage', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', 'infraLoadBalancerSrv', function ($scope, $localStorage, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraCommonSrv, infraLoadBalancerSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraLoadBalancerConfig.permissions);

	infraCommonSrv.getInfraFromCookie($scope);

	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["groups", "regions", "templates"], () => {
			// infraIACSrv.rerenderTemplates($scope);
		});
	};

	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};

	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.templates;
				$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
			}
		}
		else{
			//list infras to build sidebar
			infraCommonSrv.getInfra($scope, {
				id: null,
				exclude: ["groups", "regions", "templates"]
			}, (error, infras) => {
				if (error) {
					$scope.displayAlert("danger", error);
				}
				else {
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
					if(!$scope.$parent.$parent.currentSelectedInfra){
						$scope.go("/infra");
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};

	$scope.deleteLoadBalancer = function (oneLoadBalancer) {
		infraLoadBalancerSrv.deleteLoadBalancer($scope, oneLoadBalancer);
	};

	$scope.addLoadBalancer = function (oneInfra) {
		infraLoadBalancerSrv.addLoadBalancer($scope, oneInfra);
	};

	$scope.editLoadBalancer = function (oneLoadBalancer, oneInfra) {
		infraLoadBalancerSrv.editLoadBalancer($scope, oneInfra, oneLoadBalancer);
	};

	$scope.listLoadBalancers = function (oneGroup, oneInfra) {
		infraLoadBalancerSrv.listLoadBalancers($scope, oneGroup, oneInfra);
	};

	if ($scope.access.list) {
		$scope.getProviders();

		let getInfraOpts = {
			'id': $scope.$parent.$parent.currentSelectedInfra._id,
			'exclude': ['templates', 'regions']
		};
		//get infra with groups to populate dropdown menu
		infraCommonSrv.getInfra($scope, getInfraOpts, (error, response) => {
			if (error) {
				$scope.displayAlert('danger', error);
			}
			else {
				if (response.groups && response.groups.length > 0) {
					//flag that infra doesn't have any resource groups
					$scope.noResourceGroups = false;
					$scope.infraGroups = response.groups;
				}
				else if (response.groups && response.groups.length === 0) {
					$scope.noResourceGroups = true;
				}
			}
		});
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
