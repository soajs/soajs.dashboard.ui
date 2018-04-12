"use strict";
var customRegistryServices = soajsApp.components;
customRegistryServices.service('customRegistrySrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function listCustomRegistry (currentScope, cb) {
		currentScope.oldStyle = false;
		if (currentScope.envCode) {
			getEnvironment(function () {
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'get',
					routeName: '/dashboard/customRegistry/list',
					params: {
						env: currentScope.envCode.toUpperCase(),
						start: currentScope.startLimit,
						end: currentScope.endLimit
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', error.message);
					}
					else {
						currentScope.totalCount = response.count;
						var nextLimit = currentScope.startLimit + currentScope.increment;
						currentScope.showNext = (currentScope.totalCount > nextLimit);
						
						currentScope.customRegistries = { list: response.records };
						currentScope.customRegistries.original = angular.copy(currentScope.customRegistries.list); //keep a copy of the original customRegistry records
						
						currentScope.customRegistries.list.forEach(function (oneCustomRegistry) {
							if (oneCustomRegistry.created === currentScope.envCode.toUpperCase()) {
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
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment",
				"params": {
					"code": currentScope.envCode.toUpperCase()
				}
			}, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					if (response.custom && Object.keys(response.custom).length > 0) {
						currentScope.oldStyle = true;
					}
					return cb();
				}
			});
		}
	}
	
	function manageCustomRegistry ($scope, customRegistry, action) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "addEditCustomRegistry.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				function cancel() {
					if($modalInstance){
						$modalInstance.close();
					}
					if ($scope.form && $scope.form.formData) {
						$scope.form.formData = {};
					}
				}
				
				function save(saveOptions, cb){
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
				
				internalCustomRegistryFormManagement($scope, currentScope.envCode, $modalInstance, customRegistry, action, save, cancel, currentScope.access, currentScope.getLast, currentScope.listCustomRegistry);
			}
		});
	}
	
	function internalCustomRegistryFormManagement($scope, envCode, $modalInstance, customRegistry, action, saveMethod, cancelMethod, access, getLast, listCustomRegistry){
		$scope.formData = {};
		$scope.envs = {};
		$scope.message = {};
		$scope.recipes = [];
		$scope.access = access;
		$scope.textMode = (customRegistry && customRegistry.value && typeof(customRegistry.value) !== 'object');
		
		if(customRegistry && customRegistry.value && typeof(customRegistry.value) === 'object'){
			customRegistry.value = JSON.stringify(customRegistry.value, null, 2);
		}
		$scope.formData = angular.copy(customRegistry);
		
		let allowEdit = ((action === 'add') || (action === 'update' && customRegistry.permission && customRegistry.created.toUpperCase() === envCode.toUpperCase()));
		$scope.allowEdit = allowEdit;
		let aceCustomRegistry = {
			"name": 'customRegistry',
			"height": '16px',
			"firstTime": true
		};
		$scope.options = {
			envCode: envCode,
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
			$scope.envs = {};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment/list'
			}, function (error, envs) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					let list = [];
					envs.forEach(function (oneEnv) {
						//in case of update customRegistry, check customRegistry record to know what env it belongs to
						if (customRegistry && customRegistry.created) {
							if (customRegistry.created.toUpperCase() === oneEnv.code.toUpperCase()) return;
						}
						//in case of add customRegistry, check current environment
						else if (envCode.toUpperCase() === oneEnv.code.toUpperCase()) {
						
						}
						
						let envEntry = {
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
						
						list.push(envEntry);
					});
					if(list.length > 0){
						$scope.envs.list = angular.copy(list);
					}
				}
			});
		};
		
		$scope.fillForm = function () {
			$scope.getEnvs();
		};
		
		$scope.toggleShareWithAllEnvs = function () {
			if ($scope.envs.sharedWithAll) {
				$scope.envs.list.forEach(function (oneEnv) {
					oneEnv.selected = true;
				});
			}
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
				if($modalInstance){
					$modalInstance.close();
					
					if ($scope.access.customRegistry.list) {
						if ($scope.options.formAction === 'add') {
							getLast();
						} else {
							listCustomRegistry();
						}
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
					$scope.formData.textMode = $scope.textMode;
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
					$scope.formData.sharedEnv = {};
					$scope.envs.list.forEach(function (oneEnv) {
						if (oneEnv.selected) {
							saveOptions.sharedEnv[oneEnv.code.toUpperCase()] = true;
							$scope.formData.sharedEnv[oneEnv.code.toUpperCase()] = true;
						}
					});
				}
				
				if(saveMethod && typeof saveMethod === 'function'){
					saveMethod(saveOptions, cb);
				}
			}
		};
		
		$scope.cancel = cancelMethod;
		
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
	
	function deleteCustomRegistry(currentScope, customRegistry) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/customRegistry/delete',
			params: {
				env: currentScope.envCode.toUpperCase(),
				id: customRegistry._id
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Custom Registry deleted successfully');
				if (currentScope.access.customRegistry.list) {
					currentScope.listCustomRegistry();
				}
			}
		});
	}
	
	function togglePlugCustomRegistry(currentScope, customRegistry, plug) {
		var customRegistryRecord = {};
		//get the original customRegistry record
		for (var i = 0; i < currentScope.customRegistries.original.length; i++) {
			if (currentScope.customRegistries.original[i]._id === customRegistry._id) {
				customRegistryRecord = angular.copy(currentScope.customRegistries.original[i]);
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
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/customRegistry/update',
			params: {
				env: currentScope.envCode.toUpperCase(),
				id: customRegistryId
			},
			data: {
				customRegEntry: customRegistryRecord
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Custom Registry updated successfully');
				if (currentScope.access.customRegistry.list) {
					currentScope.listCustomRegistry();
				}
			}
		});
	}
	
	function upgradeCustomRegistry(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/customRegistry/upgrade',
			params: {
				env: currentScope.envCode.toUpperCase()
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', "Custom Registry have been upgraded to the latest version.");
				if (currentScope.access.customRegistry.list) {
					currentScope.listCustomRegistry();
				}
			}
		});
	}
	
	return {
		"listCustomRegistry": listCustomRegistry,
		"manageCustomRegistry": manageCustomRegistry,
		"deleteCustomRegistry": deleteCustomRegistry,
		"togglePlugCustomRegistry": togglePlugCustomRegistry,
		"upgradeCustomRegistry": upgradeCustomRegistry,
		"internalCustomRegistryFormManagement": internalCustomRegistryFormManagement
	}
}]);