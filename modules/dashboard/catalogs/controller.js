'use strict';
let catalogApp = soajsApp.components;

catalogApp.controller('catalogAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$cookies', '$location', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $cookies, $location) {
	$scope.$parent.isUserLoggedIn();
	$scope.showSOAJSStoreLink = $scope.$parent.$parent.showSOAJSStoreLink;
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, catalogAppConfig.permissions);
	
	$scope.catalogImage = './themes/' + themeToUse + '/img/catalog.png';
	
	function setEditorContent(id, value, height, currentScope) {
		$timeout(function () {
			try {
				let editor = ace.edit(id);
				renderJSONEditor(editor, id, value, height, currentScope);
			} catch (e) {
			
			}
		}, 1000);
	}
	
	function renderJSONEditor(_editor, id, value, height, currentScope) {
		if (value && value !== '') {
			currentScope.form.formData[id] = value;
			_editor.setValue(JSON.stringify(value, null, 2));
		} else {
			currentScope.form.formData[id] = value;
			_editor.setValue('');
		}
		
		_editor.on('change', function () {
			let editor = ace.edit(id);
			let v = editor.getValue();
			if (v && v !== '') {
				try {
					currentScope.form.formData[id] = JSON.parse(v);
				} catch (err) {
				
				}
			}
		});
		
		_editor.setShowPrintMargin(false);
		_editor.scrollToLine(0, true, true);
		_editor.clearSelection();
		let heightUpdateFunction = function () {
			let newHeight =
				_editor.getSession().getScreenLength()
				* _editor.renderer.lineHeight
				+ _editor.renderer.scrollBar.getWidth() + 10;
			
			if (height) {
				newHeight = parseInt(height);
			}
			
			_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
			_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
			jQuery('#' + id).height(newHeight.toString());
			_editor.resize(true);
		};
		
		$timeout(function () {
			_editor.heightUpdate = heightUpdateFunction();
			// Set initial size to match initial content
			heightUpdateFunction();
			
			// Whenever a change happens inside the ACE editor, update
			// the size again
			_editor.getSession().on('change', heightUpdateFunction);
			_editor.setOption("highlightActiveLine", false);
		}, 1000);
	}
	
	function reRenderEnvVar(id, value, form) {
		let counter = parseInt(id.replace('envVarType', ''));
		let tmp;
		switch (value) {
			case 'computed':
				tmp = angular.copy(catalogAppConfig.form.computedVar);
				break;
			case 'static':
				tmp = angular.copy(catalogAppConfig.form.staticVar);
				break;
			case 'secret':
				tmp = angular.copy(catalogAppConfig.form.secretVar);
				tmp.entries.forEach(function (oneEntry) {
					oneEntry.name += counter;
				});
				break;
			case 'userInput':
				tmp = angular.copy(catalogAppConfig.form.userInputVar);
				tmp.entries.forEach(function (oneEntry) {
					oneEntry.name += counter;
				});
				break;
		}
		
		tmp.name += counter;
		form.formData['envVarType' + counter] = value;
		form.entries[7].tabs[1].entries.forEach(function (oneEnvVarGroup) {
			if (oneEnvVarGroup.type === 'group' && oneEnvVarGroup.name === 'envVarGroup' + counter) {
				if (oneEnvVarGroup.entries.length >= 5) {
					oneEnvVarGroup.entries.splice(3, 1);
				}
				
				oneEnvVarGroup.entries.splice(3, 0, tmp);
			}
		});
	}
	
	$scope.upgradeAll = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/upgrade'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', "Catalog Recipes have been upgraded to the latest version.");
				$scope.listRecipes();
			}
		});
	};
	
	$scope.listRecipes = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list',
			'params': {
				'soajs': false
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.originalRecipes = $scope.recipes = response;
				
				$scope.oldStyle = false;
				$scope.originalRecipes.forEach(function (oneRecipe) {
					if (oneRecipe.type === 'soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming && oneRecipe.recipe.deployOptions.voluming.volumes) {
						$scope.oldStyle = true;
					}
				});
				
				if (!$scope.oldStyle) {
					$scope.recipeTypes = {};
					
					$scope.originalRecipes.forEach(function (oneRecipe) {
						if (!oneRecipe.v) {
							oneRecipe.v = 1;
						}
						
						if (!$scope.recipeTypes[oneRecipe.type]) {
							$scope.recipeTypes[oneRecipe.type] = {};
						}
						
						if (!$scope.recipeTypes[oneRecipe.type][oneRecipe.subtype]) {
							$scope.recipeTypes[oneRecipe.type][oneRecipe.subtype] = [];
						}
					});
					
					$scope.recipes.forEach(function (oneRecipe) {
						if ($scope.recipeTypes[oneRecipe.type] && $scope.recipeTypes[oneRecipe.type][oneRecipe.subtype]) {
							$scope.recipeTypes[oneRecipe.type][oneRecipe.subtype].push(oneRecipe);
						}
					});
				}
				$scope.listArchives();
			}
		});
	};
	
	$scope.listArchives = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list',
			'params': {
				'version': true,
				'soajs': false
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.originalArchives = $scope.archives = response;
				
				if ($scope.oldStyle === false) {
					$scope.originalArchives.forEach(function (oneRecipe) {
						if (oneRecipe.type === 'soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes) {
							$scope.oldStyle = true;
						}
					});
				}
				
				if (!$scope.oldStyle) {
					$scope.recipeTypesArchives = {};
					
					$scope.originalArchives.forEach(function (oneRecipe) {
						
						if (!$scope.recipeTypesArchives[oneRecipe.type]) {
							$scope.recipeTypesArchives[oneRecipe.type] = {};
						}
						
						if (!$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype]) {
							$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype] = [];
						}
					});
					
					$scope.archives.forEach(function (oneRecipe) {
						if ($scope.recipeTypesArchives[oneRecipe.type] && $scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype]) {
							$scope.recipeTypesArchives[oneRecipe.type][oneRecipe.subtype].push(oneRecipe);
						}
					});
				}
			}
		});
	};
	
	function proceedWithForm(currentScope, mainFormConfig, data, submitAction) {
		let envCounter = 0, volumeCounter = 0, portCounter = 0, labelCounter = 0, execCounter = 0;
		
		if (data.type !== 'server' && mainFormConfig[5].tabs[1].entries[2]) {
			mainFormConfig[5].tabs[1].entries.pop();
		}
		
		if (data.type === 'server' && mainFormConfig[5].tabs[1].entries[2]) {
			mainFormConfig[5].tabs[1].entries.pop();
		}
		
		if (mainFormConfig[5].tabs[1].entries.length > 1) {
			mainFormConfig[5].tabs[1].entries = [];
		}
		
		
		mainFormConfig[5].tabs[1].entries.push({
			'name': 'configButton',
			'label': 'Attach Config Repository',
			'type': 'buttonSlider',
			onAction(id, data, form) {
				if (form.formData.configButton === true) {
					form.entries[5].tabs[1].entries[1] = {
						'name': 'config',
						"type": "group",
						'description': {
							'type': "default",
							'content': "<div class='fieldMsg'>You can attach a config catalog" +
								" recipes by filling the inputs below.<br />" +
								" Only activated branches of tis config <b>Config</b> catalog are available for this section.</div>"
						},
						"label": "Config Repository",
						"entries": [
							{
								'name': 'Label',
								'label': 'Label',
								'type': 'text',
								'value': [],
								'required': true,
								'tooltip': 'Enter a Label to use in deployment forms',
								'fieldMsg': 'Enter a Label to use in deployment forms'
							},
							{
								'name': 'catalog',
								'label': 'Catalog',
								'type': 'select',
								'value': $scope.configRepo,
								'required': false,
								'tooltip': 'Specify which config catalog to use',
								'fieldMsg': 'Specify which config catalog to use',
								onAction(id, value, form) {
									if (form.formData.catalog !== 'user specify') {
										if (form.entries[5].tabs[1].entries[1].entries.length === 5) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										if (form.entries[5].tabs[1].entries[1].entries.length === 4) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										$scope.configRepo.forEach((oneConfig) => {
											if (oneConfig.catalog && oneConfig.catalog.name === value) {
												$scope.selectedConfigRepo = oneConfig.catalog;
											}
										});
										let data = angular.copy($scope.selectedConfigRepo);
										
										if (data && data.versions && data.versions.length > 0) {
											let versions = [];
											data.versions.forEach((v) => {
												versions.push({
													'v': v.version,
													'l': v.version
												});
											});
											if (form.entries[5].tabs[1].entries[1].entries.length === 2) {
												form.entries[5].tabs[1].entries[1].entries.push({
														'name': 'version',
														'label': 'Version',
														'type': 'select',
														'value': versions,
														'required': false,
														'tooltip': 'Specify which version to use',
														'fieldMsg': 'Specify which version to use',
														onAction(id, value, form) {
															$scope.selectedConfigRepo.versions.forEach((version) => {
																if (version.version === value) {
																	$scope.selectedConfigVersion = version;
																}
															});
															let data = angular.copy($scope.selectedConfigVersion);
															if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
																if (data && data.tags) {
																	let tags = [];
																	data.tags.forEach((tag) => {
																		tags.push({
																			'v': tag,
																			'l': tag
																		});
																	});
																	form.entries[5].tabs[1].entries[1].entries.push({
																			'name': 'tag',
																			'label': 'Tags',
																			'type': 'select',
																			'value': tags,
																			'required': false,
																			'tooltip': 'Specify which tag to use',
																			'fieldMsg': 'Specify which tag to use'
																		},
																		{
																			'name': 'required',
																			'label': 'Required',
																			'type': 'readonly',
																			'value': true,
																			'required': false,
																			'tooltip': 'This field is required.',
																			'fieldMsg': 'This field is required.'
																		});
																} else {
																	let branches = [];
																	if (data && data.branches) {
																		data.branches.forEach((branch) => {
																			branches.push({
																				'v': branch,
																				'l': branch
																			});
																		});
																	}
																	form.entries[5].tabs[1].entries[1].entries.push({
																			'name': 'branch',
																			'label': 'Branch',
																			'type': 'select',
																			'value': branches,
																			'required': false,
																			'tooltip': 'Specify which branch to use',
																			'fieldMsg': 'Specify which branch to use'
																		},
																		{
																			'name': 'required',
																			'label': 'Required',
																			'type': 'readonly',
																			'value': true,
																			'required': false,
																			'tooltip': 'This field is required.',
																			'fieldMsg': 'This field is required.'
																		});
																}
																
															}
														}
													}
												);
												if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
													if ($scope.selectedConfigVersion) {
														if ($scope.selectedConfigVersion.tags) {
															let tags = [];
															$scope.selectedConfigVersion.tags.forEach((tag) => {
																tags.push({
																	'v': tag,
																	'l': tag
																});
															});
															form.entries[5].tabs[1].entries[1].entries.push({
																	'name': 'tag',
																	'label': 'Tags',
																	'type': 'select',
																	'value': tags,
																	'required': false,
																	'tooltip': 'Specify which tag to use',
																	'fieldMsg': 'Specify which tag to use'
																},
																{
																	'name': 'required',
																	'label': 'Required',
																	'type': 'readonly',
																	'value': true,
																	'required': false,
																	'tooltip': 'This field is required.',
																	'fieldMsg': 'This field is required.'
																});
														} else {
															let branches = [];
															$scope.selectedConfigVersion.branches.forEach((branch) => {
																branches.push({
																	'v': branch,
																	'l': branch
																});
															});
															form.entries[5].tabs[1].entries[1].entries.push({
																	'name': 'branch',
																	'label': 'Branch',
																	'type': 'select',
																	'value': branches,
																	'required': false,
																	'tooltip': 'Specify which branch to use',
																	'fieldMsg': 'Specify which branch to use'
																},
																{
																	'name': 'required',
																	'label': 'Required',
																	'type': 'readonly',
																	'value': true,
																	'required': false,
																	'tooltip': 'This field is required.',
																	'fieldMsg': 'This field is required.'
																});
														}
													}
												}
											}
										}
									} else {
										if (form.entries[5].tabs[1].entries[1].entries.length === 5) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										if (form.entries[5].tabs[1].entries[1].entries.length === 4) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
											form.entries[5].tabs[1].entries[1].entries.pop();
										}
										if (form.entries[5].tabs[1].entries[1].entries.length === 2) {
											form.entries[5].tabs[1].entries[1].entries.push({
												'name': 'required',
												'label': 'Required',
												'type': 'select',
												'value': [{'v': false, 'l': 'No', 'selected': true},
													{'v': true, 'l': 'Yes'}],
												'required': false,
												'tooltip': 'Specify if required or not.',
												'fieldMsg': 'Specify if required or not.'
											});
										}
									}
								}
							},
						]
					};
				} else {
					if (form.entries[5].tabs[1].entries) {
						form.formData.Label = '';
						form.formData.catalog = '';
						form.entries[5].tabs[1].entries[1] = {
							'type': 'html',
						}
					}
				}
			}
		});
		
		if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration) {
			$scope.configRepo.forEach((oneConfig) => {
				if (oneConfig.catalog && oneConfig.catalog.name === data.recipe.deployOptions.sourceCode.configuration.catalog) {
					$scope.selectedConfigRepo = oneConfig.catalog;
				}
			});
			if ($scope.selectedConfigRepo) {
				$scope.selectedConfigRepo.versions.forEach((version) => {
					if (version.version === data.recipe.deployOptions.sourceCode.configuration.version) {
						$scope.selectedConfigVersion = version;
					}
				});
			}
			mainFormConfig[5].tabs[1].entries.push({
				'name': 'config',
				"type": "group",
				'description': {
					'type': "default",
					'content': "<div class='fieldMsg'>You can attach a config catalog" +
						" recipes by filling the inputs below.<br />" +
						" Only activated branches of tis config <b>Config</b> catalog are available for this section.</div>"
				},
				"label": "Config Repository",
				"entries": [
					{
						'name': 'Label',
						'label': 'Label',
						'type': 'text',
						'value': [],
						'required': true,
						'tooltip': 'Enter a Label to use in deployment forms',
						'fieldMsg': 'Enter a Label to use in deployment forms'
					},
					{
						'name': 'catalog',
						'label': 'Catalog',
						'type': 'select',
						'value': $scope.configRepo,
						'required': false,
						'tooltip': 'Specify which config catalog to use',
						'fieldMsg': 'Specify which config catalog to use',
						onAction(id, value, form) {
							if (form.formData.catalog !== 'user specify') {
								if (form.entries[5].tabs[1].entries[1].entries.length === 5) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (form.entries[5].tabs[1].entries[1].entries.length === 4) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (!$scope.selectedConfigRepo){
									$scope.configRepo.forEach((oneConfig) => {
										if (oneConfig.catalog && oneConfig.catalog.name === value) {
											$scope.selectedConfigRepo = oneConfig.catalog;
										}
									});
								}
								let data = angular.copy($scope.selectedConfigRepo);
								
								if (data && data.versions && data.versions.length > 0) {
									let versions = [];
									data.versions.forEach((v) => {
										versions.push({
											'v': v.version,
											'l': v.version
										});
									});
									if (form.entries[5].tabs[1].entries[1].entries.length === 2) {
										form.entries[5].tabs[1].entries[1].entries.push({
												'name': 'version',
												'label': 'Version',
												'type': 'select',
												'value': versions,
												'required': false,
												'tooltip': 'Specify which version to use',
												'fieldMsg': 'Specify which version to use',
												onAction(id, value, form) {
													$scope.selectedConfigRepo.versions.forEach((version) => {
														if (version.version === value) {
															$scope.selectedConfigVersion = version;
														}
													});
													let data = angular.copy($scope.selectedConfigVersion);
													if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
														if (data && data.tags) {
															let tags = [];
															data.tags.forEach((tag) => {
																tags.push({
																	'v': tag,
																	'l': tag
																});
															});
															form.entries[5].tabs[1].entries[1].entries.push({
																	'name': 'tag',
																	'label': 'Tags',
																	'type': 'select',
																	'value': tags,
																	'required': false,
																	'tooltip': 'Specify which tag to use',
																	'fieldMsg': 'Specify which tag to use'
																},
																{
																	'name': 'required',
																	'label': 'Required',
																	'type': 'readonly',
																	'value': true,
																	'required': false,
																	'tooltip': 'This field is required.',
																	'fieldMsg': 'This field is required.'
																});
														} else {
															let branches = [];
															if (data && data.branches) {
																data.branches.forEach((branch) => {
																	branches.push({
																		'v': branch,
																		'l': branch
																	});
																});
															}
															form.entries[5].tabs[1].entries[1].entries.push({
																	'name': 'branch',
																	'label': 'Branch',
																	'type': 'select',
																	'value': branches,
																	'required': false,
																	'tooltip': 'Specify which branch to use',
																	'fieldMsg': 'Specify which branch to use'
																},
																{
																	'name': 'required',
																	'label': 'Required',
																	'type': 'readonly',
																	'value': true,
																	'required': false,
																	'tooltip': 'This field is required.',
																	'fieldMsg': 'This field is required.'
																});
														}
														
													}
												}
											}
										);
										if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
											if ($scope.selectedConfigVersion) {
												if ($scope.selectedConfigVersion.tags) {
													let tags = [];
													$scope.selectedConfigVersion.tags.forEach((tag) => {
														tags.push({
															'v': tag,
															'l': tag
														});
													});
													form.entries[5].tabs[1].entries[1].entries.push({
															'name': 'tag',
															'label': 'Tags',
															'type': 'select',
															'value': tags,
															'required': false,
															'tooltip': 'Specify which tag to use',
															'fieldMsg': 'Specify which tag to use'
														},
														{
															'name': 'required',
															'label': 'Required',
															'type': 'readonly',
															'value': true,
															'required': false,
															'tooltip': 'This field is required.',
															'fieldMsg': 'This field is required.'
														});
												} else {
													let branches = [];
													$scope.selectedConfigVersion.branches.forEach((branch) => {
														branches.push({
															'v': branch,
															'l': branch
														});
													});
													form.entries[5].tabs[1].entries[1].entries.push({
															'name': 'branch',
															'label': 'Branch',
															'type': 'select',
															'value': branches,
															'required': false,
															'tooltip': 'Specify which branch to use',
															'fieldMsg': 'Specify which branch to use'
														},
														{
															'name': 'required',
															'label': 'Required',
															'type': 'readonly',
															'value': true,
															'required': false,
															'tooltip': 'This field is required.',
															'fieldMsg': 'This field is required.'
														});
												}
											}
										}
									}
								}
							} else {
								if (form.entries[5].tabs[1].entries[1].entries.length === 5) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (form.entries[5].tabs[1].entries[1].entries.length === 4) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
									form.entries[5].tabs[1].entries[1].entries.pop();
								}
								if (form.entries[5].tabs[1].entries[1].entries.length === 2) {
									form.entries[5].tabs[1].entries[1].entries.push({
										'name': 'required',
										'label': 'Required',
										'type': 'select',
										'value': [{'v': false, 'l': 'No', 'selected': true},
											{'v': true, 'l': 'Yes'}],
										'required': false,
										'tooltip': 'Specify if required or not.',
										'fieldMsg': 'Specify if required or not.'
									});
								}
							}
						}
					},
					
				]
			});
			
			if ($scope.selectedConfigRepo && $scope.selectedConfigRepo.versions && $scope.selectedConfigRepo.versions.length > 0) {
				let versions = [];
				$scope.selectedConfigRepo.versions.forEach((v) => {
					versions.push({
						'v': v.version,
						'l': v.version
					});
				});
				
				if (mainFormConfig[5].tabs[1].entries[1].entries && mainFormConfig[5].tabs[1].entries[1].entries.length === 2) {
					mainFormConfig[5].tabs[1].entries[1].entries.push({
							'name': 'version',
							'label': 'Version',
							'type': 'select',
							'value': versions,
							'required': false,
							'tooltip': 'Specify which version to use',
							'fieldMsg': 'Specify which version to use',
							onAction(id, value, form) {
								$scope.selectedConfigRepo.versions.forEach((version) => {
									if (version.version === value) {
										$scope.selectedConfigVersion = version;
									}
								});
								let data = angular.copy($scope.selectedConfigVersion);
								if (form.entries[5].tabs[1].entries[1].entries.length === 3) {
									if (data && data.tags) {
										let tags = [];
										data.tags.forEach((tag) => {
											tags.push({
												'v': tag,
												'l': tag
											});
										});
										form.entries[5].tabs[1].entries[1].entries.push({
												'name': 'tag',
												'label': 'Tags',
												'type': 'select',
												'value': tags,
												'required': false,
												'tooltip': 'Specify which tag to use',
												'fieldMsg': 'Specify which tag to use'
											},
											{
												'name': 'required',
												'label': 'Required',
												'type': 'readonly',
												'value': true,
												'required': false,
												'tooltip': 'This field is required.',
												'fieldMsg': 'This field is required.'
											});
									} else {
										let branches = [];
										if (data && data.branches) {
											data.branches.forEach((branch) => {
												branches.push({
													'v': branch,
													'l': branch
												});
											});
										}
										form.entries[5].tabs[1].entries[1].entries.push({
												'name': 'branch',
												'label': 'Branch',
												'type': 'select',
												'value': branches,
												'required': false,
												'tooltip': 'Specify which branch to use',
												'fieldMsg': 'Specify which branch to use'
											},
											{
												'name': 'required',
												'label': 'Required',
												'type': 'readonly',
												'value': true,
												'required': false,
												'tooltip': 'This field is required.',
												'fieldMsg': 'This field is required.'
											});
									}
									
								}
							}
						}
					);
					if (mainFormConfig[5].tabs[1].entries[1].entries.length === 3) {
						if ($scope.selectedConfigVersion) {
							if ($scope.selectedConfigVersion.tags) {
								let tags = [];
								$scope.selectedConfigVersion.tags.forEach((tag) => {
									tags.push({
										'v': tag,
										'l': tag
									});
								});
								mainFormConfig[5].tabs[1].entries[1].entries.push({
										'name': 'tag',
										'label': 'Tags',
										'type': 'select',
										'value': tags,
										'required': false,
										'tooltip': 'Specify which tag to use',
										'fieldMsg': 'Specify which tag to use'
									},
									{
										'name': 'required',
										'label': 'Required',
										'type': 'readonly',
										'value': true,
										'required': false,
										'tooltip': 'This field is required.',
										'fieldMsg': 'This field is required.'
									});
							} else {
								let branches = [];
								$scope.selectedConfigVersion.branches.forEach((branch) => {
									branches.push({
										'v': branch,
										'l': branch
									});
								});
								
								mainFormConfig[5].tabs[1].entries[1].entries.push({
										'name': 'branch',
										'label': 'Branch',
										'type': 'select',
										'value': branches,
										'required': false,
										'tooltip': 'Specify which branch to use',
										'fieldMsg': 'Specify which branch to use'
									},
									{
										'name': 'required',
										'label': 'Required',
										'type': 'readonly',
										'value': true,
										'required': false,
										'tooltip': 'This field is required.',
										'fieldMsg': 'This field is required.'
									});
							}
						}
					}
				}
			}
		}
		
		// add restrictions
		// if (mainFormConfig.length === 8) {
		// 	mainFormConfig.push(
		// 		{
		// 			"type": "html",
		// 			"value": "<hr><h2>Restrictions</h2>"
		// 		},
		// 		{
		// 			'name': 'restrictions',
		// 			'label': 'Attach Restrictions',
		// 			'type': 'buttonSlider',
		// 			'disabled': true,
		// 			onAction(id, data, form) {
						// if (form.formData && form.formData.restrictions && form.formData.restrictions === true && form.entries.length === 10) {
							// listInfraProviders(currentScope, () => {
							// 	form.entries.push({
							// 		'name': 'deploymentType',
							// 		'label': 'Deployment Type',
							// 		'type': 'uiselect',
							// 		"multiple": false,
							// 		'value': currentScope.infraProviders.deploymentTypes,
							// 		"required": true,
							// 		'fieldMsg': "Choose the type of deployment",
							// 		onAction(id, data, form) {
							// 			restrictionBehavior(id, data, form, currentScope);
							// 		}
							// 	});
							// });
						// } else {
						// 	form.formData.deploymentType = [];
						// 	form.formData.infra = [];
						// 	form.formData.drivers = [];
						// 	if (form.entries.length === 13) {
						// 		form.entries.pop()
						// 	}
						// 	if (form.entries.length === 12) {
						// 		form.entries.pop()
						// 	}
						// 	if (form.entries.length === 11) {
						// 		form.entries.pop()
						// 	}
						// }
				//	}
			//	});
	//	}
		
		$modal.open({
			templateUrl: "editRecipe.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.recipe = {
					v: data.v || 1,
					ts: data.ts,
					name: data.name
				};
				let formConfig = angular.copy(mainFormConfig);
				
				// restrictionOnLoad($scope, currentScope, data);
				
				$scope.addNewEnvVar = function () {
					let envVars = angular.copy(catalogAppConfig.form.envVars);
					envVars.name += envCounter;
					
					envVars.entries[1].name += envCounter;
					envVars.entries[2].name += envCounter;
					envVars.entries[2].onAction = reRenderEnvVar;
					
					if (!submitAction) {
						envVars.entries.pop();
					} else {
						envVars.entries[envVars.entries.length - 1].name += envCounter;
						envVars.entries[envVars.entries.length - 1].onAction = function (id, value, form) {
							let count = parseInt(id.replace('envVarRemove', ''));
							for (let i = form.entries[7].tabs[1].entries.length - 1; i >= 0; i--) {
								if (form.entries[7].tabs[1].entries[i].name === 'envVarGroup' + count) {
									//remove from formData
									for (let fieldname in form.formData) {
										if (['envVarName' + count, 'envVarType' + count, 'computedVar' + count, 'staticVar' + count, 'userInputLabel' + count, 'userInputDefault' + count, 'secretName' + count, 'secretKey' + count, 'userInputFieldMsg' + count].indexOf(fieldname) !== -1) {
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[7].tabs[1].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if ($scope.form && $scope.form.entries) {
						$scope.form.entries[7].tabs[1].entries.splice($scope.form.entries[7].tabs[1].entries.length - 1, 0, envVars);
					} else {
						formConfig[7].tabs[1].entries.splice($scope.form.entries[7].tabs[1].entries.length - 1, 0, envVars);
					}
					envCounter++;
				};
				
				$scope.addNewVolume = function (value, mountValue) {
					let tmp = angular.copy(catalogAppConfig.form.volumeInput);
					if ($scope.form.entries[5].tabs[5].entries.length >= 2) {
						$scope.form.entries[5].tabs[5].entries[0].value = '';
					}
					tmp.name += volumeCounter;
					tmp.entries[0].name += volumeCounter;
					tmp.entries[1].name += volumeCounter;
					
					let defaultDockerVolume = {
						volume: {}
					};
					let defaultKubernetesVolume = {
						volume: {},
						volumeMount: {}
					};
					
					if (!submitAction) {
						tmp.entries.pop()
					} else {
						tmp.entries[2].name += volumeCounter;
						tmp.entries[2].onAction = function (id, value, form) {
							let count = parseInt(id.replace('rVolume', ''));
							
							for (let i = form.entries[5].tabs[5].entries.length - 1; i >= 0; i--) {
								if (form.entries[5].tabs[5].entries[i].name === 'volumeGroup' + count) {
									//remove from formData
									for (let fieldname in form.formData) {
										if (['docker' + count, 'kubernetes' + count].indexOf(fieldname) !== -1) {
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[5].tabs[5].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if ($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[5].entries.splice($scope.form.entries[5].tabs[5].entries.length - 1, 0, tmp);
						if (value) {
							setEditorContent('docker' + volumeCounter, value, tmp.entries[0].height, $scope);
							if (mountValue) {
								setEditorContent('kubernetes' + volumeCounter, mountValue, tmp.entries[1].height, $scope);
							} else {
								setEditorContent('kubernetes' + volumeCounter, defaultKubernetesVolume, tmp.entries[1].height, $scope);
							}
						} else {
							setEditorContent('docker' + volumeCounter, defaultDockerVolume, tmp.entries[0].height, $scope);
							setEditorContent('kubernetes' + volumeCounter, defaultKubernetesVolume, tmp.entries[1].height, $scope);
						}
					} else {
						formConfig[5].tabs[5].entries.splice($scope.form.entries[5].tabs[5].entries.length - 1, 0, tmp);
						if (value) {
							setEditorContent('docker' + volumeCounter, value, tmp.entries[0].height, $scope);
							if (mountValue) {
								setEditorContent('kubernetes' + volumeCounter, mountValue, tmp.entries[1].height, $scope);
							} else {
								setEditorContent('kubernetes' + volumeCounter, defaultKubernetesVolume, tmp.entries[1].height, $scope);
							}
						} else {
							setEditorContent('docker' + volumeCounter, defaultDockerVolume, tmp.entries[0].height, $scope);
							setEditorContent('kubernetes' + volumeCounter, defaultKubernetesVolume, tmp.entries[1].height, $scope);
						}
					}
					volumeCounter++;
				};
				
				$scope.addNewPort = function (value) {
					let tmp = angular.copy(catalogAppConfig.form.portInput);
					tmp.name += portCounter;
					tmp.entries[0].name += portCounter;
					tmp.entries[1].name += portCounter;
					if (!submitAction) {
						tmp.entries.pop();
					} else {
						tmp.entries[1].onAction = function (id, value, form) {
							let count = parseInt(id.replace('rPort', ''));
							
							for (let i = form.entries[5].tabs[6].entries.length - 1; i >= 0; i--) {
								if (form.entries[5].tabs[6].entries[i].name === 'portGroup' + count) {
									//remove from formData
									for (let fieldname in form.formData) {
										if (['port' + count].indexOf(fieldname) !== -1) {
											delete form.formData[fieldname];
										}
									}
									//remove from entries
									form.entries[5].tabs[6].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if ($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[6].entries.splice($scope.form.entries[5].tabs[6].entries.length - 1, 0, tmp);
						//$scope.form.entries[11].entries.push(tmp);
						if (value) {
							setEditorContent('port' + portCounter, value, tmp.entries[0].height, $scope)
						} else {
							setEditorContent('port' + portCounter, {}, tmp.entries[0].height, $scope)
						}
					} else {
						formConfig[5].tabs[5].entries.splice($scope.form.entries[5].tabs[6].entries.length - 1, 0, tmp);
						if (value) {
							setEditorContent('port' + portCounter, value, tmp.entries[0].height, $scope)
						} else {
							setEditorContent('port' + portCounter, {}, tmp.entries[0].height, $scope)
						}
					}
					portCounter++;
				};
				
				$scope.addNewLabel = function (value) {
					let tmp = angular.copy(catalogAppConfig.form.labelInput);
					tmp.name += labelCounter;
					tmp.entries[0].name += labelCounter;
					tmp.entries[1].name += labelCounter;
					tmp.entries[2].name += labelCounter;
					if (!submitAction) {
						tmp.entries.pop();
					} else {
						tmp.entries[2].onAction = function (id, value, form) {
							let count = parseInt(id.replace('rLabel', ''));
							
							for (let i = form.entries[5].tabs[7].entries.length - 1; i >= 0; i--) {
								if (form.entries[5].tabs[7].entries[i].name === 'labelGroup' + count) {
									//remove from formData
									for (let fieldname in form.formData) {
										if (['labelName' + count, 'labelValue' + count].indexOf(fieldname) !== -1) {
											delete form.formData[fieldname];
										}
									}
									//remove from formEntries
									form.entries[5].tabs[7].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if ($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[7].entries.splice($scope.form.entries[5].tabs[7].entries.length - 1, 0, tmp);
					} else {
						formConfig[5].tabs[7].entries.splice($scope.form.entries[5].tabs[7].entries.length - 1, 0, tmp);
					}
					labelCounter++;
				};
				
				$scope.addNewExecCommand = function (value) {
					let tmp = angular.copy(catalogAppConfig.form.execCommand);
					tmp.name += execCounter;
					tmp.entries[0].name += execCounter;
					tmp.entries[1].name += execCounter;
					tmp.entries[2].name += execCounter;
					if (!submitAction) {
						tmp.entries.pop();
					} else {
						tmp.entries[2].onAction = function (id, value, form) {
							let count = parseInt(id.replace('execLabel', ''));
							
							for (let i = form.entries[5].tabs[8].entries.length - 1; i >= 0; i--) {
								if (form.entries[5].tabs[8].entries[i].name === 'ExecCommandGroup' + count) {
									//remove from formData
									for (let fieldname in form.formData) {
										if (['ExeclabelName' + count, 'ExeclabelValue' + count].indexOf(fieldname) !== -1) {
											delete form.formData[fieldname];
										}
									}
									//remove from formEntries
									form.entries[5].tabs[8].entries.splice(i, 1);
									break;
								}
							}
						};
					}
					
					if ($scope.form && $scope.form.entries) {
						$scope.form.entries[5].tabs[8].entries.splice($scope.form.entries[5].tabs[8].entries.length - 1, 0, tmp);
					} else {
						formConfig[5].tabs[8].entries.splice($scope.form.entries[5].tabs[8].entries.length - 1, 0, tmp);
					}
					execCounter++;
				};
				
				if (submitAction) {
					if (formConfig[5].tabs[5].entries[0]) {
						formConfig[5].tabs[5].entries[0].onAction = function (id, value, form) {
							$scope.addNewVolume();
						};
					}
					if (formConfig[5].tabs[6].entries[0]) {
						formConfig[5].tabs[6].entries[0].onAction = function (id, value, form) {
							$scope.addNewPort();
						};
					}
					if (formConfig[5].tabs[7].entries[0]) {
						formConfig[5].tabs[7].entries[0].onAction = function (id, value, form) {
							$scope.addNewLabel();
						};
					}
					if (formConfig[5].tabs[8].entries[0]) {
						formConfig[5].tabs[8].entries[0].onAction = function (id, value, form) {
							$scope.addNewExecCommand();
						};
					}
					if (formConfig[7].tabs[1].entries[0]) {
						formConfig[7].tabs[1].entries[0].onAction = function (id, value, form) {
							$scope.addNewEnvVar();
						};
					}
				} else {
					if (formConfig[5].tabs[5].entries[0]) formConfig[5].tabs[5].entries.pop();
					if (formConfig[5].tabs[6].entries[0]) formConfig[5].tabs[6].entries.pop();
					if (formConfig[5].tabs[7].entries[0]) formConfig[5].tabs[7].entries.pop();
					if (formConfig[5].tabs[8].entries[0]) formConfig[5].tabs[8].entries.pop();
					if (formConfig[7].tabs[1].entries) formConfig[7].tabs[1].entries.pop();
				}
				
				let formData = mapDataToForm($scope, false);
				let options = {
					timeout: $timeout,
					entries: formConfig,
					name: 'editRecipe',
					data: formData,
					actions: [
						{
							type: 'reset',
							label: (submitAction) ? 'Cancel' : 'Close',
							btn: 'danger',
							action: function () {
								$modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};
				if (submitAction && !data.locked) {
					options.actions.splice(0, 0, {
						type: 'submit',
						label: 'Submit',
						btn: 'primary',
						action: function (fData) {
							let formData = fromToAPI(fData, envCounter, volumeCounter, portCounter, labelCounter, execCounter);
							
							if (formData.recipe.deployOptions.sourceCode.configuration && (!formData.recipe.deployOptions.sourceCode.configuration.label || formData.recipe.deployOptions.sourceCode.configuration.label === '')) {
								$scope.form.displayAlert('danger', 'Must add label for configuration repository');
							} else {
								if (formData.recipe.deployOptions.sourceCode.configuration && formData.recipe.deployOptions.sourceCode.configuration.catalog !== '' && formData.recipe.deployOptions.sourceCode.configuration.branch === '') {
									$scope.form.displayAlert('danger', 'Must add branch for your repository');
								} else {
									if ($scope.form.formData && $scope.form.formData.restrictions && $scope.form.formData.restrictions === true && $scope.form.formData.deploymentType && $scope.form.formData.deploymentType.length === 0) {
										$scope.form.displayAlert('danger', 'Must choose at least the type of deployment in restrictions');
									} else {
										getSendDataFromServer($scope, ngDataApi, {
											method: submitAction.method,
											routeName: submitAction.routeName,
											params: submitAction.params,
											data: {
												catalog: formData
											}
										}, function (error, response) {
											overlayLoading.hide();
											if (error) {
												$scope.form.displayAlert('danger', error.message);
											} else {
												$scope.form.displayAlert('success', 'Recipe Saved Successfully');
												$modalInstance.close();
												$scope.form.formData = {};
												currentScope.listRecipes();
											}
										});
									}
								}
							}
						}
					});
				}
				buildForm($scope, $modalInstance, options, function () {
					$scope.form.formData = mapDataToForm($scope, true);
					$scope.form.refresh(true);
				});
			}
		});
		
		function mapDataToForm(modalScope, postForm) {
			let output = {
				name: data.name,
				description: data.description,
				type: data.type,
				subtype: data.subtype,
				imagePrefix: data.recipe.deployOptions.image.prefix,
				imageName: data.recipe.deployOptions.image.name,
				imageTag: data.recipe.deployOptions.image.tag,
				imagePullPolicy: data.recipe.deployOptions.image.pullPolicy,
				imageRepositoryType: data.recipe.deployOptions.image.repositoryType || 'public',
				imageBinary: !!data.recipe.deployOptions.image.binary,
				imageShell: data.recipe.deployOptions.image.shell,
				condition: (data.recipe.deployOptions.restartPolicy) ? data.recipe.deployOptions.restartPolicy.condition : '',
				maxAttempts: (data.recipe.deployOptions.restartPolicy) ? data.recipe.deployOptions.restartPolicy.maxAttempts : '',
				network: data.recipe.deployOptions.container.network,
				workingDir: data.recipe.deployOptions.container.workingDir,
			};
			
			if (data.recipe.buildOptions.cmd
				&& data.recipe.buildOptions.cmd.deploy
				&& data.recipe.buildOptions.cmd.deploy.command) {
				output.command = data.recipe.buildOptions.cmd.deploy.command[0];
				
				if (data.recipe.buildOptions.cmd.deploy.args) {
					output.arguments = data.recipe.buildOptions.cmd.deploy.args.join("\n");
				}
			}
			if (data.recipe.deployOptions.image && Object.hasOwnProperty.call(data.recipe.deployOptions.image, 'override')) {
				output['imageOverride'] = data.recipe.deployOptions.image.override.toString();
			} else {
				output['imageOverride'] = 'false';
			}
			
			if (data.restriction && Object.keys(data.restriction).length > 0) {
				output['restrictions'] = true;
			}
			
			if (data.restriction && data.restriction.deployment && data.restriction.deployment.length > 0) {
				let deployment = {};
				
				for (let i = 0; i < data.restriction.deployment.length; i++) {
					deployment = {v: data.restriction.deployment[i], l: data.restriction.deployment[i]};
				}
				output['deploymentType'] = deployment;
			}
			
			if (data.restriction && data.restriction.infra && data.restriction.infra.length > 0) {
				let infra = [];
				for (let i = 0; i < data.restriction.infra.length; i++) {
					infra.push({v: data.restriction.infra[i], l: data.restriction.infra[i]});
				}
				output['infra'] = infra;
			}
			
			if (data.restriction && data.restriction.driver && data.restriction.driver.length > 0) {
				let drivers = [];
				for (let i = 0; i < data.restriction.driver.length; i++) {
					if (data.restriction.driver[i] && data.restriction.driver[i].indexOf('.') !== -1) {
						data.restriction.driver[i] = data.restriction.driver[i].split('.')[1];
					}
					drivers.push({v: "container." + data.restriction.driver[i], l: data.restriction.driver[i]});
				}
				output['drivers'] = drivers;
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.label) {
				output['Label'] = data.recipe.deployOptions.sourceCode.configuration.label
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration) {
				output['configButton'] = true
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.catalog) {
				output['catalog'] = data.recipe.deployOptions.sourceCode.configuration.catalog
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.catalog === '') {
				output['catalog'] = 'user specify';
				output['branch'] = '';
				output['version'] = '';
				output['required'] = data.recipe.deployOptions.sourceCode.configuration.required;
			}
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.branch && data.recipe.deployOptions.sourceCode.configuration.branch.length !== 0) {
				output['version'] = data.recipe.deployOptions.sourceCode.configuration.version
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.branch && data.recipe.deployOptions.sourceCode.configuration.branch.length !== 0) {
				output['branch'] = data.recipe.deployOptions.sourceCode.configuration.branch
			}
			
			if (data.recipe.deployOptions.sourceCode && data.recipe.deployOptions.sourceCode.configuration && data.recipe.deployOptions.sourceCode.configuration.required) {
				output['required'] = data.recipe.deployOptions.sourceCode.configuration.required
			}
			
			if (postForm) {
				output["readinessProbe"] = data.recipe.deployOptions.readinessProbe;
				setEditorContent("readinessProbe", output['readinessProbe'], mainFormConfig[5].tabs[2].entries[0].height, modalScope);
				
				output["livenessProbe"] = data.recipe.deployOptions.livenessProbe;
				setEditorContent("livenessProbe", output['livenessProbe'], mainFormConfig[5].tabs[3].entries[0].height, modalScope);
				
				//volumes
				if (data.recipe.deployOptions.voluming && (data.recipe.deployOptions.voluming && data.recipe.deployOptions.voluming.length > 0)) {
					data.recipe.deployOptions.voluming.forEach(function (oneVolume) {
						
						let dockerVolume = {};
						if (oneVolume.docker && oneVolume.docker.volume) {
							dockerVolume = oneVolume.docker;
							output['volume' + volumeCounter] = dockerVolume;
						} else {
							output['volume' + volumeCounter] = {};
						}
						
						let mountVolume;
						if (oneVolume.kubernetes && oneVolume.kubernetes.volume) {
							output['kubernetes' + volumeCounter] = oneVolume.kubernetes; // will have both volume & mount
							mountVolume = oneVolume.kubernetes;
						} else {
							output['kubernetes' + volumeCounter] = {};
							mountVolume = {};
						}
						
						modalScope.addNewVolume(dockerVolume, mountVolume);
					});
				} else if (!data.recipe.deployOptions.voluming || (data.recipe.deployOptions.voluming || data.recipe.deployOptions.voluming.length === 0)) {
					modalScope.form.entries[5].tabs[5].entries.splice(modalScope.form.entries[5].tabs[5].entries.length - 1, 0, {
						'type': 'html',
						'value': "<br /><div class='alert alert-warning'>No Volumes Configured for this Recipe.</div><br />"
					});
				}
				
				//ports
				if (data.recipe.deployOptions.ports && data.recipe.deployOptions.ports.length > 0) {
					data.recipe.deployOptions.ports.forEach(function (onePort) {
						output['port' + portCounter] = onePort;
						modalScope.addNewPort(onePort);
					});
				} else if (!data.recipe.deployOptions.ports || data.recipe.deployOptions.ports.length === 0) {
					modalScope.form.entries[5].tabs[6].entries.splice(modalScope.form.entries[5].tabs[6].entries.length - 1, 0, {
						'type': 'html',
						'value': "<br /><div class='alert alert-warning'>No Ports Configured for this Recipe.</div><br />"
					});
				}
				
				//env variables
				if (data.recipe.buildOptions.env && Object.keys(data.recipe.buildOptions.env).length > 0) {
					for (let oneVar in data.recipe.buildOptions.env) {
						output['envVarName' + envCounter] = oneVar;
						output['envVarType' + envCounter] = data.recipe.buildOptions.env[oneVar].type;
						switch (data.recipe.buildOptions.env[oneVar].type) {
							case 'computed':
								output['computedVar' + envCounter] = data.recipe.buildOptions.env[oneVar].value;
								break;
							case 'static':
								output['staticVar' + envCounter] = data.recipe.buildOptions.env[oneVar].value;
								break;
							case 'userInput':
								output['userInputLabel' + envCounter] = data.recipe.buildOptions.env[oneVar].label;
								output['userInputDefault' + envCounter] = data.recipe.buildOptions.env[oneVar].default;
								output['userInputFieldMsg' + envCounter] = data.recipe.buildOptions.env[oneVar].fieldMsg;
								break;
							case 'secret':
								output['secretName' + envCounter] = data.recipe.buildOptions.env[oneVar].secret;
								output['secretKey' + envCounter] = data.recipe.buildOptions.env[oneVar].key;
								break;
						}
						modalScope.addNewEnvVar();
						//counter got incremented in method above, refill data starting from 0 instead of 1
						reRenderEnvVar('envVarType' + (envCounter - 1), data.recipe.buildOptions.env[oneVar].type, modalScope.form);
					}
				} else if (!data.recipe.buildOptions.env || Object.keys(data.recipe.buildOptions.env).length === 0) {
					modalScope.form.entries[8].tabs[1].entries.splice(modalScope.form.entries[8].tabs[1].entries.length - 1, 0, {
						'type': 'html',
						'value': "<br /><div class='alert alert-warning'>No Environment Variables Configured for this Recipe.</div><br />"
					});
				}
				
				//service labels
				if (data.recipe.deployOptions.labels && Object.keys(data.recipe.deployOptions.labels).length > 0) {
					for (let oneLabel in data.recipe.deployOptions.labels) {
						output['labelName' + labelCounter] = oneLabel;
						output['labelValue' + labelCounter] = data.recipe.deployOptions.labels[oneLabel];
						modalScope.addNewLabel(data.recipe.deployOptions.labels[oneLabel]);
					}
				} else {
					modalScope.form.entries[5].tabs[7].entries.splice(modalScope.form.entries[5].tabs[7].entries.length - 1, 0, {
						'type': 'html',
						'value': "<br /><div class='alert alert-warning'>No Labels found for this Recipe.</div><br />"
					});
				}
				
				//service labels
				if (data.recipe.deployOptions.execCommands && Object.keys(data.recipe.deployOptions.execCommands).length > 0) {
					for (let oneLabel in data.recipe.deployOptions.execCommands) {
						output['ExeclabelName' + execCounter] = oneLabel;
						output['ExeclabelValue' + execCounter] = data.recipe.deployOptions.execCommands[oneLabel];
						modalScope.addNewExecCommand(data.recipe.deployOptions.execCommands[oneLabel]);
					}
				} else {
					modalScope.form.entries[5].tabs[8].entries.splice(modalScope.form.entries[5].tabs[8].entries.length - 1, 0, {
						'type': 'html',
						'value': "<br /><div class='alert alert-warning'>No Exec commands found for this Recipe.</div><br />"
					});
				}
			}
			
			return output;
		}
	}
	
	function getConfigurations(cb) {
		$scope.accountInfo = [];
		$scope.repos = [];
		$scope.configRepo = [];
		$scope.repos.push({'v': 'user specify', 'l': '-- User Specify --'});
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/marketplace/items',
			'params': {
				'type': 'config',
			},
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (response) {
					$scope.configRepo.push({
						'v': 'user specify',
						'l': '-- User Specify --',
					});
					response.records.forEach(function (oneCatalog) {
						if (oneCatalog.type === 'config') {
							$scope.configRepo.push({
								'v': oneCatalog.name,
								'l': oneCatalog.name,
								'catalog': oneCatalog
							});
						}
					});
				} else {
					$scope.displayAlert('danger', 'No Config Catalogs found');
				}
				return cb();
			}
		});
	}
	
	function fromToAPI(formData, envCounter, volumeCounter, portCounter, labelCounter, execCounter) {
		let apiData = {
			name: formData.name,
			type: formData.type,
			subtype: formData.subtype,
			description: formData.description,
			restriction: {},
			recipe: {
				deployOptions: {
					"image": {
						"prefix": formData.imagePrefix,
						"name": formData.imageName,
						"tag": formData.imageTag,
						"pullPolicy": formData.imagePullPolicy,
						"repositoryType": formData.imageRepositoryType,
						"override": (formData.imageOverride === 'true'),
						"shell": formData.imageShell,
						"binary": !!formData.imageBinary
					},
					'sourceCode': {},
					"readinessProbe": formData.readinessProbe,
					"livenessProbe": formData.livenessProbe,
					"ports": [],
					"voluming": [],
					"restartPolicy": {
						"condition": formData.condition,
						"maxAttempts": formData.maxAttempts
					},
					"container": {
						"network": formData.network,
						"workingDir": formData.workingDir
					}
				},
				buildOptions: {
					"env": {}
				}
			}
		};
		
		
		if (formData.deploymentType) {
			formData.deploymentType = [formData.deploymentType];
			if (formData.deploymentType && formData.deploymentType.length > 0) {
				for (let i = 0; i < formData.deploymentType.length; i++) {
					formData.deploymentType[i] = formData.deploymentType[i].v
				}
				apiData['restriction']["deployment"] = formData.deploymentType
			}
		}
		
		if (formData.drivers && formData.drivers.length > 0) {
			for (let i = 0; i < formData.drivers.length; i++) {
				formData.drivers[i] = formData.drivers[i].v
			}
			apiData['restriction']["driver"] = formData.drivers
		}
		if (formData.infra && formData.infra.length > 0) {
			for (let i = 0; i < formData.infra.length; i++) {
				formData.infra[i] = formData.infra[i].v
			}
			apiData['restriction']["infra"] = formData.infra
		}
		
		
		if (formData.configButton && formData.configButton === true) {
			apiData.recipe.deployOptions.sourceCode.configuration = {
				'label': formData.Label,
				'catalog': formData.catalog,
				'version': '',
				'branch': formData.branch,
				'required': (formData.required),
			};
			if (formData.version) {
				apiData.recipe.deployOptions.sourceCode.configuration.version = formData.version;
			}
			if (formData.required === false !== apiData.recipe.deployOptions.sourceCode.configuration.required) {
				apiData.recipe.deployOptions.sourceCode.configuration.required = formData.required;
			}
			if (apiData.recipe.deployOptions.sourceCode.configuration && (apiData.recipe.deployOptions.sourceCode.configuration.catalog === 'user specify' || apiData.recipe.deployOptions.sourceCode.configuration.catalog === '')) {
				apiData.recipe.deployOptions.sourceCode.configuration.catalog = '';
				apiData.recipe.deployOptions.sourceCode.configuration.version = '';
				apiData.recipe.deployOptions.sourceCode.configuration.branch = '';
				
			}
			
			if (apiData.recipe.deployOptions.sourceCode.configuration && apiData.recipe.deployOptions.sourceCode.configuration.catalog !== '') {
				apiData.recipe.deployOptions.sourceCode.configuration.required = true;
			}
		}
		
		if (!apiData.recipe.buildOptions.cmd) {
			apiData.recipe.buildOptions.cmd = {
				deploy: {
					command: [],
					args: []
				}
			};
		}
		if (formData.command) {
			apiData.recipe.buildOptions.cmd.deploy.command = [formData.command];
			
			if (formData.arguments) {
				apiData.recipe.buildOptions.cmd.deploy.args = formData.arguments.split("\n");
			}
		}
		
		if (volumeCounter > 0) {
			for (let i = 0; i < volumeCounter; i++) {
				let currentVolume = {
					docker: {},
					kubernetes: {}
				};
				let volume = formData['docker' + i];
				
				if (volume && Object.keys(volume).length > 0) {
					currentVolume.docker = volume; // will probably have volume
				}
				
				let volumeMount = formData['kubernetes' + i];
				if (volumeMount && Object.keys(volumeMount).length > 0) {
					currentVolume.kubernetes = volumeMount; // will probably have volume and volumeMount
				}
				
				if (formData['docker' + i] !== undefined || formData['kubernetes' + i] !== undefined) {
					apiData.recipe.deployOptions.voluming.push(currentVolume);
				}
			}
		}
		
		if (portCounter > 0) {
			for (let i = 0; i < portCounter; i++) {
				let port = formData['port' + i];
				if (port && Object.keys(port).length > 0) {
					apiData.recipe.deployOptions.ports.push(port);
				}
			}
		}
		
		if (envCounter > 0) {
			for (let i = 0; i < envCounter; i++) {
				if (!formData['envVarName' + i] || !formData['envVarType' + i]) {
					continue;
				}
				apiData.recipe.buildOptions.env[formData['envVarName' + i]] = {
					'type': formData['envVarType' + i]
				};
				switch (formData['envVarType' + i]) {
					case 'static':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].value = formData['staticVar' + i];
						break;
					case 'computed':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].value = formData['computedVar' + i];
						break;
					case 'userInput':
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].label = formData['userInputLabel' + i];
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].default = formData['userInputDefault' + i];
						apiData.recipe.buildOptions.env[formData['envVarName' + i]].fieldMsg = formData['userInputFieldMsg' + i];
						break;
					case 'secret':
						if (formData['secretName' + i]) {
							apiData.recipe.buildOptions.env[formData['envVarName' + i]].secret = formData['secretName' + i];
						}
						if (formData['secretKey' + i]) {
							apiData.recipe.buildOptions.env[formData['envVarName' + i]].key = formData['secretKey' + i];
						}
						break;
				}
				//nothing to push
				if (Object.keys(apiData.recipe.buildOptions.env[formData['envVarName' + i]]).length === 0) {
					delete apiData.recipe.buildOptions.env[formData['envVarName' + i]];
				}
			}
		}
		
		if (labelCounter > 0) {
			apiData.recipe.deployOptions.labels = {};
			for (let i = 0; i < labelCounter; i++) {
				if (!formData['labelName' + i] || !formData['labelValue' + i]) {
					continue;
				}
				apiData.recipe.deployOptions.labels[formData['labelName' + i]] = formData['labelValue' + i];
				
				//nothing to push
				if (!apiData.recipe.deployOptions.labels[formData['labelName' + i]]) {
					delete apiData.recipe.deployOptions.labels[formData['labelName' + i]];
				}
			}
		}
		if (execCounter > 0) {
			apiData.recipe.deployOptions.execCommands = {};
			for (let i = 0; i < execCounter; i++) {
				if (!formData['ExeclabelName' + i] || !formData['ExeclabelValue' + i]) {
					continue;
				}
				apiData.recipe.deployOptions.execCommands[formData['ExeclabelName' + i]] = formData['ExeclabelValue' + i];
				
				//nothing to push
				if (!apiData.recipe.deployOptions.execCommands[formData['ExeclabelName' + i]]) {
					delete apiData.recipe.deployOptions.execCommands[formData['ExeclabelName' + i]];
				}
			}
		}
		return apiData;
	}
	
	$scope.addRecipe = function (type) {
		$scope.add = true;
		let formConfig;
		let data;
		
		let submitAction = {
			method: 'post',
			routeName: '/dashboard/catalog/recipes/add',
			params: {}
		};
		let currentScope = $scope;
		
		if (type === 'blank') {
			$modal.open({
				templateUrl: "newRecipe.tmpl",
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					let formConfig = angular.copy(catalogAppConfig.form.add.new);
					formConfig[0].onAction = function (id, data, form) {
						let categories = angular.copy(catalogAppConfig.form.add.categories);
						for (let i = categories.value.length - 1; i >= 0; i--) {
							if (categories.value[i].group !== data) {
								categories.value.splice(i, 1);
							}
						}
						
						if (form.entries.length > 1) {
							form.entries.splice(form.entries.length - 1, 1);
						}
						if (categories.value.length > 0) {
							form.entries.push(categories);
						}
					};
					
					let options = {
						timeout: $timeout,
						entries: formConfig,
						name: 'newRecipe',
						actions: [
							{
								'type': 'submit',
								'label': "Proceed",
								'btn': 'primary',
								action: function (formData) {
									data = angular.copy(catalogAppConfig.templates.recipe);
									data.type = formData.type;
									data.subtype = formData.subtype;
									
									$modalInstance.close();
									$scope.form.formData = {};
									$timeout(function () {
										getConfigurations(function () {
											let formEntries = angular.copy(catalogAppConfig.form.entries);
											if (data.type === 'other') {
												delete formEntries[2].disabled;
												delete formEntries[3].disabled;
											} else if (data.subtype === 'other') {
												delete formEntries[3].disabled;
											}
											
											proceedWithForm(currentScope, formEntries, data, submitAction);
										});
									}, 100);
								}
							},
							{
								type: 'reset',
								label: 'Cancel',
								btn: 'danger',
								action: function () {
									$modalInstance.dismiss('cancel');
									$scope.form.formData = {};
								}
							}
						]
					};
					
					buildForm($scope, $modalInstance, options, function () {
					
					});
				}
			});
		} else {
			formConfig = angular.copy(catalogAppConfig.form.add);
			let groups = [];
			$scope.recipes.forEach(function (oneRecipe) {
				let label = oneRecipe.name;
				if (oneRecipe.subtype) {
					label += " (" + oneRecipe.subtype + ")";
				}
				formConfig.entries[0].value.push({l: label, v: oneRecipe, group: oneRecipe.type});
				
				if (groups.indexOf(oneRecipe.type) === -1) {
					groups.push(oneRecipe.type);
				}
			});
			formConfig.entries[0].groups = groups;
			formConfig.entries[0].onAction = function (id, data, form) {
				let recipeTemplate = data;
				if (typeof recipeTemplate === 'string') {
					recipeTemplate = JSON.parse(data);
				}
				delete recipeTemplate._id;
				delete recipeTemplate.locked;
				$scope.modalInstance.close();
				$timeout(function () {
					formConfig = angular.copy(catalogAppConfig.form.entries);
					$scope.add = true;
					proceedWithForm(currentScope, formConfig, recipeTemplate, submitAction);
				}, 100);
			};
			
			let options = {
				timeout: $timeout,
				form: formConfig,
				name: 'addRecipe',
				label: 'Add New Recipe'
			};
			getConfigurations(function () {
				buildFormWithModal($scope, $modal, options);
			})
		}
	};
	
	$scope.updateRecipe = function (recipe) {
		$scope.add = false;
		let submitAction = {
			method: 'put',
			routeName: '/dashboard/catalog/recipes/update',
			params: {id: recipe._id}
		};
		
		getConfigurations(function (response, error) {
			proceedWithForm($scope, catalogAppConfig.form.entries, recipe, submitAction);
		});
	};
	
	$scope.viewRecipe = function (recipe) {
		proceedWithForm($scope, catalogAppConfig.form.entries, recipe, null);
	};
	
	// function listInfraProviders(currentScope, cb) {
	// 	//get the available providers
	// 	overlayLoading.show();
	// 	getSendDataFromServer(currentScope, ngDataApi, {
	// 		"method": "get",
	// 		"routeName": "/dashboard/infra"
	// 	}, function (error, providers) {
	// 		overlayLoading.hide();
	// 		if (error) {
	// 			currentScope.displayAlert('danger', error.message);
	// 		} else {
	// 			let types = [];
	// 			let infratype = [];
	// 			let vmnfra = [];
	// 			let containerInfra = [];
	// 			let drivers = [];
	// 			currentScope.infraProviders = {};
	// 			currentScope.infraProviders.deploymentTypes = [];
	// 			currentScope.infraProviders.containerInfra = [];
	// 			currentScope.infraProviders.vmInfra = [];
	// 			currentScope.infraProviders.drivers = [];
	//
	// 			providers.forEach((oneProvider) => {
	// 				if (oneProvider.technologies) {
	// 					//adding deployments type
	// 					if (types.indexOf('container') === -1) {
	// 						if (oneProvider.technologies.indexOf('container') !== -1 || oneProvider.technologies.indexOf('docker') !== -1 || oneProvider.technologies.indexOf('kubernetes') !== -1) {
	// 							types.push("container");
	// 							currentScope.infraProviders.deploymentTypes.push({v: "container", l: "container"});
	// 						}
	// 					}
	// 					if (infratype.indexOf("vm") === -1) {
	// 						if (oneProvider.technologies.indexOf('vm') !== 1) {
	// 							infratype.push("vm");
	// 							currentScope.infraProviders.deploymentTypes.push({v: "vm", l: "vm"});
	// 						}
	// 					}
	// 				}
	//
	// 				// adding all the infra for container
	// 				if (oneProvider.technologies.indexOf('container') !== -1 || oneProvider.technologies.indexOf('docker') !== -1 || oneProvider.technologies.indexOf('kubernetes') !== -1) {
	// 					if (containerInfra.indexOf(oneProvider.name) === -1) {
	// 						containerInfra.push(oneProvider.name);
	// 						currentScope.infraProviders.containerInfra.push({
	// 							v: oneProvider.name,
	// 							l: oneProvider.name,
	// 							group: "Container"
	// 						});
	// 					}
	// 					//adding drivers for container type
	// 					oneProvider.technologies.forEach((oneTech) => {
	// 						if (drivers.indexOf(oneTech) === -1) {
	// 							drivers.push(oneTech);
	// 							currentScope.infraProviders.drivers.push({v: "container." + oneTech, l: oneTech})
	// 						}
	// 					});
	// 				}
	// 				// adding the infra for vm
	// 				if (oneProvider.technologies.indexOf('vm') !== -1) {
	// 					if (vmnfra.indexOf(oneProvider.name) === -1) {
	// 						vmnfra.push(oneProvider.name);
	// 						currentScope.infraProviders.vmInfra.push({
	// 							v: oneProvider.name,
	// 							l: oneProvider.name,
	// 							group: "Vm"
	// 						});
	// 					}
	// 				}
	// 			});
	// 			return cb();
	// 		}
	// 	});
	// }
	
	// function restrictionBehavior(id, data, form, currentScope) {
	// 	let type = [form.formData.deploymentType];
	//
	// 	if (type && type.length === 1 && type[0].v === 'vm') {
	// 		form.formData.infra = [];
	//
	// 		if (form.formData.drivers) {
	// 			form.formData.drivers = [];
	// 		}
	// 		if (form.entries[form.entries.length - 1].name === 'infra' && form.entries[form.entries.length - 2].name === 'drivers') {
	// 			form.entries.pop();
	// 			form.entries.pop();
	// 		}
	// 		if (form.entries[form.entries.length - 1].name === 'deploymentType') {
	// 			form.entries.push({
	// 				'name': 'infra',
	// 				'label': 'Infra',
	// 				'type': 'uiselect',
	// 				"multiple": true,
	// 				"value": currentScope.infraProviders.vmInfra,
	// 				'fieldMsg': "Please provide the infra(s)",
	// 			});
	// 		}
	// 	} else {
	// 		if (type && type.length === 1 && type[0].v === 'container') {
	// 			form.formData.infra = [];
	// 			form.formData.drivers = [];
	// 			if (form.entries[form.entries.length - 1].name === 'infra' && form.entries[form.entries.length - 2].name === 'drivers') {
	// 				form.entries.pop();
	// 				form.entries.pop();
	// 			}
	// 			if (form.entries[form.entries.length - 1].name === 'infra' && form.entries[form.entries.length - 2].name !== 'drivers') {
	// 				form.entries.pop();
	// 			}
	// 			if (form.entries[form.entries.length - 1].name === 'deploymentType') {
	// 				form.entries.push({
	// 					'name': 'drivers',
	// 					'label': 'Drivers',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					"value": currentScope.infraProviders.drivers,
	// 					'fieldMsg': "Please provide the driver(s)",
	// 				});
	// 				form.entries.push({
	// 					'name': 'infra',
	// 					'label': 'Infra',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					"value": currentScope.infraProviders.containerInfra,
	// 					'fieldMsg': "Please provide the infra(s)",
	// 				});
	// 			}
	// 		}
	// 	}
	// }
	
	// function restrictionOnLoad($scope, currentScope, data) {
	// 	if (data.restriction && Object.keys(data.restriction).length > 0) {
	// 		listInfraProviders(currentScope, () => {
	// 			//if ($scope.form && $scope.form.entries) {
	// 			//
	// 			$scope.form.entries.push({
	// 				'name': 'deploymentType',
	// 				'label': 'Deployment Type',
	// 				'type': 'uiselect',
	// 				"multiple": false,
	// 				'value': currentScope.infraProviders.deploymentTypes,
	// 				"required": true,
	// 				'fieldMsg': "Please provide the type(s) of deployment",
	// 				onAction(id, data, form) {
	// 					restrictionBehavior(id, data, form, currentScope);
	// 				}
	// 			});
	//
	// 			if (data.restriction.deployment && data.restriction.deployment.indexOf('vm') !== -1 && data.restriction.deployment && data.restriction.deployment.indexOf('container') === -1) {
	// 				$scope.form.entries.push({
	// 					'name': 'infra',
	// 					'label': 'Infra',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					'value': currentScope.infraProviders.vmInfra,
	// 					'fieldMsg': "Please provide the infra(s)",
	// 				});
	// 			}
	// 			if (data.restriction.deployment && data.restriction.deployment.indexOf('container') !== -1 && data.restriction.deployment.indexOf('vm') === -1) {
	// 				$scope.form.entries.push({
	// 					'name': 'drivers',
	// 					'label': 'Drivers',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					'value': currentScope.infraProviders.drivers,
	// 					'fieldMsg': "Please provide the driver(s)",
	// 				});
	// 				$scope.form.entries.push({
	// 					'name': 'infra',
	// 					'label': 'Infra',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					'value': currentScope.infraProviders.containerInfra,
	// 					'fieldMsg': "Please provide the infra(s)",
	// 				});
	// 			}
	// 			if (data.restriction.deployment && data.restriction.deployment.indexOf('container') !== -1 && data.restriction.deployment.indexOf('vm') !== -1) {
	// 				$scope.form.entries.push({
	// 					'name': 'drivers',
	// 					'label': 'Drivers',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					'value': currentScope.infraProviders.drivers,
	// 					'fieldMsg': "Please provide the driver(s)",
	// 				});
	// 				$scope.form.entries.push({
	// 					'name': 'infra',
	// 					'label': 'Infra',
	// 					'type': 'uiselect',
	// 					"multiple": true,
	// 					'value': currentScope.infraProviders.containerInfra.concat(currentScope.infraProviders.vmInfra),
	// 					'fieldMsg': "Please provide the infra(s)",
	// 				});
	// 			}
	// 			//	}
	// 		});
	// 	}
	// }
	
	$scope.deleteRecipe = function (recipe, versioning) {
		let params = {
			id: recipe._id
		};
		if (versioning) {
			params.id = recipe.refId;
			params.version = recipe.v;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/catalog/recipes/delete',
			params: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Recipe deleted successfully');
				$scope.listRecipes();
			}
		});
	};
	
	$scope.go = function (path, method) {
		if (path) {
			$cookies.put("method", method, {'domain': interfaceDomain});
			$location.path(path);
		}
	};
	
	injectFiles.injectCss("modules/dashboard/catalogs/catalog.css");
	
	// Start here
	if ($scope.access.list) {
		$scope.listRecipes();
	}
	
}]);

// fix the drivers issue

catalogApp.filter('capitalizeFirst', function () {
	return function (input) {
		if (input && typeof input === 'string' && input.length > 0) {
			return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
		}
	}
});
