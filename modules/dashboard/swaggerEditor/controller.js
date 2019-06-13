"use strict";
var swaggerEditorApp = soajsApp.components;

swaggerEditorApp.controller('swaggerEditorCtrl', ['$scope', '$timeout', 'injectFiles', 'swaggerEditorSrv', 'swaggerParser', 'swaggerClient', '$cookies', 'detectBrowser', 'ngDataApi','$routeParams', function ($scope, $timeout, injectFiles, swaggerEditorSrv, swaggerParser, swaggerClient, $cookies, detectBrowser, ngDataApi,$routeParams) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.schemaCode = '';
	$scope.schemaCodeF = '';
	$scope.hideToolTip = ($cookies.get("swagger_tooltip_hide", {'domain': interfaceDomain}) === "true") || false;
	$scope.collapsed = false;
	$scope.swaggerCode = false;
	
	$scope.myBrowser = detectBrowser();
	if ($scope.myBrowser === 'safari') {
		$scope.isSafari = true;
	}
	else {
		$scope.isSafari = false;
	}
	
	constructModulePermissions($scope, $scope.access, swaggerEditorConfig.permissions);
	// This scope will show and hide the editor containing the yaml code and make the swagger ui collapse and expand accordingly.
	$scope.collapseExpand = function () {
		$scope.collapsed = !$scope.collapsed;
	};
	// This scope will show and hide the explanation shown on top of the swagger editor page
	$scope.hideShowToolTip = function () {
		$scope.hideToolTip = !$scope.hideToolTip;
		$cookies.put("swagger_tooltip_hide", $scope.hideToolTip, {'domain': interfaceDomain});
		return $scope.hideToolTip;
	};
	// This function will call the swaggerEditorSrv service that will build the form and will have the ability to read
	// the user filled values.
	$scope.buildEditorForm = function () {
		swaggerEditorSrv.buildSwaggerForm($scope);
	};
	// This function will take the yaml as a string and pass it to the simulator that will generate the APIs documentation
	$scope.moveYamlRight = function () {
		$scope.schemaCodeF = $scope.schemaCode;
		try {
			$scope.schemaCodeF= YAML.parse($scope.schemaCode);
		}
		catch (e) {
			try {
				$scope.schemaCodeF= JSON.parse($scope.schemaCode);
			}
			catch (e) {
			}
		}
		watchSwaggerSimulator(function () {
			console.log("swagger ui info has been updated");
		});
	};
	// This scope will clear the content of the swagger UI but keeps the code in the editor
	$scope.clearYamlRight = function () {
		$scope.schemaCodeF = "";
		$scope.swaggerCode = false;
	};
	// event listener that hooks ace editor to the scope and hide the print margin in the editor
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
	};
	// This scope will update the scope value on change in the editor
	$scope.updateScopeValue = function () {
		$scope.schemaCode = $scope.editor.getValue();
	};
	
	$scope.fillDefaultEditor = function () {
		if (!$scope.schemaCodeF || $scope.schemaCodeF === "") {
			if ($scope.form.formData.serviceName && $scope.form.formData.serviceName.trim() !== '') {
				var serviceName = $scope.form.formData.serviceName.trim();
				var swaggerYML = "swagger: \"2.0\"\n" +
					"info:\n" +
					"  version: \"1.0.0\"\n" +
					"  title: " + serviceName + "\n" +
					"host: localhost\n" +
					"basePath: /" + serviceName + "\n" +
					"schemes:\n" +
					"  - http\n" +
					"paths:\n\n" +
					"parameters:\n\n" +
					"definitions:\n\n";
			}
			$scope.schemaCodeF = swaggerYML;
			$timeout(function () {
				if (!$scope.schemaCodeF) {
					$scope.schemaCodeF = '';
				}
				$scope.editor.setValue($scope.schemaCodeF);
			}, 100);
		}
	};
	
	/*
	 * This function updates the host value of the swagger simulator and check if the YAML code is valid so it will
	 * enable the generate button.
	 */
	function watchSwaggerSimulator(cb) {
		//grab the swagger info
		var x = swaggerParser.fetch();
		console.log(x)
		if (!x || x.length === 0 || typeof(x[3]) !== 'object' || Object.keys(x[3]).length === 0) {
			$timeout(function () {
				watchSwaggerSimulator(cb);
			}, 100);
		}
		else {
			var dashboardDomain = apiConfiguration.domain.replace(window.location.protocol + "//", "");
			//modify the host value with the domain value of dashboard taken dynamically from the main config.js
			x[3].host = dashboardDomain;
			x[3].info.host = dashboardDomain;
			x[3].basePath = "/dashboard/swagger/simulate";
			x[3].info.basePath = "/dashboard/swagger/simulate";
			console.log("switching to host and basepath to swagger simulate api in dashboard:", x[3].host + x[3].basePath);
			$scope.swaggerCode = x[4];
			//apply the changes
			swaggerParser.execute.apply(null, x);
			return cb(null, true);
		}
	}
	
	// This scope will take the values of the valid Yaml file, the service information, check for errors or missing
	// fields and generate the service in a zip file in case of success.
	$scope.GenerateService = function () {
		if ($scope.access.generate) {
			swaggerEditorSrv.prepareServiceAndCallApi($scope,'generateService');
		}
	};
	
	$scope.goBackToApiBuilder = function () {
		$scope.$parent.go("/endpoints");
	};
	
	$scope.getService = function (_id) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/get",
			"params": {
				"id": _id,
				"mainType": "services"
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				if(!$scope.form){
					$scope.form = {};
				}
				
				$scope.form.formData = response;
				$scope.serviceOnEditId = response._id;
				
				$scope.buildEditorForm();
			}
		});
	};
	
	$scope.saveService = function () {
		if ($scope.access.generate) {
			swaggerEditorSrv.prepareServiceAndCallApi($scope,'saveService');
		}
	};
	
	if ($scope.access.getService && $routeParams && $routeParams.id && $routeParams.id !== "new") {
		$scope.mode = "edit";
		$scope.getService($routeParams.id);
	}
	else{
		if ($scope.access.generate) {
			$scope.mode = "add";
			$scope.buildEditorForm();
		}
	}
	
	injectFiles.injectCss("modules/dashboard/swaggerEditor/swaggerEditor.css");
}]);
