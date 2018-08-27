'use strict';
var templatesApp = soajsApp.components;

templatesApp.controller('templatesAppCtrl', ['$scope', '$timeout', 'injectFiles', 'templateSrv', 'detectBrowser', '$modal', '$window', 'ngDataApi', '$cookies', '$location', function ($scope, $timeout, injectFiles, templateSrv, detectBrowser, $modal, $window, ngDataApi, $cookies, $location) {
	$scope.$parent.isUserLoggedIn();
	$scope.showSOAJSStoreLink = $scope.$parent.$parent.showSOAJSStoreLink;
	
	$scope.templatesDocumentationLink = templatesAppConfig.documentationLink;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, templatesAppConfig.permissions);
	
	$scope.alerts = null;
	
	let myBrowser = detectBrowser();
	$scope.isSafari = myBrowser === 'safari';
	
	$scope.listTemplates = function(){
		$scope.alerts = null;
		templateSrv.listTemplates($scope);
	};
	
	$scope.deleteTmpl = function(oneTemplate){
		templateSrv.deleteTmpl($scope, oneTemplate);
	};
	
	$scope.upgradeTemplates = function(){
		templateSrv.upgradeTemplates($scope);
	};
	
	$scope.showTemplateContent = function(oneTmpl) {
		let parentScope = $scope;
		
		$modal.open({
			templateUrl: "templateInfoBox.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.link = (oneTmpl.link) ? oneTmpl.link : null;
				$scope.logo = (oneTmpl.logo) ? oneTmpl.logo : null;
				
				$scope.title = oneTmpl.name;
				$scope.reusable = true;
				if(Object.hasOwnProperty.call(oneTmpl, 'reusable')){
					$scope.reusable = oneTmpl.reusable;
				}
				
				if(oneTmpl.restriction){
					$scope.restriction = oneTmpl.restriction;
				}
				
				$scope.description = oneTmpl.description;
				$scope.content = oneTmpl.content;
				
				if($scope.content.deployments){
					if($scope.content.deployments.repo){
						$scope.content.deployments.repo.max = Object.keys($scope.content.deployments.repo).length;
					}
					
					if($scope.content.deployments.resources){
						$scope.content.deployments.resources.max = Object.keys($scope.content.deployments.resources).length;
					}
				}
				
				$scope.close = function () {
					$modalInstance.close();
				};
				
				$scope.exportTemplateContent = function(){
					parentScope.exportTemplateContent(oneTmpl);
				};
			}
		});
	};
	
	$scope.exportTemplateContent = function(oneTmpl){
		if($scope.isSafari){
			$window.alert("The Downloader of this module is not compatible with Safari. Please use another browser.");
			return false;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/templates/export',
			'data': {
				"id": oneTmpl._id
			},
			"headers": {
				"Accept": "application/zip"
			},
			"responseType": 'arraybuffer',
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				openSaveAsDialog("soajs_template_" + new Date().toISOString() + ".zip", response, "application/zip");
			}
		});
	};
	
    $scope.go = function (path, method) {
        if (path) {
            $cookies.put("method", method, {});
            $location.path(path);
        }
    };
	
	injectFiles.injectCss("modules/dashboard/templates/templates.css");
	
	// Start here
	if ($scope.access.list) {
		$scope.listTemplates();
	}
	
}]);