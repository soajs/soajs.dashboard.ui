"use strict";
let registryApp = soajsApp.components;
registryApp.controller('registryCtrl', ['$scope', '$cookies', 'ngDataApi', 'injectFiles', 'throttlingSrv', '$routeParams', '$timeout', '$modal',
	function ($scope, $cookies, ngDataApi, injectFiles, throttlingSrv, $routeParams, $timeout, $modal) {
		$scope.$parent.isUserLoggedIn();
		$scope.access = {};
		constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
		
		function openModal(options) {
			let currentScope = $scope;
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry/resource",
				"params": {
					"env": $scope.envCode,
					"type": "cluster"
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$modal.open({
						templateUrl: options.templateUrl,
						size: 'lg',
						backdrop: true,
						keyboard: true,
						controller: function ($scope, $modalInstance) {
							$scope.formData = {};
							$scope.access = currentScope.access;
							$scope.clusters = response || null;
							$scope.message = {};
							
							// For edit
							if (options.item) {
								$scope.formData = options.item;
							}
							
							fixBackDrop();
							overlayLoading.show();
							$scope.displayAlert = function (type, message) {
								$scope.message[type] = message;
								setTimeout(function () {
									$scope.message = {};
								}, 5000);
							};
							$scope.cancel = function () {
								if ($modalInstance) {
									$modalInstance.close();
								}
							};
							$scope.submit = function () {
								if (options.submit) {
									options.submit($scope, $modalInstance);
								}
							};
							let aceCustomRegistry = {
								"name": 'customRegistry',
								"height": '16px',
								"firstTime": true
							};
							$scope.options = {
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
											if ($scope.formData && aceCustomRegistry.firstTime) {
												aceCustomRegistry.firstTime = false;
												let screenLength = 1;
												if (screenLength > newHeight) {
													newHeight = screenLength;
												}
											} else {
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
								}
							};
							overlayLoading.hide();
						}
					});
				}
			});
		}
		
		$scope.updateThrottling = function (throttling) {
			throttlingSrv.update($scope, $scope.envCode, throttling);
		};
		$scope.addThrottlingStrategy = function (throttling) {
			throttlingSrv.addStrategy($scope, $scope.envCode, throttling);
		};
		$scope.updateThrottlingStrategy = function (throttling, strategy) {
			throttlingSrv.updateStrategy($scope, $scope.envCode, throttling, strategy);
		};
		$scope.removeThrottlingStrategy = function (throttling, strategy) {
			throttlingSrv.removeStrategy($scope, $scope.envCode, throttling, strategy);
		};
		
		$scope.updateDbPrefix = function (code, prefix) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/console/registry/db/prefix",
				"data": {
					"env": code,
					"prefix": prefix || ""
				}
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'DB prefix updated successfully');
				}
			});
		};
		$scope.removeDatabase = function (code, dbName) {
			if (dbName === 'session') {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "delete",
					"routeName": "/console/registry/db/session",
					"data": {
						"env": code
					}
				}, function (error) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
					}
					else {
						delete $scope.registry.dbs.session;
						$scope.$parent.displayAlert('success', 'DB deleted successfully');
					}
				});
			} else {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "delete",
					"routeName": "/console/registry/db/custom",
					"data": {
						"env": code,
						"name": dbName
					}
				}, function (error) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
					}
					else {
						delete $scope.registry.dbs.databases[dbName];
						$scope.$parent.displayAlert('success', 'DB deleted successfully');
					}
				});
			}
		};
		$scope.editSessionDatabase = function () {
			let options = {
				"templateUrl": "session.tmpl",
				"item": $scope.registry.dbs.session || {},
				"submit": function (modalScope, modalInstance) {
					if (modalInstance) {
						modalInstance.close();
					}
				}
			};
			openModal(options);
		};
		$scope.addDatabase = function () {
			let options = {
				"templateUrl": "db.tmpl",
				"submit": function (modalScope, modalInstance) {
					if (!modalScope.formData.name || !modalScope.formData.cluster) {
						modalScope.displayAlert('danger', "Please fill in all required fields!");
					} else {
						getSendDataFromServer(modalScope, ngDataApi, {
							"method": "post",
							"routeName": "/console/registry/db/custom",
							"data": {
								"env": $scope.envCode,
								"prefix": modalScope.formData.prefix || null,
								"name": modalScope.formData.name,
								"cluster": modalScope.formData.cluster,
								"tenantSpecific": !!modalScope.formData.tenantSpecific
							}
						}, function (error) {
							if (error) {
								modalScope.displayAlert('danger', error.message);
							}
							else {
								$scope.registry.dbs.databases[modalScope.formData.name] = {
									"prefix": modalScope.formData.prefix || null,
									"cluster": modalScope.formData.cluster,
									"tenantSpecific": !!modalScope.formData.tenantSpecific
								};
								modalScope.displayAlert('success', "Database has been added.");
								$scope.$parent.displayAlert('success', "Database has been added.");
								if (modalInstance) {
									modalInstance.close();
								}
							}
						});
					}
				}
			};
			openModal(options);
		};
		
		
		$scope.getRegistry = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry",
				"params": {
					"env": $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.registry = response || null;
					if (response) {
						$scope.registry._url = response.protocol + "://";
						if (response.apiPrefix) {
							$scope.registry._url += response.apiPrefix + ".";
						}
						$scope.registry._url += response.domain + ":" + response.port;
					}
					throttlingSrv.get($scope, $scope.envCode, (error, response) => {
						$scope.throttling = response.throttling;
						$scope.throttlingStrategies = response.throttlingStrategies;
					});
				}
			});
		};
		$scope.updateRegisrty = function (data) {
			$scope.$parent.go('/registry/' + data.code);
		};
		
		$scope.editRegistry = function (code) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry",
				"params": {
					"env": code
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.formEnvironment = response;
					if ($scope.formEnvironment.services && $scope.formEnvironment.services.config) {
						if ($scope.formEnvironment.services.config.logger) {
							$scope.formEnvironment.config_loggerObj = JSON.stringify($scope.formEnvironment.services.config.logger, null, 2);
							$scope.jsonEditor.logger.data = $scope.formEnvironment.config_loggerObj;
							$scope.jsonEditor.logger.editor.setValue($scope.jsonEditor.logger.data);
							fixEditorHeigh($scope.jsonEditor.logger.editor)
						}
					}
				}
			});
		};
		$scope.save = function () {
			let postData = angular.copy($scope.formEnvironment);
			try {
				postData.services.config.logger = JSON.parse($scope.jsonEditor.logger.data);
			}
			catch (e) {
				$scope.displayAlert('danger', 'Logger Config: Invalid JSON Object');
				return;
			}
			let data = {
				"domain": postData.domain,
				"sitePrefix": postData.sitePrefix,
				"apiPrefix": postData.apiPrefix,
				"port": postData.port,
				"protocol": postData.protocol,
				"description": postData.description,
				"services": {
					"controller": {
						"authorization": postData.services.controller.authorization,
						"requestTimeout": postData.services.controller.requestTimeout,
						"requestTimeoutRenewal": postData.services.controller.requestTimeoutRenewal
					},
					"config": {
						"awareness": {
							"cacheTTL": postData.services.config.awareness.cacheTTL,
							"healthCheckInterval": postData.services.config.awareness.healthCheckInterval,
							"autoRelaodRegistry": postData.services.config.awareness.autoRelaodRegistry,
							"maxLogCount": postData.services.config.awareness.maxLogCount,
							"autoRegisterService": postData.services.config.awareness.autoRegisterService
						},
						"logger": postData.services.config.logger,
						"ports": {
							"controller": postData.services.config.ports.controller,
							"maintenanceInc": postData.services.config.ports.maintenanceInc,
							"randomInc": postData.services.config.ports.randomInc
						},
						"oauth": {
							"accessTokenLifetime": postData.services.config.oauth.accessTokenLifetime,
							"refreshTokenLifetime": postData.services.config.oauth.refreshTokenLifetime,
							"debug": postData.services.config.oauth.debug,
							"getUserFromToken": postData.services.config.oauth.getUserFromToken
						},
						"cors": postData.services.config.cors
					}
				}
			};
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/console/registry",
				"params": {
					"env": postData.code
				},
				"data": data
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.$parent.displayAlert('success', 'Registry updated successfully');
				}
			});
		};
		$scope.jsonEditor = {
			custom: {
				data: ""
			},
			logger: {
				data: ""
			}
		};
		$scope.editorLoaded = function (_editor) {
			//bug in jsoneditor: setting default mode to 'code' does not display data
			//to fix this, use another mode, load data, wait, switch mode, wait, start listener to validate json object
			$scope.jsonEditor.logger.editor = _editor;
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
		
		//NOTE: check if edit registry
		if ($routeParams.code) {
			$scope.editRegistry($routeParams.code);
		} else {
			if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
				$scope.selectedEnv = $cookies.getObject('myEnv', {'domain': interfaceDomain});
				$scope.envCode = $scope.selectedEnv.code;
				if ($scope.envCode) {
					$scope.getRegistry();
				}
			}
		}
		
		injectFiles.injectCss("modules/dashboard/environments/environments.css");
	}]);
