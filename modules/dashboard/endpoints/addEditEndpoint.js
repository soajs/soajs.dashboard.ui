"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('addEditEndpoint', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', '$localStorage', '$window', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, $localStorage, $window) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.mainEndpoint = {};
	
	$scope.getEndpoint = function (_id) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/get",
			"params": {
				"id": _id,
				"mainType": "endpoints"
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
				$scope.form.formData.epType = response.models ? response.models.name : '';
				$scope.getAvailableResourcesAndMatchIfOnEdit(true);
			}
		});
	};
	
	$scope.getAvailableResourcesAndMatchIfOnEdit = function (onEdit) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/getResources",
			"params": {
				"mainType": "endpoints"
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				let none = {
					name: "None",
					category: "N/A"
				};
				
				response.unshift(none);
				
				let availableResources = [];
				
				if (response) {
					response.forEach(function (res, index) {
						res.isSelected = false;
						if (onEdit) {
							if ($scope.form.formData.authentications) {
								$scope.form.formData.authentications.forEach(function (preselectedAuth) {
									if (preselectedAuth.name === res.name) {
										res.isSelected = true;
										res.isDefault = preselectedAuth.isDefault;
									}
								});
							}
						} else {
							// on new, select none by default and make it the default as well
							if (index === 0) {
								res.isSelected = true;
								res.isDefault = true;
							}
						}
						
						availableResources.push(res);
					});
				}
				
				$scope.availableResources = availableResources;
			}
		});
	};
	
	$scope.wizard = {};
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, apiBuilderConfig.permissions);
	
	$scope.onSelectResource = function (resource) {
		if (resource.name === 'None') {
			let atLeastAnotherOneIsSelected = false;
			$scope.availableResources.forEach(function (eachRes) {
				if (eachRes.name !== 'None') {
					if (eachRes.isSelected) {
						atLeastAnotherOneIsSelected = true;
					}
				}
			});
			if (!atLeastAnotherOneIsSelected) {
				resource.isSelected = true; // force true
			}
		} else {
			let atLeastAnotherOneIsSelected = false;
			$scope.availableResources.forEach(function (eachRes) {
				if (eachRes.name !== resource.name) {
					if (eachRes.isSelected) {
						atLeastAnotherOneIsSelected = true;
					}
				}
			});
			if (!atLeastAnotherOneIsSelected) {
				$scope.availableResources[0].isSelected = true; // force select on None
			}
		}
	};
	
	$scope.onDefaultResourceSelection = function (resource) {
		$scope.availableResources.forEach(function (eachRes) {
			eachRes.isDefault = false;
		});
		resource.isDefault = true;
		resource.isSelected = true; // force select if not selected
	};
	
	$scope.Step1 = function () {
		overlayLoading.show();
		
		let entries = {
			serviceName: {
				required: true
			},
			serviceGroup: {
				required: true
			},
			servicePort: {
				required: true
			},
			serviceVersion: {
				required: true
			},
			requestTimeout: {
				required: true
			},
			requestTimeoutRenewal: {
				required: true
			},
			epType: {
				required: true
			}
		};
		
		let environmentsConfigStep1Entries = [
			{
				"name": "generalInfo",
				"directive": "modules/dashboard/endpoints/directives/add-endpoint.tmpl"
			}
		];
		var configuration = angular.copy(environmentsConfigStep1Entries);
		$scope.tempFormEntries = entries;
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEditEp',
			label: "Add/Edit Endpoint",
			actions: [
				{
					'type': 'submit',
					'label': "Save",
					'btn': 'primary',
					'action': function (formData) {
						
						//check mandatory fields
						for (let fieldName in $scope.tempFormEntries) {
							if ($scope.tempFormEntries[fieldName].required) {
								if (!formData[fieldName]) {
									$window.alert('Some of the fields under controller section are still missing.');
									return false;
								}
							}
						}
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						
						$localStorage.addEnv.step1 = angular.copy(formData);
						$scope.lastStep = 0;
						
						$scope.mainEndpoint = $scope.form.formData;
						
						// $scope.Step3(); // now skipping step 2 : -=-=-=-=-= and step3 now skipped :)
						$scope.saveEndpoint();
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						// todo
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/endpoints/1");
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			if (mode !== 'edit' && $localStorage.addEnv && $localStorage.addEnv.step1) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step1);
			}
			$scope.form.closeModal = function(){
				delete $localStorage.addEnv;
				$scope.form.formData = {};
				$scope.remoteCertificates = {};
				delete $scope.wizard;
				$scope.$parent.go("/endpoints/1");
			};
			overlayLoading.hide();
		});
	};
	
	$scope.Step2 = function () {
		overlayLoading.show();
		let environmentsConfigStep2Entries = [
			{
				"name": "generalInfo",
				"directive": "modules/dashboard/endpoints/directives/add-step2.tmpl"
			}
		];
		var configuration = angular.copy(environmentsConfigStep2Entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment2',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						
						$scope.Step3();
						
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/endpoints/1");
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			overlayLoading.hide();
		});
	};
	
	// swagger stuff ....
	
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
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
	
	$scope.Step3 = function () {
		overlayLoading.show();
		
		let mainScope = $scope;
		
		$scope.fillDefaultEditor();
		
		let environmentsConfigStep3Entries = [
			{
				"name": "generalInfo",
				"directive": "modules/dashboard/endpoints/directives/add-step3.tmpl"
			}
		];
		var configuration = angular.copy(environmentsConfigStep3Entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment2',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						
						//todo: assert the inputs
						// $localStorage.addEnv.step1 = angular.copy(formData);
						// $scope.wizard.gi = angular.copy(formData);
						// $scope.form.formData = {};
						// $scope.lastStep = 1;
						
						$scope.saveEndpoint();
						
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/endpoints/1");
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			overlayLoading.hide();
		});
	};
	
	$scope.saveEndpoint = function () {
		let api, method, _id;
		if (mode === 'edit') {
			api = 'edit';
			method = 'put';
			_id = $routeParams.id;
		} else {
			api = 'add';
			method = 'post';
		}
		
		let defaultAuthentication = '';
		
		// reformat resources before saving
		let authentications = [];
		if ($scope.availableResources) {
			$scope.availableResources.forEach(function (each) {
				if (each.isSelected) {
					let tempo = {
						name: each.name,
						category: each.category
					};
					
					if (each.isDefault) {
						tempo.isDefault = true;
						defaultAuthentication = tempo.name;
					}
					
					authentications.push(tempo);
				}
			});
		}
		
		$scope.mainEndpoint.defaultAuthentication = defaultAuthentication;
		$scope.mainEndpoint.authentications = authentications;
		// $scope.mainEndpoint.swaggerInput = $scope.editor.getValue(); // on skip step3
		$scope.mainEndpoint.swaggerInput = '';
		let opts = angular.copy($scope.mainEndpoint);
		if (opts.program){
			opts.program = opts.program.split(",");
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": method,
			"routeName": "/dashboard/apiBuilder/" + api,
			"params": {
				"mainType": "endpoints",
				"id": _id
			},
			"data": opts
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				$scope.$parent.go("/endpoints/1");
				$localStorage.addEnv.step1 = {};
			}
		});
		
	};
	
	let mode = "add";
	if ($routeParams && $routeParams.id && $routeParams.id !== "new") {
		mode = "edit";
		$scope.getEndpoint($routeParams.id);
	} else {
		$scope.getAvailableResourcesAndMatchIfOnEdit(false);
	}
	
	if ($scope.access.addEndpoint || $scope.access.editEndpoints) {
		injectFiles.injectCss("modules/dashboard/endpoints/endpoints.css");
		$scope.Step1();
	}
	
}]);