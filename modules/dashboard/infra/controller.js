"use strict";
var infraApp = soajsApp.components;
infraApp.controller('infraCtrl', ['$scope', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraSrv', 'Upload', function ($scope, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraSrv, Upload) {
	$scope.$parent.isUserNameLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraConfig.permissions);

	$scope.getProviders = function () {
		infraSrv.getInfra($scope, (error, infras) => {
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.infraProviders = infras;
			}
		});
	};

	$scope.activateProvider = function () {
		let providersList = angular.copy(infraConfig.form.providers);
		providersList.forEach((oneProvider) => {
			oneProvider.onAction = function(id, value, form){
				$scope.modalInstance.close();
				setTimeout(() => {
					step2(id);
				}, 10);
			}
		});

		let options = {
			timeout: $timeout,
			form: {
				"entries": providersList
			},
			name: 'activateProvider',
			label: 'Connect New Provider',
			actions: [
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete $scope.form.formData;
						$scope.modalInstance.close();
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);

		function step2(selectedProvider){
			let options = {
				timeout: $timeout,
				form: {
					"entries": angular.copy(infraConfig.form[selectedProvider])
				},
				name: 'activateProvider',
				label: 'Connect New Provider',
				actions: [
					{
						'type': 'submit',
						'label': "Connect Provider",
						'btn': 'primary',
						'action': function (formData) {
							let data = angular.copy(formData);
							delete data.label;
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, {
								"method": "post",
								"routeName": "/dashboard/infra",
								"data": {
									"name": selectedProvider,
									"label": formData.label,
									"api": data
								}
							}, function (error) {
								overlayLoading.hide();
								if (error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.form.displayAlert('success', "Provider Connected & Activated");
									$scope.getProviders();
									$scope.modalInstance.close();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete $scope.form.formData;
							$scope.modalInstance.close();
						}
					}
				]
			};

			buildFormWithModal($scope, $modal, options);
		}
	};

	$scope.editProvider = function (oneProvider) {
		let providerName = oneProvider.name;
		if(oneProvider.name === 'local'){
			providerName = oneProvider.technologies[0];
		}
		let editEntriesList = angular.copy(infraConfig.form[providerName]);
		editEntriesList.shift();

		let options = {
			timeout: $timeout,
			form: {
				"entries": editEntriesList
			},
			data: oneProvider.api,
			name: 'editProvider',
			label: "Modify Connection of " + oneProvider.label,
			actions: [
				{
					'type': 'submit',
					'btn': 'primary',
					'label': 'Save',
					'action': function (formData) {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/infra",
							"params": {
								"id": oneProvider._id
							},
							"data": {
								"api": formData
							}
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.form.displayAlert('success', "Provider Connection Settings updated Successfully.");
								$scope.getProviders();
								$scope.modalInstance.close();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete $scope.form.formData;
						$scope.modalInstance.close();
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.deactivateProvider = function (oneProvider) {
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra",
			"params": {
				"id": oneProvider._id
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Provider deactivated successfully.");
				$scope.getProviders();
			}
		});
	};

	$scope.deleteDeployment = function (oneDeployment, oneInfra) {
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra/deployment",
			"params": {
				"id": oneInfra._id,
				"deploymentId": oneDeployment.id
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Deployment deleted successfully.");
				$scope.getProviders();
			}
		});
	};

	$scope.previewTemplate = function(oneTemplate){
		if(oneTemplate.location === 'local') {
			let formConfig = angular.copy({
				'entries': [
					{
						'type':'html',
						'value': "<p>" + oneTemplate.description+ "</p>"
					},
					{
						'name': 'jsonData',
						'label': '',
						'type': 'jsoneditor',
						'options': {
							'mode': 'view',
							'availableModes': []
						},
						'height': '500px',
						"value": {}
					}
				]
			});
			formConfig.entries[1].value = oneTemplate.content;
			let options = {
				timeout: $timeout,
				form: formConfig,
				name: 'infraTemplateInfo',
				label: oneTemplate.name,
				actions: [
					{
						'type': 'reset',
						'label': "Close",
						'btn': 'primary',
						'action': function () {
							$scope.modalInstance.dismiss('cancel');
							$scope.form.formData = {};
						}
					}
				]
			};
			buildFormWithModal($scope, $modal, options);
		}
	};

	$scope.deleteTemplate = function(oneTemplate, oneInfra){
		let options = {
			"method": "delete",
			"routeName": "/dashboard/infra/template",
			"params": {
				"id": oneInfra._id,
				"templateId": oneTemplate._id,
				"templateName": oneTemplate.name
			}
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				$scope.displayAlert("success", "Template deleted successfully.");
				$scope.getProviders();
			}
		});
	};

	$scope.addTemplate = function(oneInfra){
		if(oneInfra.templates){
			let entries = angular.copy(infraConfig.form.templates);

			if(oneInfra.templatesTypes.indexOf("local") !== -1){
				entries[2].value.push({'v': 'local', 'l': "Local"});
			}

			if(oneInfra.templatesTypes.indexOf("external") !== -1){
				entries[2].value.push({'v': 'external', 'l': "External"});
			}

			entries[2].onAction = function(id, value, form){
				form.entries.length = 3;
				if(value === 'local'){
					form.entries.push({
						'name': 'content',
						'label': 'Template Content',
						'type': 'jsoneditor',
						'height': '400px',
						'value': "",
						'tooltip': 'Enter the content of your Template',
						'fieldMsg': 'Template Content is represented by a JSON configuration Object',
						'required': true
					});
				}
				else if(value === 'external'){
					form.entries.push({
						'name': 'file',
						'label': 'Template File',
						'type': 'document',
						'fieldMsg': 'Provide the document that contains your infra code template.'
					});
				}
				form.entries.push(
					{
						'label': 'Inputs',
						'name': 'templateInputs',
						'type': 'jsoneditor',
						'height': '200px',
						'value': "",
						'fieldMsg': 'This JSON Editor will hold the template inputs.',
						'required': false
					},
					{
						'label': 'Display',
						'name': 'gridDisplayOptions',
						'type': 'jsoneditor',
						'height': '200px',
						'value': "",
						'fieldMsg': 'This JSON Editor will hold the template display options.',
						'required': false
					}
				)
				if(value === 'external'){
					form.entries.push({
						'name': 'tags',
						'label': 'Tags',
						'type': 'jsoneditor',
						'height': '200px',
						'value': "",
						'fieldMsg': '',
						'required': false
					});
				}
			};

			let options = {
				timeout: $timeout,
				form: {
					"entries": entries
				},
				name: 'addTemplate',
				label: 'Add Infra Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							if(oneInfra.templatesTypes.indexOf("local") !== -1){
								let options = {
									"method": "post",
									"routeName": "/dashboard/infra/template",
									"params": {
										"id": oneInfra._id
									},
									"data":{
										"template": formData
									}
								};
								overlayLoading.show();
								getSendDataFromServer($scope, ngDataApi, options, function (error) {
									overlayLoading.hide();
									if (error) {
										$scope.displayAlert("danger", error);
									}
									else {
										$scope.displayAlert("success", "Template created successfully.");
										$scope.modalInstance.close();
										$scope.getProviders();
									}
								});
							}
							else if(oneInfra.templatesTypes.indexOf("external") !== -1){
								//need to upload in this case
								if(Object.keys(formData).length < 4){
									$window.alert("Please fill out all the fields to proceed!");
								}
								else{
									let soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
									let dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
									let access_token = $cookies.get('access_token', {'domain': interfaceDomain});

									let progress = {value: 0};
									let options = {
										url: apiConfiguration.domain + "/dashboard/infra/template/upload",
										params: {
											id: oneInfra._id,
											name: formData.name,
											description: formData.description,
											access_token: access_token,
											tags: formData.tags
										},
										file: formData.file_0,
										headers: {
											'soajsauth': soajsauthCookie,
											'key': dashKeyCookie
										}
									};
									options.params.tags.type = "template";

									overlayLoading.show();
									Upload.upload(options).progress(function (evt) {
										let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
										progress.value = progressPercentage;
									}).success(function (response, status, headers, config) {
										if (response.result === false && response.errors.details.length > 0) {
											overlayLoading.hide();
											$scope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
										}
										else if (Object.keys(formData.templateInputs).length > 0 || Object.keys(formData.gridDisplayOptions).length > 0) {
											let compOptions = {
												"method": "post",
												"routeName": "/dashboard/infra/template/upload",
												"params": {
													"id": oneInfra._id
												},
												"data": {
													"name": formData.name,
													"inputs": formData.templateInputs,
													"display": formData.gridDisplayOptions
												}
											};
											getSendDataFromServer($scope, ngDataApi, compOptions, function (error, data) {
												if (error) {
													overlayLoading.hide();
													$scope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
												}
												else {
													overlayLoading.hide();
													$scope.displayAlert('success', "Template Uploaded Successfully.");
													$scope.modalInstance.close();
													$scope.getProviders();
												}
											});
										}
										else {
											overlayLoading.hide();
											$scope.displayAlert('success', "Template Uploaded Successfully.");
											$scope.modalInstance.close();
											$scope.getProviders();
										}
									}).error(function () {
										overlayLoading.hide();
										$scope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
									});

								}
							}
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete $scope.form.formData;
							$scope.modalInstance.close();
						}
					}
				]
			};

			buildFormWithModal($scope, $modal, options, () => {
				if(entries[2].value.length === 1){
					entries[2].value[0].selected = true;
				}
			});
		}
	};

	$scope.editTemplate = function(oneTemplate, oneInfra){
		if(oneTemplate.location === 'local'){
			let entries = angular.copy(infraConfig.form.templates);

			entries[2].value.push({'v': 'local', 'l': "Local", 'selected': true});
			entries.push(
				{
					'name': 'content',
					'label': 'Template Content',
					'type': 'jsoneditor',
					'height': '400px',
					'value': oneTemplate.content,
					'tooltip': 'Enter the content of your Template',
					'fieldMsg': 'Template Content is represented by a JSON configuration Object',
					'required': true
				},
				{
					'label': 'Inputs',
					'name': 'inputs',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.inputs,
					'fieldMsg': 'This JSON Editor will hold the template inputs.',
					'required': false
				},
				{
					'label': 'Display',
					'name': 'display',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.display,
					'fieldMsg': 'This JSON Editor will hold the template display options.',
					'required': false
				},
				{
					'label': 'Tags',
					'name': 'tags',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.tags,
					'fieldMsg': 'This JSON Editor will hold the template display options.',
					'required': false
				}
			);

			let options = {
				timeout: $timeout,
				form: {
					"entries": entries
				},
				data: oneTemplate,
				name: 'editTemplate',
				label: 'Modify Infra Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							let options = {
								"method": "put",
								"routeName": "/dashboard/infra/template",
								"params": {
									"id": oneTemplate._id
								},
								"data":{
									"template": formData
								}
							};
							overlayLoading.show();
							getSendDataFromServer($scope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									$scope.displayAlert("danger", error);
								}
								else {
									$scope.displayAlert("success", "Template modified successfully.");
									$scope.modalInstance.close();
									$scope.getProviders();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete $scope.form.formData;
							$scope.modalInstance.close();
						}
					}
				]
			};

			buildFormWithModal($scope, $modal, options);
		}
		else {
			let entries = angular.copy(infraConfig.form.templates);

			entries[2].value.push({'v': 'external', 'l': "external", 'selected': true});

			entries.push(
				{
					'name': 'file',
					'label': 'Template File',
					'type': 'document',
					'fieldMsg': 'Provide the document that contains your infra code template.'
				},
				{
					'label': 'Inputs',
					'name': 'inputs',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.inputs,
					'fieldMsg': 'This JSON Editor will hold the template inputs.',
					'required': false
				},
				{
					'label': 'Display',
					'name': 'display',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.display,
					'fieldMsg': 'This JSON Editor will hold the template display options.',
					'required': false
				},
				{
					'label': 'Tags',
					'name': 'tags',
					'type': 'jsoneditor',
					'height': '200px',
					'value': oneTemplate.tags,
					'fieldMsg': 'This JSON Editor will hold the template display options.',
					'required': false
				}
			);

			let options = {
				timeout: $timeout,
				form: {
					"entries": entries
				},
				data: oneTemplate,
				name: 'editTemplate',
				label: 'Modify Infra Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							//need to upload in this case
							if(Object.keys(formData).length < 4){
								$window.alert("Please fill out all the fields to proceed!");
							}
							else{
								let soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
								let dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
								let access_token = $cookies.get('access_token', {'domain': interfaceDomain});

								let progress = {value: 0};
								let options = {
									url: apiConfiguration.domain + "/dashboard/infra/template/upload",
									params: {
										id: oneInfra._id,
										name: formData.name,
										description: formData.description,
										access_token: access_token,
										tags: formData.tags
									},
									file: formData.file_0,
									headers: {
										'soajsauth': soajsauthCookie,
										'key': dashKeyCookie
									}
								};
								options.params.tags.type = "template";

								overlayLoading.show();
								Upload.upload(options).progress(function (evt) {
									let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
									progress.value = progressPercentage;
								}).success(function (response, status, headers, config) {
									if (response.result === false && response.errors.details.length > 0) {
										overlayLoading.hide();
										$scope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
									}
									else if (Object.keys(formData.templateInputs).length > 0 || Object.keys(formData.gridDisplayOptions).length > 0) {
										let compOptions = {
											"method": "post",
											"routeName": "/dashboard/infra/template/upload",
											"params": {
												"id": oneInfra._id
											},
											"data": {
												"name": formData.name,
												"inputs": formData.templateInputs,
												"display": formData.gridDisplayOptions
											}
										};
										getSendDataFromServer($scope, ngDataApi, compOptions, function (error, data) {
											if (error) {
												overlayLoading.hide();
												$scope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
											}
											else {
												overlayLoading.hide();
												$scope.displayAlert('success', "Template Uploaded Successfully.");
												$scope.modalInstance.close();
												$scope.getProviders();
											}
										});
									}
									else {
										overlayLoading.hide();
										$scope.displayAlert('success', "Template Uploaded Successfully.");
										$scope.modalInstance.close();
										$scope.getProviders();
									}
								}).error(function () {
									overlayLoading.hide();
									$scope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
								});

							}
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete $scope.form.formData;
							$scope.modalInstance.close();
						}
					}
				]
			};

			buildFormWithModal($scope, $modal, options);
		}
	};

	$scope.downloadTemplate = function(oneTemplate, oneInfra){
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra/template/download",
			"params": {
				"id": oneInfra._id,
				"templateId": oneTemplate._id
			},
			"headers": {
				"Accept": "binary/octet-stream"
			},
			"responseType": 'arraybuffer'
		};
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, options, function (error, data) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert("danger", error);
			}
			else {
				openSaveAsDialog('template.zip', data, "binary/octet-stream");
			}
		});
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
