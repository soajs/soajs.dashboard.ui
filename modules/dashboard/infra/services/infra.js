"use strict";
var infraSrv = soajsApp.components;
infraSrv.service('infraSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function getInfra(currentScope, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params":{
				"exclude": [ "groups", "regions"]
			}
		};

		$timeout(() => {
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
				overlayLoading.hide();
				result.forEach((oneResult) => {
					oneResult.open = (oneResult.deployments.length > 0 || (oneResult.templates && oneResult.templates.length > 0));
				});
				return cb(error, result);
			});
		}, 500);
	}

	function injectFormInputs(id, value, form, data) {
		//reset form inputs to 4
		form.entries.length = 5;

		//check location value and inject accordingly new entries

		let additionalInputs = [
			{
				"type": "tabset",
				"tabs": [
					{
						"label": "Content",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							}
						]
					},
					{
						"label": "Inputs & Display Options",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								// 'label': 'Inputs',
								'name': 'inputs',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.inputs : "",
								'fieldMsg': "<div class='fieldMsg'>Provide the exposed template inputs using the SOAJS Form Library syntax. To learn more about the SOAJS Form Library <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/63862512/UI+Form'>click here</a></div>",
								'required': false
							}
						]
					},
					{
						"label": "Input Display Options",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								// 'label': 'Inputs Display Options',
								'name': 'display',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.display : "",
								'fieldMsg': "<div class='fieldMsg'>Provide the exposed inputs display using the SOAJS Grid Library syntax. To learn more about the SOAJS Grid Library <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/63861622/UI+Listing+Grid'>click here</a></div>",
								'required': false
							}
						]
					},
					{
						"label": "Input Validation Rules",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								// 'label': 'Inputs Display Options',
								'name': 'imfv',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.imfv : "",
								'fieldMsg': "<div class='fieldMsg'>Provide the <a href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/61353979/IMFV' target='_blank'>IMFV</a> validation schema that SOAJS should use during deployment to ensure that the entries provided match the schema of your template inputs.</div>",
								'required': false
							}
						]
					}
				]
			}
		];

		if (value === 'local') {
			additionalInputs[0].tabs[0].entries.push(
				{
					'name': 'textMode',
					'label': 'I am adding a text value',
					'fieldMsg': "Turn on this mode if the value you are about to enter is made up of text only (Default mode does not support text only)",
					'type': 'buttonSlider',
					'value': false,
					'required': true,
					'onAction': function (id, value, form) {
						if (value) {
							//text
							form.entries[5].tabs[0].entries[2].type = 'textarea';
							form.entries[5].tabs[0].entries[2].rows = 30;
							delete form.entries[5].tabs[0].entries[2].editor;
						}
						else {
							//json
							form.entries[5].tabs[0].entries[2].type = 'jsoneditor';
						}
					}
				},
				{
					'name': 'content',
					'type': 'jsoneditor',
					'height': '400px',
					'value': (data) ? data.content : "",
					'tooltip': 'Enter the content of your Template',
					'fieldMsg': "<div class='fieldMsg'>Enter your infra as code template content as a JSON object. To learn more about infra code templates <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>click here</a></div>",
					'required': true
				}
			);
		}
		else if (value === 'external') {
			additionalInputs[0].tabs[0].entries.push({
				'name': 'file',
				'type': 'document',
				'fieldMsg': "<div class='fieldMsg'>Upload your infra as code template. To learn more about infra code templates <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>click here</a></div>"
			});
		}

		form.entries = form.entries.concat(additionalInputs);

	}

	function addTemplate(currentScope, oneInfra) {
		currentScope.showTemplateForm = true;
		let entries = angular.copy(infraConfig.form.templates);

		//inject select infra type
		if (oneInfra.templatesTypes.indexOf("local") !== -1) {
			entries[2].value.push({ 'v': 'local', 'l': "SOAJS Console" });
		}

		if (oneInfra.templatesTypes.indexOf("external") !== -1) {
			entries[2].value.push({ 'v': 'external', 'l': "Cloud Provider" });
		}

		oneInfra.drivers.forEach(oneDriver => {
			entries[3].value.push({ 'v': oneDriver, 'l': oneDriver });
		});
		
		oneInfra.technologies.forEach(oneTech => {
			entries[4].value.push({ 'v': oneTech, 'l': oneTech });
		});

		entries[2].onAction = function (id, value, form) {
			injectFormInputs(id, value, form);
		};

		let options = {
			timeout: $timeout,
			entries: entries,
			name: 'addTemplate',
			label: 'Add Infra Code Template',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						if (oneInfra.templatesTypes.indexOf("local") !== -1) {
							let options = {
								"method": "post",
								"routeName": "/dashboard/infra/template",
								"params": {
									"id": oneInfra._id
								},
								"data": {
									"template": formData
								}
							};
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error);
								}
								else {
									currentScope.displayAlert("success", "Template created successfully.");
									currentScope.showTemplateForm = false;
									currentScope.getProviders();
								}
							});
						}
						else if (oneInfra.templatesTypes.indexOf("external") !== -1) {
							//need to upload in this case
							let keys = Object.keys(formData);
							let foundFile = false;
							for (let j = 0; j < keys.length; j++) {
								if (keys[j].indexOf('file') !== -1) {
									foundFile = true;
									break;
								}
							}
							if (!foundFile) {
								$window.alert("Please provide a template to proceed!");
							}
							else if (Object.keys(formData).length < 6) {
								$window.alert("Please fill out all the fields to proceed!");
							}
							else {
								let soajsauthCookie = $cookies.get('soajs_auth', { 'domain': interfaceDomain });
								let dashKeyCookie = $cookies.get('soajs_dashboard_key', { 'domain': interfaceDomain });
								let access_token = $cookies.get('access_token', { 'domain': interfaceDomain });

								let progress = { value: 0 };
								let options = {
									url: apiConfiguration.domain + "/dashboard/infra/template/upload",
									params: {
										id: oneInfra._id,
										name: formData.name,
										access_token: access_token,
										description: formData.description,
										tags: {
											"type": "template",
											"driver": formData.driver,
											"technology": formData.technology
										}
									},
									file: formData.file_0,
									headers: {
										'soajsauth': soajsauthCookie,
										'key': dashKeyCookie
									}
								};

								overlayLoading.show();
								Upload.upload(options).progress(function (evt) {
									let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
									progress.value = progressPercentage;
								}).success(function (response, status, headers, config) {
									if (response.result === false && response.errors.details.length > 0) {
										overlayLoading.hide();
										currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
									}
									else if (formData.inputs.length > 0 || typeof(formData.display) === 'object') {
										let compOptions = {
											"method": "post",
											"routeName": "/dashboard/infra/template/upload",
											"params": {
												"id": oneInfra._id
											},
											"data": {
												"name": formData.name,
												"inputs": formData.inputs,
												"display": formData.display,
												"imfv": formData.imfv
											}
										};
										getSendDataFromServer(currentScope, ngDataApi, compOptions, function (error, data) {
											if (error) {
												overlayLoading.hide();
												currentScope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
											}
											else {
												overlayLoading.hide();
												currentScope.displayAlert('success', "Template Uploaded Successfully.");
												currentScope.showTemplateForm = false;
												currentScope.getProviders();
											}
										});
									}
									else {
										overlayLoading.hide();
										currentScope.displayAlert('success', "Template Uploaded Successfully.");
										currentScope.showTemplateForm = false;
										currentScope.getProviders();
									}
								}).error(function () {
									overlayLoading.hide();
									currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
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
						delete currentScope.form.formData;
						currentScope.showTemplateForm = false;
					}
				}
			]
		};

		buildForm(currentScope, $modal, options, () => {
			if (entries[2].value.length === 1) {
				entries[2].value[0].selected = true;
				currentScope.form.formData.location = entries[2].value[0].v;
				$timeout(() => {
					injectFormInputs('location', currentScope.form.formData.location, currentScope.form);
				}, 100);
			}
			if (entries[3].value.length === 1) {
				entries[3].value[0].selected = true;
				currentScope.form.formData.driver = entries[3].value[0].v;
			}
			
			if (entries[4].value.length === 1) {
				entries[4].value[0].selected = true;
				currentScope.form.formData.technology = entries[4].value[0].v;
			}
		});
	}

	function grabEditorContent(location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor) {
		let inputs = inputsEditor.ngModel;
		if (typeof(inputs) === 'string') {
			try {
				formData.inputs = JSON.parse(inputs);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates inputs field.");
				return false;
			}
		}

		let display = displayEditor.ngModel;
		if (typeof(display) === 'string') {
			try {
				formData.display = JSON.parse(display);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates inputs display field.");
				return false;
			}
		}
		
		let imfv = imfvEditor.ngModel;
		if (typeof(imfv) === 'string') {
			try {
				formData.imfv = JSON.parse(imfv);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates inputs validation rules.");
				return false;
			}
		}

		if (location === 'local') {
			let content = contentEditor.ngModel;
			if (typeof(content) === 'string') {
				try {
					if(!formData.textMode){
						formData.content = JSON.parse(content);
					}
				}
				catch (e) {
					$window.alert("Please enter a valid JSON schema inside the templates field.");
					return false;
				}
			}
		}

		return true;
	}

	function editTemplate(currentScope, oneInfra, oneTemplate) {
		let contentEditor, inputsEditor, displayEditor, imfvEditor;
		let entries = angular.copy(infraConfig.form.templates);
		entries[0].readonly = true;
		entries[0].disabled = true;
		
		let options;
		currentScope.showTemplateForm = true;
		
		oneInfra.drivers.forEach(oneDriver => {
			entries[3].value.push({ 'v': oneDriver, 'l': oneDriver });
		});
		
		oneInfra.technologies.forEach(oneTech => {
			entries[4].value.push({ 'v': oneTech, 'l': oneTech });
		});
		
		if (oneTemplate.location === 'local') {
			entries[2].value.push({ 'v': 'local', 'l': "SOAJS Console", 'selected': true });

			let formData = angular.copy(oneTemplate);
			delete formData.tags;
			options = {
				timeout: $timeout,
				entries: entries,
				data: formData,
				name: 'editTemplate',
				label: 'Modify Infra Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor);
							if (!status) {
								return false;
							}

							let options = {
								"method": "put",
								"routeName": "/dashboard/infra/template",
								"params": {
									"id": oneTemplate._id
								},
								"data": {
									"template": formData
								}
							};
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error);
								}
								else {
									currentScope.displayAlert("success", "Template modified successfully.");
									currentScope.showTemplateForm = false;
									currentScope.getProviders();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete currentScope.form.formData;
							currentScope.showTemplateForm = false;
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options, oneTemplate);
		}
		else {
			entries[2].value.push({ 'v': 'external', 'l': "Cloud Provider", 'selected': true });
			
			let formData = angular.copy(oneTemplate);
			delete formData.tags;
			options = {
				timeout: $timeout,
				entries: entries,
				data: formData,
				name: 'editTemplate',
				label: 'Modify Infra Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							console.log(formData);
							return false;
							
							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor);
							if (!status) {
								return false;
							}

							if (formData.file_0) {
								uploadNewTemplateFile(formData);
							}
							else {
								updateTemplateCompletemntaryInfo(formData);
							}
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete currentScope.form.formData;
							currentScope.showTemplateForm = false;
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options, oneTemplate);
		}
		
		buildForm(currentScope, $modal, options, () => {
			inputsEditor = currentScope.form.entries[5].tabs[1].entries[0];
			displayEditor = currentScope.form.entries[5].tabs[1].entries[1];
			if (oneTemplate.location === 'local') {
				contentEditor = currentScope.form.entries[5].tabs[0].entries[1];
			}
			
			if(oneTemplate.textMode){
				//text
				currentScope.form.entries[5].tabs[0].entries[2].type = 'textarea';
				currentScope.form.entries[5].tabs[0].entries[2].rows = 30;
				delete currentScope.form.entries[5].tabs[0].entries[2].editor;
			}
		});

		function uploadNewTemplateFile(formData) {
			let soajsauthCookie = $cookies.get('soajs_auth', { 'domain': interfaceDomain });
			let dashKeyCookie = $cookies.get('soajs_dashboard_key', { 'domain': interfaceDomain });
			let access_token = $cookies.get('access_token', { 'domain': interfaceDomain });

			let progress = { value: 0 };
			let options = {
				url: apiConfiguration.domain + "/dashboard/infra/template/upload",
				params: {
					id: oneInfra._id,
					name: oneTemplate.name,
					description: formData.description,
					access_token: access_token,
					tags: {
						"type": "template",
						"driver": formData.driver,
						"technology": formData.technology
					}
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
					currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
				}
				else {
					updateTemplateCompletemntaryInfo(formData);
				}
			}).error(function () {
				overlayLoading.hide();
				currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
			});
		}

		function updateTemplateCompletemntaryInfo(formData) {
			if (formData.inputs.length > 0 || typeof(formData.display) === 'object') {
				let compOptions = {
					"method": "post",
					"routeName": "/dashboard/infra/template/upload",
					"params": {
						"id": oneInfra._id
					},
					"data": {
						"name": oneTemplate.name,
						"inputs": formData.inputs,
						"display": formData.display,
						"imfv": formData.imfv
					}
				};
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, compOptions, function (error, data) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
					}
					else {
						currentScope.displayAlert('success', "Template Uploaded Successfully.");
						currentScope.showTemplateForm = false;
						currentScope.getProviders();
					}
				});
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', "Template Uploaded Successfully.");
				currentScope.showTemplateForm = false;
				currentScope.getProviders();
			}
		}
	}

	return {
		'getInfra': getInfra,
		'addTemplate': addTemplate,
		'editTemplate': editTemplate
	};
}]);
