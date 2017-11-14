"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$cookies', 'ngDataApi', 'Upload', 'injectFiles', '$localStorage', '$window', function ($scope, $timeout, $modal, $routeParams, $cookies, ngDataApi, Upload, injectFiles, $localStorage, $window) {
	$scope.$parent.isUserLoggedIn();
	$scope.newEntry = true;
	$scope.envId = null;
	$scope.formEnvironment = { services: {} };
	$scope.formEnvironment.config_loggerObj = '';
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	function putMyEnv(record) {
		var data = {
			"_id": record._id,
			"code": record.code,
			"sensitive": record.sensitive,
			"domain": record.domain,
			"profile": record.profile,
			"sitePrefix": record.sitePrefix,
			"apiPrefix": record.apiPrefix,
			"description": record.description,
			"deployer": record.deployer
		};
		$cookies.putObject('myEnv', data, { 'domain': interfaceDomain });
	}
	
	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};
	
	$scope.jsonEditor = {
		custom: {
			data: ""
		},
		logger: {
			data: ""
		}
	};
	
	$scope.generateNewMsg = function (env, type, msg) {
		$scope.grid.rows.forEach(function (oneEnvRecord) {
			if (oneEnvRecord.code === env) {
				oneEnvRecord.hostInfo = {
					waitMessage: {
						"type": type,
						"message": msg
					}
				};
				
				$timeout(function () {
					oneEnvRecord.hostInfo.waitMessage.message = '';
					oneEnvRecord.hostInfo.waitMessage.type = '';
				}, 7000);
			}
		});
	};
	
	$scope.closeWaitMessage = function (context) {
		if (!context) {
			context = $scope;
		}
		context.waitMessage.message = '';
		context.waitMessage.type = '';
	};
	
	$scope.listEnvironments = function (environmentId) {
		if (environmentId) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment",
				"params": {
					"id": environmentId
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$scope.envId = environmentId;
					$scope.newEntry = false;
					$scope.formEnvironment = response;
					if (!$scope.formEnvironment.services.config.session.hasOwnProperty('proxy')) {
						$scope.formEnvironment.services.config.session.proxy = undefined;
					}
					
					if ($scope.formEnvironment.services && $scope.formEnvironment.services.config) {
						if ($scope.formEnvironment.services.config.logger) {
							$scope.formEnvironment.config_loggerObj = JSON.stringify($scope.formEnvironment.services.config.logger, null, 2);
							$scope.jsonEditor.logger.data = $scope.formEnvironment.config_loggerObj;
							$scope.jsonEditor.logger.editor.setValue($scope.jsonEditor.logger.data);
							fixEditorHeigh($scope.jsonEditor.logger.editor)
						}
					}
					
					$scope.waitMessage.message = '';
					$scope.waitMessage.type = '';
					$scope.formEnvironment.services.config.session.unset = ($scope.formEnvironment.services.config.session.unset === 'keep') ? false : true;
				}
			});
		}
		else {
			var options = {
				"method": "get",
				"routeName": "/dashboard/environment/list",
				"params": {}
			};
			getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$localStorage.environments = angular.copy(response);
					var myEnvCookie = $cookies.getObject('myEnv', { 'domain': interfaceDomain });
					var found = false;
					var newList = [];
					if (myEnvCookie) {
						for (var i = response.length - 1; i >= 0; i--) {
							if (response[i].code === myEnvCookie.code) {
								newList.push(response[i]);
								found = true;
							}
						}
					}
					if (!found) {
						newList = response[0];
					}
					$scope.grid = { rows: newList };
					if ($scope.grid.rows && $scope.grid.rows.length) {
						$scope.jsonEditor.custom.data = JSON.stringify($scope.grid.rows[0].custom, null, 2);
					}
				}
			});
		}
	};
	
	$scope.customLoaded = function (_editor) {
		$scope.jsonEditor.custom.editor = _editor;
		// _editor.$blockScrolling = Infinity;
		_editor.setValue($scope.jsonEditor.custom.data);
		fixEditorHeigh(_editor);
	};
	
	$scope.editorLoaded = function (_editor) {
		//bug in jsoneditor: setting default mode to 'code' does not display data
		//to fix this, use another mode, load data, wait, switch mode, wait, start listener to validate json object
		$scope.jsonEditor.logger.editor = _editor;
		// _editor.$blockScrolling = Infinity;
		_editor.setValue("");
		fixEditorHeigh(_editor);
	};
	
	function fixEditorHeigh(_editor) {
		_editor.$blockScrolling = Infinity;
		_editor.scrollToLine(0, true, true);
		_editor.scrollPageUp();
		_editor.clearSelection();
		_editor.setShowPrintMargin(false);
	}
	
	$scope.getDeploymentMode = function (deployer, value) {
		if (!deployer.ui) {
			deployer.ui = {};
		}
		deployer.ui[value] = (deployer.type === value);
	};
	
	$scope.getDeploymentDriver = function (deployer, value, technology, type) {
		deployer.ui[value] = (deployer.selected === technology + '.' + value);
	};
	
	function getEnvironments(newEnvRecord, cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/key/permission/get"
		}, function (error, response) {
			if (error) {
				$localStorage.soajs_user = null;
				$cookies.remove('soajs_auth', { 'domain': interfaceDomain });
				$cookies.remove('soajs_dashboard_key', { 'domain': interfaceDomain });
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.environments = response.environments;
				if (newEnvRecord) {
					putMyEnv(newEnvRecord);
				}
				else {
					if (response.environments.length) {
						// not dashboard
						putMyEnv(response.environments[0]);
					} else {
						$cookies.remove('myEnv', { 'domain': interfaceDomain });
					}
				}
				$scope.$parent.reRenderMenu('deployment');
				return cb();
			}
		});
	}
	
	$scope.updateEnvironment = function (data) {
		$scope.$parent.go('/environments/environment/' + data._id);
	};
	
	$scope.save = function () {
		var postData = angular.copy($scope.formEnvironment);
		
		if (typeof($scope.formEnvironment.services.config.session.proxy) === 'undefined') {
			postData.services.config.session.proxy = 'undefined';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === false) {
			postData.services.config.session.proxy = 'false';
		}
		else if ($scope.formEnvironment.services.config.session.proxy === true) {
			postData.services.config.session.proxy = 'true';
		}
		delete postData.dbs;
		postData.services.config.oauth.grants = ['password', 'refresh_token'];
		
		postData.services.config.agent = {
			"topologyDir": "/opt/soajs/"
		};
		
		if ($scope.formEnvironment.config_loggerObj) {
			try {
				postData.services.config.logger = JSON.parse($scope.jsonEditor.logger.data);
			}
			catch (e) {
				$scope.displayAlert('danger', 'Logger Config: Invalid JSON Object');
				return;
			}
		}
		
		postData.services.config.session.unset = (postData.services.config.session.unset) ? "destroy" : "keep";
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": (($scope.newEntry) ? "post" : "put"),
			"routeName": "/dashboard/environment/" + (($scope.newEntry) ? "add" : "update"),
			"params": ($scope.newEntry) ? {} : { "id": $scope.envId },
			"data": postData
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				var successMessage = translation.environment[LANG] + ' ' + (($scope.newEntry) ? translation.created[LANG] : translation.updated[LANG]) + ' ' + translation.successfully[LANG];
				$scope.$parent.displayAlert('success', successMessage);
			}
		});
	};
	
	$scope.UpdateTenantSecurity = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/environment/key/update",
			"params": { "id": $scope.envId },
			"data": {
				'algorithm': $scope.formEnvironment.services.config.key.algorithm,
				'password': $scope.formEnvironment.services.config.key.password
			}
		}, function (error, response) {
			if (error) {
				$scope.waitMessage.type = 'danger';
				$scope.waitMessage.message = getCodeMessage(error.code, 'dashboard', error.message);
			}
			else {
				if (response.newKeys) {
					$scope.newKeys = [];
					for (var app in response.newKeys) {
						response.newKeys[app].newKeys.forEach(function (oneKey) {
							oneKey.extKeys.forEach(function (oneExtKey) {
								if (!oneExtKey.deprecated) {
									$scope.newKeys.push({
										appPackage: response.newKeys[app].package,
										key: oneKey.key,
										extKey: oneExtKey.extKey
									});
								}
							});
						});
					}
					
					var currentScope = $scope;
					var keyUpdateSuccess = $modal.open({
						templateUrl: 'keyUpdateSuccess.tmpl',
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope) {
							fixBackDrop();
							$scope.currentScope = currentScope;
							
							$scope.reloadDashboard = function () {
								location.reload(true);
								keyUpdateSuccess.close();
							};
						}
					});
				}
				else {
					$scope.$parent.displayAlert('success', translation.keySecurityHasBeenUpdated[LANG]);
				}
			}
		});
	};
	
	$scope.removeEnvironment = function (row) {
		
		function deletePortalProductsAndTenants(deleteCb) {
			if (row.code === 'PORTAL') {
				let purgeall = $window.confirm("The following Environment has a product and a tenant associated to it.\n Do you want to remove them as well ?");
				
				if (purgeall) {
					//remove product portal
					getSendDataFromServer($scope, ngDataApi, {
						"method": "delete",
						"routeName": "/dashboard/product/delete",
						"params": { "code": "PRTAL" }
					}, function (error) {
						if (error) {
							deleteCb(error);
						}
						else {
							//remove tenant portal
							getSendDataFromServer($scope, ngDataApi, {
								"method": "delete",
								"routeName": "/dashboard/tenant/delete",
								"params": { "code": "PRTL" }
							}, function (error) {
								if (error) {
									deleteCb(error);
								} else {
									deleteCb(false);
								}
							});
						}
					});
				} else {
					deleteCb();
				}
			} else {
				deleteCb();
			}
		}
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/delete",
			"params": { "id": row['_id'] }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (response) {
					deletePortalProductsAndTenants(function (error) {
						if (error) {
							$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
						} else {
							$scope.$parent.displayAlert('success', translation.selectedEnvironmentRemoved[LANG]);
						}
						
						getEnvironments(null, function () {
							$scope.listEnvironments();
						});
					});
				}
				else {
					$scope.$parent.displayAlert('danger', translation.unableRemoveSelectedEnvironment[LANG]);
				}
			}
		});
		
	};

	$scope.startLimit = 0;
	$scope.totalCount = 0;
	$scope.endLimit = environmentsConfig.customRegistryIncrement;
	$scope.increment = environmentsConfig.customRegistryIncrement;
	$scope.showNext = true;
	
	$scope.getPrev = function () {
		$scope.startLimit = $scope.startLimit - $scope.increment;
		if (0 <= $scope.startLimit) {
			$scope.listCustomRegistry();
			$scope.showNext = true;
		}
		else {
			$scope.startLimit = 0;
		}
	};
	
	$scope.getNext = function () {
		var startLimit = $scope.startLimit + $scope.increment;
		if (startLimit < $scope.totalCount) {
			$scope.startLimit = startLimit;
			$scope.listCustomRegistry();
		}
		else {
			$scope.showNext = false;
		}
	};
	
	$scope.getLast = function () {
		$scope.startLimit = $scope.totalCount - ($scope.totalCount % $scope.increment);
		$scope.listCustomRegistry();
		$scope.showNext = false;
	};
	
	$scope.getFirst = function () {
		$scope.startLimit = 0;
		$scope.listCustomRegistry();
		if ($scope.increment < $scope.totalCount) {
			$scope.showNext = true;
		}
	};
	
	$scope.listCustomRegistry = function (cb) {
		$scope.oldStyle = false;
		if ($scope.envCode) {
			getEnvironment(function () {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, {
					method: 'get',
					routeName: '/dashboard/customRegistry/list',
					params: {
						env: $scope.envCode.toUpperCase(),
						start: $scope.startLimit,
						end: $scope.endLimit
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						$scope.displayAlert('danger', error.message);
					}
					else {
						$scope.totalCount = response.count;
						var nextLimit = $scope.startLimit + $scope.increment;
						$scope.showNext = ($scope.totalCount > nextLimit);
						
						$scope.customRegistries = { list: response.records };
						$scope.customRegistries.original = angular.copy($scope.customRegistries.list); //keep a copy of the original customRegistry records
						
						$scope.customRegistries.list.forEach(function (oneCustomRegistry) {
							if (oneCustomRegistry.created === $scope.envCode.toUpperCase()) {
								oneCustomRegistry.allowEdit = true;
							}
						});
						if (cb) {
							return cb();
						}
					}
				});
			});
		}
		else {
			if (cb) {
				return cb();
			}
		}
		
		function getEnvironment(cb) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment",
				"params": {
					"code": $scope.envCode.toUpperCase()
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if (response.custom && Object.keys(response.custom).length > 0) {
						$scope.oldStyle = true;
					}
					return cb();
				}
			});
		}
	};
	
	$scope.manageCustomRegistry = function (customRegistry, action) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "addEditCustomRegistry.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.formData = {};
				$scope.envs = [];
				$scope.message = {};
				$scope.recipes = [];
				$scope.access = currentScope.access;
				$scope.textMode = false;
				let allowEdit = ((action === 'add') || (action === 'update' && customRegistry.permission && customRegistry.created.toUpperCase() === currentScope.envCode.toUpperCase()));
				$scope.allowEdit = allowEdit;
				const aceCustomRegistry = {
					"name": 'customRegistry',
					"height": '16px',
					"firstTime": true
				};
				$scope.options = {
					envCode: currentScope.envCode,
					formAction: action,
					aceEditorConfig: {
						maxLines: Infinity,
						minLines: 1,
						useWrapMode: true,
						showGutter: true,
						mode: 'json',
						firstLineNumber: 1,
						onLoad: function (_editor) {
							_editor.$blockScrolling = Infinity;
							_editor.scrollToLine(0, true, true);
							_editor.scrollPageUp();
							_editor.clearSelection();
							_editor.setShowPrintMargin(false);
							_editor.setHighlightActiveLine(false);
							$scope.editor = _editor;
							const heightUpdateFunction = function () {
								let newHeight =
									_editor.getSession().getScreenLength()
									* _editor.renderer.lineHeight
									+ _editor.renderer.scrollBar.getWidth();
								
								if (aceCustomRegistry.fixedHeight) {
									newHeight = parseInt(aceCustomRegistry.height);
								}
								else if (parseInt(aceCustomRegistry.height) && parseInt(aceCustomRegistry.height) > newHeight) {
									newHeight = parseInt(aceCustomRegistry.height);
								}
								try {
									if ($scope.formData && $scope.formData.value && aceCustomRegistry.firstTime) {
										aceCustomRegistry.firstTime = false;
										let screenLength = 1;
										if (typeof JSON.parse($scope.formData.value) === 'object') {
											_editor.session.setMode("ace/mode/json");
											screenLength = Object.keys(JSON.parse($scope.formData.value)).length * 16;
											if (screenLength > 1) {
												screenLength += 32;
											}
										} else {
											$scope.textMode = true;
											_editor.session.setMode("ace/mode/text");
											screenLength = 16;
										}
										if (screenLength > newHeight) {
											newHeight = screenLength;
										}
									} else {
										aceCustomRegistry.firstTime = false;
									}
								} catch (e) {
									$scope.textMode = true;
									_editor.session.setMode("ace/mode/text");
									aceCustomRegistry.firstTime = false;
								}
								_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
								_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
								$timeout(function () {
									jQuery('#' + aceCustomRegistry.name).height(newHeight.toString());
									_editor.resize(true);
								}, 5);
							};
							heightUpdateFunction();
							$timeout(function () {
								_editor.heightUpdate = heightUpdateFunction();
								// Set initial size to match initial content
								heightUpdateFunction();
								
								// Whenever a change happens inside the ACE editor, update
								// the size again
								_editor.getSession().on('change', heightUpdateFunction);
							}, 2000);
						}
					},
					allowEdit: allowEdit
				};
				
				$scope.title = 'Add New Custom Registry';
				if (action === 'update' && $scope.options.allowEdit) {
					$scope.title = 'Update ' + customRegistry.name;
				}
				else if (!allowEdit) {
					$scope.title = 'View ' + customRegistry.name;
				}
				
				$scope.displayAlert = function (type, message) {
					$scope.message[type] = message;
					setTimeout(function () {
						$scope.message = {};
					}, 5000);
				};
				
				$scope.getEnvs = function () {
					if ($scope.envs && $scope.envs.list && $scope.envs.list.length > 0) {
						return;
					}
					
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/environment/list'
					}, function (error, envs) {
						overlayLoading.hide();
						if (error) {
							$scope.displayAlert('danger', error.message);
						}
						else {
							$scope.envs.list = [];
							envs.forEach(function (oneEnv) {
								//in case of update customRegistry, check customRegistry record to know what env it belongs to
								if (customRegistry && customRegistry.created) {
									if (customRegistry.created.toUpperCase() === oneEnv.code.toUpperCase()) return;
								}
								//in case of add customRegistry, check current environment
								else if (currentScope.envCode.toUpperCase() === oneEnv.code.toUpperCase()) {
									return;
								}
								
								var envEntry = {
									code: oneEnv.code,
									description: oneEnv.description,
									selected: (customRegistry && customRegistry.sharedEnv && customRegistry.sharedEnv[oneEnv.code.toUpperCase()])
								};
								
								if (customRegistry && customRegistry.shared && action === 'update') {
									if (customRegistry.sharedEnv) {
										envEntry.selected = (customRegistry.sharedEnv[oneEnv.code.toUpperCase()]);
									}
									else {
										//shared with all envs
										envEntry.selected = true;
										$scope.envs.sharedWithAll = true;
									}
								}
								
								$scope.envs.list.push(envEntry);
							});
						}
					});
				};
				
				$scope.fillForm = function () {
					$scope.formData = angular.copy(customRegistry);
					$scope.getEnvs();
					//ace editor cannot take an object or array as model
					if (typeof $scope.formData.value !== "string") {
						$scope.formData.value = JSON.stringify($scope.formData.value, null, 2);
					}
				};
				
				$scope.toggleShareWithAllEnvs = function () {
					if ($scope.envs.sharedWithAll) {
						$scope.envs.list.forEach(function (oneEnv) {
							oneEnv.selected = true;
						});
					}
					return;
				};
				
				$scope.save = function (cb) {
					if (!$scope.options.allowEdit) {
						$scope.displayAlert('warning', 'Configuring this Custom Registry is only allowed in the ' + $scope.formData.created + ' environment');
						return;
					}
					
					if ($scope.formData.deployOptions && $scope.formData.deployOptions.custom) {
						$scope.formData.deployOptions.custom.type = 'customRegistry';
					}
					
					saveCustomRegistry(function () {
						if (cb) return cb();
						
						$scope.formData = {};
						$modalInstance.close();
						if ($scope.access.customRegistry.list) {
							if ($scope.options.formAction === 'add') {
								currentScope.getLast();
							} else {
								currentScope.listCustomRegistry();
							}
						}
					});
					
					function saveCustomRegistry(cb) {
						var saveOptions = {
							name: $scope.formData.name,
							locked: $scope.formData.locked || false,
							plugged: $scope.formData.plugged || false,
							shared: $scope.formData.shared || false
						};
						if (Object.hasOwnProperty.call($scope.formData, "value")) {
							if ($scope.textMode) {
								saveOptions.value = $scope.formData.value;
							} else {
								try {
									saveOptions.value = JSON.parse($scope.formData.value);
								} catch (e) {
									return $scope.displayAlert('danger', 'Custom Registry: Invalid JSON Object');
								}
							}
						}
						if ($scope.formData.shared && !$scope.envs.sharedWithAll) {
							saveOptions.sharedEnv = {};
							$scope.envs.list.forEach(function (oneEnv) {
								if (oneEnv.selected) {
									saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
								}
							});
						}
						
						var options = {};
						if ($scope.options.formAction === 'add') {
							options = {
								method: 'post',
								routeName: '/dashboard/customRegistry/add',
								data: {
									env: $scope.options.envCode.toUpperCase(),
									customRegEntry: saveOptions
								}
							};
						}
						else {
							options = {
								method: 'put',
								routeName: '/dashboard/customRegistry/update',
								params: {
									env: $scope.options.envCode.toUpperCase(),
									id: $scope.formData._id
								},
								data: {
									customRegEntry: saveOptions
								}
							};
						}
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							}
							else {
								$scope.newcustomRegistry = result;
								$scope.displayAlert('success', 'Custom Registry updated successfully');
								return cb();
							}
						});
					}
				};
				
				$scope.cancel = function () {
					$modalInstance.close();
					if ($scope.form && $scope.form.formData) {
						$scope.form.formData = {};
					}
				};
				
				$scope.enableTextMode = function () {
					$scope.textMode = !$scope.textMode;
					if ($scope.textMode) {
						$scope.editor.session.setMode("ace/mode/text");
					} else {
						$scope.editor.session.setMode("ace/mode/json");
					}
				};
				
				$scope.fillForm();
			}
		});
	};
	
	$scope.deleteCustomRegistry = function (customRegistry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/customRegistry/delete',
			params: {
				env: $scope.envCode.toUpperCase(),
				id: customRegistry._id
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Custom Registry deleted successfully');
				if ($scope.access.customRegistry.list) {
					$scope.listCustomRegistry();
				}
			}
		});
	};
	
	$scope.togglePlugCustomRegistry = function (customRegistry, plug) {
		var customRegistryRecord = {};
		//get the original customRegistry record
		for (var i = 0; i < $scope.customRegistries.original.length; i++) {
			if ($scope.customRegistries.original[i]._id === customRegistry._id) {
				customRegistryRecord = angular.copy($scope.customRegistries.original[i]);
				break;
			}
		}
		
		var customRegistryId = customRegistryRecord._id;
		delete customRegistryRecord._id;
		delete customRegistryRecord.created;
		delete customRegistryRecord.author;
		delete customRegistryRecord.permission;
		customRegistryRecord.plugged = plug;
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/customRegistry/update',
			params: {
				env: $scope.envCode.toUpperCase(),
				id: customRegistryId
			},
			data: {
				customRegEntry: customRegistryRecord
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Custom Registry updated successfully');
				if ($scope.access.customRegistry.list) {
					$scope.listCustomRegistry();
				}
			}
		});
	};
	
	$scope.upgradeCustomRegistry = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/customRegistry/upgrade',
			params: {
				env: $scope.envCode.toUpperCase()
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', "Custom Registry have been upgraded to the latest version.");
				if ($scope.access.customRegistry.list) {
					$scope.listCustomRegistry();
				}
			}
		});
	};
	
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
	//default operation
	if ($routeParams.id) {
		if ($scope.access.editEnvironment) {
			$scope.listEnvironments($routeParams.id);
		}
	}
	else {
		if ($scope.access.listEnvironments) {
			$scope.listEnvironments(null);
		}
	}
	if ($scope.access.customRegistry.list) {
		if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
			$scope.envCode = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
		}
		$scope.listCustomRegistry();
	}
}]);

environmentsApp.filter('customRegSearch', function () {
	return function (input, searchKeyword) {
		if (!searchKeyword) return input;
		if (!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function (oneInput) {
			if (oneInput) {
				if ((oneInput.name && oneInput.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) || (oneInput.author && oneInput.author.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1)) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});
