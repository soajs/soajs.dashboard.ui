"use strict";
var infraSrv = soajsApp.components;
infraSrv.service('infraSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function getInfra(currentScope, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra"
		};

		$timeout(() => {
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
				overlayLoading.hide();
				result.forEach((oneResult) =>{
					oneResult.open = (oneResult.deployments.length > 0 || (oneResult.templates && oneResult.templates.length > 0));
				});
				return cb(error, result);
			});
		}, 500);
	}

	function injectFormInputs(id, value, form, data){
		//reset form inputs to 4
		form.entries.length = 4;

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
								'label': 'Inputs',
								'name': 'inputs',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.inputs : "",
								'fieldMsg': "<div class='fieldMsg'>To learn more about our form library and the correct syntax to use for creating inputs click <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>Here</a></div>",
								'required': false
							},
							{
								'label': 'Inputs Display Options',
								'name': 'display',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.display : "",
								'fieldMsg': "<div class='fieldMsg'>To learn more about our grid display library and the correct syntax to use for creating a grid to display your inputs click <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>Here</a></div>",
								'required': false
							}
						]
					},
					{
						"label": "Tags",
						"entries": [
							{
								'name': 'tags',
								'label': 'Additional Tags',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.tags : "",
								'fieldMsg': '',
								'required': false
							}
						]
					}
				]
			}
		];

		if(value === 'local'){
			additionalInputs[0].tabs[0].entries.push({
				'name': 'content',
				'type': 'jsoneditor',
				'height': '400px',
				'value': (data) ? data.content : "",
				'tooltip': 'Enter the content of your Template',
				'fieldMsg': 'Template Content is represented by a JSON configuration Object',
				'required': true
			});
		}
		else if(value === 'external'){
			additionalInputs[0].tabs[0].entries.push({
				'name': 'file',
				'type': 'document',
				'fieldMsg': 'Provide the document that contains your infra code template.'
			});
		}

		form.entries = form.entries.concat(additionalInputs);

	}

	function addTemplate(currentScope, oneInfra){
		let entries = angular.copy(infraConfig.form.templates);

		//inject select infra type
		if(oneInfra.templatesTypes.indexOf("local") !== -1){
			entries[2].value.push({'v': 'local', 'l': "Local"});
		}

		if(oneInfra.templatesTypes.indexOf("external") !== -1){
			entries[2].value.push({'v': 'external', 'l': "External"});
		}

		oneInfra.drivers.forEach(oneDriver => {
			entries[3].value.push({'v': oneDriver, 'l': oneDriver});
		});

		entries[2].onAction = function(id, value, form){
			injectFormInputs(id, value, form);
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
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error);
								}
								else {
									currentScope.displayAlert("success", "Template created successfully.");
									currentScope.modalInstance.close();
									currentScope.getProviders();
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
										access_token: access_token,
										tags: {
											"type": "template",
											"driver": formData.driver,
											"description": formData.description
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
												"display": formData.display
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
												currentScope.modalInstance.close();
												currentScope.getProviders();
											}
										});
									}
									else {
										overlayLoading.hide();
										currentScope.displayAlert('success', "Template Uploaded Successfully.");
										currentScope.modalInstance.close();
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
						currentScope.modalInstance.close();
					}
				}
			]
		};

		buildFormWithModal(currentScope, $modal, options, () => {
			if(entries[2].value.length === 1) {
				entries[2].value[0].selected = true;
				currentScope.form.formData.location = entries[2].value[0].v;
				$timeout(() => {
					injectFormInputs('location', currentScope.form.formData.location, currentScope.form);
				}, 100);
			}
			if(entries[3].value.length === 1) {
				entries[3].value[0].selected = true;
				currentScope.form.formData.driver = entries[3].value[0].v;
			}
		});
	}

	function grabEditorContent(location, formData, inputsEditor, displayEditor, contentEditor){
		let inputs = inputsEditor.ngModel;
		if(typeof(inputs) === 'string'){
			try{
				formData.inputs = JSON.parse(inputs);
			}
			catch(e){
				$window.alert("Please enter a valid JSON schema inside the templates inputs field.");
				return false;
			}
		}

		let display = displayEditor.ngModel;
		if(typeof(display) === 'string'){
			try{
				formData.display = JSON.parse(display);
			}
			catch(e){
				$window.alert("Please enter a valid JSON schema inside the templates inputs display field.");
				return false;
			}
		}

		if(location === 'local'){
			let content = contentEditor.ngModel;
			if(typeof(content) === 'string'){
				try{
					formData.content = JSON.parse(content);
				}
				catch(e){
					$window.alert("Please enter a valid JSON schema inside the templates field.");
					return false;
				}
			}
		}

		return true;
	}

	function editTemplate(currentScope, oneInfra, oneTemplate){
		let contentEditor, inputsEditor, displayEditor;
		let entries = angular.copy(infraConfig.form.templates);
		let options;
		if(oneTemplate.location === 'local'){
			entries[2].value.push({'v': 'local', 'l': "Local", 'selected': true});

			options = {
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

							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor);
							if(!status){
								return false;
							}

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
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error);
								}
								else {
									currentScope.displayAlert("success", "Template modified successfully.");
									currentScope.modalInstance.close();
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
							currentScope.modalInstance.close();
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options.form, oneTemplate);
		}
		else {
			entries[2].value.push({'v': 'external', 'l': "external", 'selected': true});

			options = {
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

							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor);
							if(!status){
								return false;
							}

							if(formData.file_0){
								uploadNewTemplateFile(formData);
							}
							else{
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
							currentScope.modalInstance.close();
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options.form, oneTemplate);
		}

		buildFormWithModal(currentScope, $modal, options, () => {
			inputsEditor = currentScope.form.entries[4].tabs[1].entries[0];
			displayEditor = currentScope.form.entries[4].tabs[1].entries[1];
			if(oneTemplate.location === 'local'){
				contentEditor = currentScope.form.entries[4].tabs[0].entries[1];
			}
		});

		function uploadNewTemplateFile(formData){
			let soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
			let dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
			let access_token = $cookies.get('access_token', {'domain': interfaceDomain});

			let progress = {value: 0};
			let options = {
				url: apiConfiguration.domain + "/dashboard/infra/template/upload",
				params: {
					id: oneInfra._id,
					name: formData.name,
					access_token: access_token,
					tags: {
						"type": "template",
						"driver": formData.driver,
						"description": formData.description
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

		function updateTemplateCompletemntaryInfo(formData){
			if (formData.inputs.length > 0 || typeof(formData.display) === 'object') {
				let compOptions = {
					"method": "post",
					"routeName": "/dashboard/infra/template/upload",
					"params": {
						"id": oneInfra._id
					},
					"data": {
						"name": formData.name,
						"inputs": formData.inputs,
						"display": formData.display
					}
				};
				getSendDataFromServer(currentScope, ngDataApi, compOptions, function (error, data) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
					}
					else {
						currentScope.displayAlert('success', "Template Uploaded Successfully.");
						currentScope.modalInstance.close();
						currentScope.getProviders();
					}
				});
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', "Template Uploaded Successfully.");
				currentScope.modalInstance.close();
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
