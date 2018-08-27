"use strict";
var templateService = soajsApp.components;
templateService.service('templateSrv', ['Upload', 'ngDataApi', '$timeout', '$cookies', '$window', function (Upload, ngDataApi, $timeout, $cookies, $window) {
	//remove
	function listTemplates(currentScope) {
		
		// if coming back from add import template, clear file input
		if(currentScope && currentScope.form && currentScope.form.formData){
			currentScope.form.formData = {};
		}
		if(document.getElementById('myTemplate_0')){
			document.getElementById('myTemplate_0').value = "";
		}
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates',
			'params': {
				'fullList': true,
			},
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (response) {
					currentScope.templates = angular.copy(response);
					currentScope.oldStyle = false;
					currentScope.templates.forEach(function (oneTemplate) {
						if (oneTemplate.type === '_BLANK') {
							currentScope.oldStyle = true;
						}
						else if(Object.keys(oneTemplate.content).length === 0){
							delete oneTemplate.content;
						}
					});
				}
				else {
					currentScope.displayAlert('danger', 'No templates found!');
				}
			}
		});
	}
    //remove
	function upgradeTemplates(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates/upgrade'
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', 'Templates Upgraded');
				currentScope.listTemplates();
			}
		});
	}
    //remove
	function deleteTmpl(currentScope, oneTemplate) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'delete',
			'routeName': '/dashboard/templates',
			'params': {
				'id': oneTemplate._id,
			},
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', "Template Deleted Successfully");
				currentScope.listTemplates();
			}
		});
	}

	function uploadTemplate(currentScope, input, cb) {
		//to avoid incompatibiltiy issues when using safari browsers
		if (!input) {
			return false;
		}
		
		let soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
		let dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
		let access_token = $cookies.get('access_token', {'domain': interfaceDomain});
		
		let progress = {value: 0};
		
		let options = {
			url: apiConfiguration.domain + "/dashboard/templates/import",
			params: {
				filename: input.name,
				access_token: access_token
			},
			file: input,
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
			overlayLoading.hide();
			if (!response.result) {
				response.errors.details.forEach((oneError) => {
					currentScope.$parent.displayAlert('danger', oneError.code + " => " + oneError.message);
				});
				
				currentScope.form.formData = {};
				document.getElementById('myTemplate_0').value = ""; // clear file input
			}
			else {
				if (response.data && Array.isArray(response.data) && response.data[0].code && response.data[0].msg) {
					//template contains errors that needs fixing
					fixTemplateProblems(currentScope, response.data, cb);
				}
				else {
                    if(document.getElementById('myTemplate_0')){
                        document.getElementById('myTemplate_0').value = "";
                    }
					return cb();
				}
			}
		}).error(function () {
			overlayLoading.hide();
			currentScope.$parent.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
		});
	}

	function fixTemplateProblems(currentScope, issues, cb) {
		delete currentScope.form;
		currentScope.alerts = null;
		currentScope.step = 2;
		
		let unrecoverable = [];
		issues.forEach((oneIssue) => {
			if (oneIssue.msg.indexOf("=>") === -1 || (oneIssue.msg.indexOf("id ") === -1 && !oneIssue.entry)) {
				unrecoverable.push(oneIssue);
			}
		});
		
		if (unrecoverable.length > 0) {
			if(!currentScope.alerts) {
				currentScope.alerts = {};
			}
			unrecoverable.forEach((oneError) => {
				if(!currentScope.alerts[oneError.group]){
					currentScope.alerts[oneError.group] = [];
				}
				currentScope.alerts[oneError.group].push(oneError);
			});
			currentScope.importForm();
		}
		else {
			let templateId = issues[0].msg.split("=>")[1].trim();
			issues.shift();
			
			let data = {};
			let formEntries = [
				{
					"type": "accordion",
					"name": "ci",
					"label": "Continuous Integration Recipes",
					"entries": []
				},
				{
					"type": "accordion",
					"name": "catalogs",
					"label": "Catalog Deployment Recipes",
					"entries": []
				},
				{
					"type": "accordion",
					"name": "endpoints",
					"label": "Endpoints",
					"entries": []
				},
				{
					"type": "accordion",
					"name": "daemon",
					"label": "Daemon Groups",
					"entries": []
				},
				{
                    "type": "accordion",
                    "name": "iac",
                    "label": "Infra As Code Template",
                    "entries": []
                },
			];
			
			for (let count = 0; count < issues.length; count++) {
				let oneIssue = issues[count];
				switch (oneIssue.entry.type) {
					case 'ci':
						formEntries[0].entries.push({
							"type": "text",
							"name": oneIssue.entry.type + "_" + count,
							"label": oneIssue.entry.name,
							"value": oneIssue.entry.name,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "ci") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						
						data [oneIssue.entry.type + "_" + count] = oneIssue.entry.name;
						break;
					case 'catalogs':
						formEntries[1].entries.push({
							"type": "text",
							"name": oneIssue.entry.type + "_" + count,
							"label": oneIssue.entry.name,
							"value": oneIssue.entry.name,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "catalogs") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						
						data [oneIssue.entry.type + "_" + count] = oneIssue.entry.name;
						break;
					case 'endpoints':
						if(oneIssue.entry.conflict === 'name'){
							formEntries[2].entries.push({
								"type": "text",
								"name": oneIssue.entry.type + "_name_" + count,
								"label": oneIssue.entry.name,
								"value": oneIssue.entry.name,
								"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
								"tooltip": "Change the value of this entry to update your imported template",
								"onAction": function (id, value, form) {
									let fieldMsg;
									if (value !== oneIssue.entry.name) {
										fieldMsg = "<span class='green'>Fixed!</span>";
									}
									else {
										fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
									}
									
									form.entries.forEach((oneGroup) => {
										if (oneGroup.name === "endpoints") {
											oneGroup.entries.forEach((oneInput) => {
												if (oneInput.name === oneIssue.entry.type + "_name_" + count) {
													oneInput.fieldMsg = fieldMsg;
												}
											});
										}
									});
								}
							});
							data [oneIssue.entry.type + "_name_" + count] = oneIssue.entry.name;
						}
						if(oneIssue.entry.conflict === 'port'){
							let epName = oneIssue.entry.name.toLowerCase().replace(/\s/g,"-");
							formEntries[2].entries.push({
								"type": "number",
								"name": epName + "_port_" + count,
								"label": oneIssue.entry.name,
								"value": oneIssue.entry.port,
								"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
								"tooltip": "Change the value of this entry to update your imported template",
								"onAction": function (id, value, form) {
									let fieldMsg;
									if (value !== oneIssue.entry.name) {
										fieldMsg = "<span class='green'>Fixed!</span>";
									}
									else {
										fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
									}
									
									form.entries.forEach((oneGroup) => {
										if (oneGroup.name === "endpoints") {
											oneGroup.entries.forEach((oneInput) => {
												if (oneInput.name === epName + "_port_" + count) {
													oneInput.fieldMsg = fieldMsg;
												}
											});
										}
									});
								}
							});
							data [epName + "_port_" + count] = oneIssue.entry.port;
						}
						// add case for daem
						break;
                    case 'daemon':
                        formEntries[3].entries.push({
                            "type": "text",
                            "name": oneIssue.entry.type + "_" + count,
                            "label": oneIssue.entry.name,
                            "value": oneIssue.entry.name,
                            "fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
                            "tooltip": "Change the value of this entry to update your imported template",
                            "onAction": function (id, value, form) {
                                let fieldMsg;
                                if (value !== oneIssue.entry.name) {
                                    fieldMsg = "<span class='green'>Fixed!</span>";
                                }
                                else {
                                    fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
                                }

                                form.entries.forEach((oneGroup) => {
                                    if (oneGroup.name === "daemon") {
                                        oneGroup.entries.forEach((oneInput) => {
                                            if (oneInput.name === oneIssue.entry.type + "_" + count) {
                                                oneInput.fieldMsg = fieldMsg;
                                            }
                                        });
                                    }
                                });
                            }
                        });

                        data [oneIssue.entry.type + "_" + count] = oneIssue.entry.name;
                        break;
					case 'iac':
                        if(oneIssue.entry.conflict === 'name'){
                            formEntries[4].entries.push({
                                "type": "text",
                                "name": oneIssue.entry.type + "_name_" + count,
                                "label": oneIssue.entry.name,
                                "value": oneIssue.entry.name,
                                "fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
                                "tooltip": "Change the value of this entry to update your imported template",
                                "onAction": function (id, value, form) {
                                    let fieldMsg;
                                    if (value !== oneIssue.entry.name) {
                                        fieldMsg = "<span class='green'>Fixed!</span>";
                                    }
                                    else {
                                        fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
                                    }

                                    form.entries.forEach((oneGroup) => {
                                        if (oneGroup.name === "iac") {
                                            oneGroup.entries.forEach((oneInput) => {
                                                if (oneInput.name === oneIssue.entry.type + "_name_" + count) {
                                                    oneInput.fieldMsg = fieldMsg;
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            data [oneIssue.entry.type + "_name_" + count] = oneIssue.entry.name;
                        }
                        if(oneIssue.entry.conflict === 'provider'){
                            let Name = oneIssue.entry.name.toLowerCase().replace(/\s/g,"-");
                            formEntries[4].entries.push({
                                "type": "text",
                                "name": oneIssue.entry.type + "_provider_" + count,
                                "label": oneIssue.entry.provider,
                                "value": oneIssue.entry.provider,
                                "fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
                                "tooltip": "Change the value of this entry to update your imported template",
                                "onAction": function (id, value, form) {
                                    let fieldMsg;
                                    if (value !== oneIssue.entry.provider) {
                                        fieldMsg = "<span class='green'>Fixed!</span>";
                                    }
                                    else {
                                        fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
                                    }
                                    form.entries.forEach((oneGroup) => {
                                        if (oneGroup.name === "iac") {
                                            oneGroup.entries.forEach((oneInput) => {
                                                if (oneInput.name === oneIssue.entry.type + "_provider_" + count) {
                                                    oneInput.fieldMsg = fieldMsg;
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            data [oneIssue.entry.type + "_provider_" + count] = oneIssue.entry.provider;
                        }
                        break;
				}
			}

			for (let i = formEntries.length - 1; i >= 0; i--) {
				if (formEntries[i].entries.length === 0) {
					formEntries.splice(i, 1);
				}
			}

			let options = {
				timeout: $timeout,
				entries: formEntries,
				data: data,
				name: 'fixTemplateErrors',
				actions: [
					{
						type: 'submit',
						label: 'Submit Fixes',
						btn: 'primary',
						action: function (formData) {
							let inputs = {};
							for (let count = 0; count < issues.length; count++) {
								let oneIssue = issues[count];

								switch (oneIssue.entry.type) {
									case 'ci':
										if (oneIssue.entry.name.trim() === formData['ci_' + count].trim()) {
											$window.alert(`Change the name of CI Recipe ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										if (!inputs.ci) {
											inputs.ci = [];
										}
										inputs.ci.push({
											old: oneIssue.entry.name,
											provider: oneIssue.entry.provider,
											new: formData['ci_' + count]
										});
										break;
									case 'catalogs':
										if (oneIssue.entry.name.trim() === formData['catalogs_' + count].trim()) {
											$window.alert(`Change the name of Catalog Recipe ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										if (!inputs.catalogs) {
											inputs.catalogs = [];
										}
										inputs.catalogs.push({
											old: oneIssue.entry.name,
											new: formData['catalogs_' + count]
										});
										break;
									case 'endpoints':
										if (oneIssue.entry.conflict === 'name' && oneIssue.entry.name.trim() === formData['endpoints_name_' + count].trim()) {
											$window.alert(`Change the name of Endpoint ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										
										if(oneIssue.entry.conflict === 'port' && oneIssue.entry.port === formData['endpoints_port_' + count]){
											$window.alert(`Change the port value of Endpoint ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										
										if (!inputs.endpoints) {
											inputs.endpoints = [];
										}
										
										let alreadyProcessed = false;
										inputs.endpoints.forEach((oneEndpoint) => {
											if(oneEndpoint.old === oneIssue.entry.name){
												if(oneIssue.entry.conflict === 'name'){
													oneEndpoint.new = formData['endpoints_name_' + count];
												}
												else if(oneIssue.entry.conflict === 'port'){
													let epName = oneEndpoint.old.toLowerCase().replace(/\s/g,"-");
													for(let oneV in formData){
														if(oneV.indexOf(epName + '_port_') !== -1){
															oneEndpoint.port = formData[oneV];
														}
													}
												}
												alreadyProcessed = true;
											}
										});
										
										if(!alreadyProcessed){
											inputs.endpoints.push({
												old: oneIssue.entry.name,
												new: formData['endpoints_name_' + count],
												port: formData['endpoints_port_' + count]
											});
										}

										break;
                                    case 'daemon':
                                        if (oneIssue.entry.name.trim() === formData['daemon_' + count].trim()) {
                                            $window.alert(`Change the name of Daemon Groups ${oneIssue.entry.name} to proceed.`);
                                            return false;
                                        }
                                        if (!inputs.daemon) {
                                            inputs.daemon = [];
                                        }
                                        inputs.daemon.push({
                                            old: oneIssue.entry.name,
                                            new: formData['daemon_' + count]
                                        });
                                        break;
									case 'iac':
                                        if (oneIssue.entry.conflict === 'name' && oneIssue.entry.name.trim() === formData['iac_name_' + count].trim()) {
                                            $window.alert(`Change the name of Endpoint ${oneIssue.entry.name} to proceed.`);
                                            return false;
                                        }
                                        if(oneIssue.entry.conflict === 'provider' && oneIssue.entry.provider === formData['iac_provider_' + count]){
                                            $window.alert(`Change the provider value of ${oneIssue.entry.name} to proceed.`);
                                            return false;
                                        }

                                        if (!inputs.iac) {
                                            inputs.iac = [];
                                        }

                                        let already = false;
                                        inputs.iac.forEach((oneIac) => {
                                            if(oneIac.old === oneIssue.entry.name){
                                                if(oneIssue.entry.conflict === 'name'){
                                                    oneIac.new = formData['iac_name_' + count];
                                                }
                                                else if(oneIssue.entry.conflict === 'provider'){
                                                    let epName = oneIac.old.toLowerCase().replace(/\s/g,"-");
                                                    for(let oneV in formData){
                                                        if(oneV.indexOf(epName + '_provider_') !== -1){
                                                            oneIac.provider = formData[oneV];
                                                        }
                                                    }
                                                }
                                                already = true;
                                            }
                                        });

                                        if(!already){
                                            inputs.iac.push({
                                                old: oneIssue.entry.name,
                                                new: formData['iac_name_' + count],
                                                provider: formData['iac_provider_' + count]
                                            });
                                        }

                                        break;
                                }
                            }
							
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, {
								'method': 'post',
								'routeName': '/dashboard/templates/import',
								"data": {
									"id": templateId,
									"correction": inputs
								}
							}, function (error, response) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert('danger', error.message);
								} else {
									if (response && Array.isArray(response) && response[0].code && response[0].msg) {
										//template contains errors that needs fixing
										fixTemplateProblems(currentScope, response, cb);
									}
									else {
                                        currentScope.importForm();
										return cb();
									}
								}
							});
						}
					},
					{
						type: 'reset',
						label: 'Cancel',
						btn: 'danger',
						action: function () {
							if (currentScope.form && currentScope.form.formData) {
								currentScope.form.formData = {};
							}
							currentScope.importForm();
						}
					}
				]
			};
			buildForm(currentScope, null, options, () => {

			});
		}
	}
	
	function exportTemplate(currentScope) {
		
		currentScope.collectedExportedConent = {};
		listUniqueProviders(currentScope, (ciRecipes) => {
			listRecipes(currentScope, (catalogs) => {
				listEndpoints(currentScope, (endpoints) => {
                    getInfra(currentScope, (iacTemplates) => {
                        currentScope.exportSections = [];
                        if (ciRecipes) {
                            currentScope.exportSections.push({
                                all: false,
                                section: 'ci',
                                label: "Continuous Integration Recipes",
                                data: ciRecipes
                            });
                        }

                        if (catalogs) {
                            currentScope.exportSections.push({
                                all: false,
                                section: 'catalogs',
                                label: "Catalog Deployment Recipes",
                                data: catalogs
                            });
                        }

                        if (endpoints) {
                            currentScope.exportSections.push({
                                all: false,
                                section: 'endpoints',
                                label: "Endpoints",
                                data: endpoints
                            });
                        }
                        if (iacTemplates) {
                            currentScope.exportSections.push({
                                all: false,
                                section: 'iac',
                                label: "Infra As Code Templates",
                                data: iacTemplates
                            });
                        }
                        currentScope.exportSectionCounter = 0;
					});
				});
			});
		});
	}
	
	function storeRecordsOf(currentScope) {
		currentScope.exportSections[currentScope.exportSectionCounter].data.forEach((oneRecord) => {
			let section = currentScope.exportSections[currentScope.exportSectionCounter].section;
			if (!currentScope.collectedExportedConent[section]) {
				currentScope.collectedExportedConent[section] = [];
			}
			
			if (oneRecord.selected) {
				//check unique
				if(currentScope.collectedExportedConent[section].indexOf(oneRecord.id) === -1){
					currentScope.collectedExportedConent[section].push(oneRecord.id);
				}
			}
			else{
				let index = currentScope.collectedExportedConent[section].indexOf(oneRecord.id);
				if(index >= 0 && index < currentScope.collectedExportedConent[section].length){
					currentScope.collectedExportedConent[section].splice(index, 1);
				}
			}
		});
		currentScope.nextStep();
	}
	
	function generateTemplate(currentScope) {
		for(let section in currentScope.collectedExportedConent){
			if(currentScope.collectedExportedConent[section].length === 0){
				delete currentScope.collectedExportedConent[section];
			}
		}
		
		if(Object.keys(currentScope.collectedExportedConent).length === 0){
			$window.alert("Selected at least on record from any section to generate the template.");
			return false;
		}
		let postData = angular.copy(currentScope.collectedExportedConent);
		postData.deployment = angular.copy(postData.catalogs);
		
		delete postData.catalogs;
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/templates/export',
			'data': postData,
			"headers": {
				"Accept": "application/zip"
			},
			"responseType": 'arraybuffer',
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				openSaveAsDialog("soajs_template_" + new Date().toISOString() + ".zip", response, "application/zip");
			}
		});
	}
	
	function listUniqueProviders(currentScope, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/ci/providers'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				let records;
				delete response.soajsauth;
				for (let provider in response) {
					if (!Array.isArray(records)) {
						records = [];
					}
					response[provider].forEach((oneRecipe) => {
						records.push({
							'id': oneRecipe._id,
							'info': {"provider": provider, "name": oneRecipe.name}
						});
					});
				}
				return cb(records);
			}
		});
	}
	
	function listRecipes(currentScope, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				let oldStyle = false;
				response.forEach(function (oneRecipe) {
					if (oneRecipe.type === 'soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes) {
						oldStyle = true;
					}
				});
				
				let records;
				if (!oldStyle) {
					if (response) {
						if (!Array.isArray(records)) {
							records = [];
						}
						
						response.forEach((oneCatalog) => {
							records.push({
								'id': oneCatalog._id,
								'info': {
									"name": oneCatalog.name,
									"type": oneCatalog.type,
									"category": oneCatalog.subtype
								}
							});
						});
					}
				}
				return cb(records);
			}
		});
	}
	
	function listEndpoints(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/list",
			"params": {
				"mainType": "endpoints"
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				let records;
				if (response && response.records) {
					if (!Array.isArray(records)) {
						records = [];
					}
					
					response.records.forEach((oneEndpoint) => {
						records.push({
							'id': oneEndpoint._id,
							'info': {
								"group": oneEndpoint.serviceGroup,
								"name": oneEndpoint.serviceName,
								"port": oneEndpoint.servicePort
							}
						});
					});
				}
				return cb(records);
			}
		});
	}

    function getInfra(currentScope, cb) {
        let options = {
            "method": "get",
            "routeName": "/dashboard/infra",
            "params": {
                "exclude": ["groups", "regions", "extra"]
            }
        };

        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, options, (error, response) => {
            overlayLoading.hide();
            if(error){
                currentScope.displayAlert('danger', error.message);
            } else {
            	let records;
                if (response) {
                    if (!Array.isArray(records)) {
                        records = [];
                    }
                    response.forEach((oneResponse) => {
                    	if (oneResponse.templates && Array.isArray(oneResponse.templates)) {
                            oneResponse.templates.forEach((oneTemplate) => {
                                records.push({
                                    'id': oneTemplate._id,
                                    'info': {
                                        "name": oneTemplate.name,
                                        "description": oneTemplate.description,
                                        "Provider": oneResponse.label,
                                        "driver": oneTemplate.driver,
                                        "technology": oneTemplate.technology,

                                    }
                                });
							});
						}
                    });
                }
                return cb(records);
			}

        });
    }
	
	return {
		"listTemplates": listTemplates,
		"deleteTmpl": deleteTmpl,
		"upgradeTemplates": upgradeTemplates,
		"uploadTemplate": uploadTemplate,
		"exportTemplate": exportTemplate,
		"storeRecordsOf": storeRecordsOf,
		"generateTemplate": generateTemplate
	}
}]);