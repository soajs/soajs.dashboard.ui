"use strict";
var overviewServices = soajsApp.components;
overviewServices.service('overviewSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function mapDeployToOverview(deploy) {
		let output = {
			ex: 1
		};
		
		return output;
	}
	
	function go(currentScope) {
		// currentScope.wizard.deploy = {
		// 	"database": {
		// 		"pre": {
		// 			"custom_registry": {
		// 				"imfv": [
		// 					{
		// 						"name": "ciConfig",
		// 						"locked": true,
		// 						"plugged": false,
		// 						"shared": true,
		// 						"value": {
		// 							"test": true
		// 						},
		// 					},
		// 					{
		// 						"name": "ciConfig2",
		// 						"locked": true,
		// 						"plugged": false,
		// 						"shared": true,
		// 						"value": {
		// 							"test": true
		// 						},
		// 					},
		// 					{
		// 						"name": "ciConfig3",
		// 						"locked": true,
		// 						"plugged": false,
		// 						"shared": true,
		// 						"value": {
		// 							"test": true
		// 						},
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"name": "ciConfig"
		// 						},
		// 						{
		// 							"name": "ciConfig2"
		// 						},
		// 						{
		// 							"name": "ciConfig3"
		// 						}
		// 					]
		// 				}
		// 			},
		// 		},
		// 		"steps": {
		// 			"productization": {
		// 				"ui": {
		// 					"readonly": true
		// 				}
		// 			},
		//
		// 			"tenant": {
		// 				"ui": {
		// 					"readonly": true
		// 				}
		// 			}
		// 		},
		// 		"post": {
		// 			"deployments.resources.external": {
		// 				"imfv": [
		// 					{
		// 						"name": "localmongo",
		// 						"type": "cluster",
		// 						"category": "mongo",
		// 						"locked": false,
		// 						"shared": false,
		// 						"plugged": false,
		// 						"config": {
		// 							"username": "username",
		// 							"password": "pwd"
		// 						}
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"db": "mongo id of this resource"
		// 						}
		// 					]
		// 				}
		// 			},
		// 		}
		// 	},
		//
		// 	"deployments": {
		// 		"pre": {
		// 			"infra.cluster.deploy": {
		// 				"imfv": [
		// 					{
		// 						"command": {
		// 							"method": "post",
		// 							"routeName": "/bridge/executeDriver",
		// 							"data": {
		// 								"type": "infra",
		// 								"name": "google",
		// 								"driver": "google",
		// 								"command": "deployCluster",
		// 								"project": "demo",
		// 								"options": {
		// 									"region": "us-east1-b",
		// 									"workernumber": 3,
		// 									"workerflavor": "n1-standard-2",
		// 									"regionLabel": "us-east1-b",
		// 									"technology": "kubernetes",
		// 									"envCode": "PORTAL"
		// 								}
		// 							}
		// 						},
		// 						"check": {
		// 							"id": {
		// 								"type": "string",
		// 								"required": true
		// 							}
		// 						}
		// 					},
		// 					{
		// 						"recursive": {
		// 							"max": 5,
		// 							"delay": 300
		// 						},
		// 						"check": {
		// 							"id": {
		// 								"type": "string",
		// 								"required": true
		// 							},
		// 							"ip": {
		// 								"type": "string",
		// 								"required": true
		// 							}
		// 						},
		// 						"command": {
		// 							"method": "post",
		// 							"routeName": "/bridge/executeDriver",
		// 							"data": {
		// 								"type": "infra",
		// 								"name": "google",
		// 								"driver": "google",
		// 								"command": "getDeployClusterStatus",
		// 								"project": "demo",
		// 								"options": {
		// 									"envCode": "PORTAL"
		// 								}
		// 							}
		// 						}
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": {
		// 						"id": "kaza",
		// 						"ip": "kaza",
		// 						"dns": {"a": "b"}
		// 					},
		// 					"rollback": {
		// 						"command": {
		// 							"method": "post",
		// 							"routeName": "/bridge/executeDriver",
		// 							"params": {},
		// 							"data": {
		// 								"type": "infra",
		// 								"name": "google",
		// 								"driver": "google",
		// 								"command": "deleteCluster",
		// 								"project": "demo",
		// 								"options": {
		// 									"envCode": "PORTAL",
		// 									"force": true
		// 								}
		// 							}
		// 						}
		// 					}
		// 				},
		// 			}
		// 		},
		// 		"steps": {
		// 			"secrets": {
		// 				"nginx-certs": {
		// 					"imfv": [
		// 						{
		// 							"name": "nginx-certs",
		// 							"namespace": "soajs",
		// 							"type": "Generic",
		// 							"data": "something in secret",
		// 						}
		// 					],
		// 					"status": {
		// 						"done": true,
		// 						"data": [
		// 							{
		// 								"name": "nginx-certs",
		// 								"namespace": "soajs"
		// 							}
		// 						]
		// 					}
		// 				}
		// 			},
		//
		// 			"deployments.resources.local": {
		// 				"imfv": [
		// 					{
		// 						"name": "localmongo",
		// 						"type": "cluster",
		// 						"category": "mongo",
		// 						"locked": false,
		// 						"shared": false,
		// 						"plugged": false,
		// 						"config": {
		// 							"username": "username",
		// 							"password": "pwd"
		// 						},
		// 						"deploy": {
		// 							"options": {
		// 								"deployConfig": {
		// 									"replication": {
		// 										"mode": "replicated",
		// 										"replicas": 1
		// 									},
		// 									"memoryLimit": 524288000
		// 								},
		// 								"custom": {
		// 									"sourceCode": {},
		// 									"name": "localmongo",
		// 									"type": "cluster"
		// 								},
		// 								"recipe": "5ab4d65bc261bdb38a9fe363",
		// 								"env": "DEV"
		// 							},
		// 							"deploy": true,
		// 							"type": "custom"
		// 						}
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"id": "deployment service id of this resource",
		// 							"db": "mongo id of this resource",
		// 							"mode": "replicated"
		// 						}
		// 					]
		// 				}
		// 			},
		//
		// 			"deployments.repo.controller": {
		// 				"imfv": [
		// 					{
		// 						"name": "controller",
		// 						"options": {
		// 							"deployConfig": {
		// 								"replication": {
		// 									"mode": "replicated",
		// 									"replicas": 1
		// 								},
		// 								"memoryLimit": 524288000
		// 							},
		// 							"gitSource": {
		// 								"owner": "soajs",
		// 								"repo": "soajs.controller",
		// 								"branch": "master",
		// 								"commit": "12345"
		// 							},
		// 							"custom": {
		// 								"sourceCode": {},
		// 								"name": "controller",
		// 								"type": "service"
		// 							},
		// 							"recipe": "5ab4d65bc261bdb38a9fe363",
		// 							"env": "DEV"
		// 						},
		// 						"deploy": true,
		// 						"type": "custom"
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"id": "1234abcd",
		// 							"mode": "replicated"
		// 						}
		// 					] //array of IDs
		// 				}
		// 			},
		//
		// 			"deployments.repo.urac": {
		// 				"imfv": [
		// 					{
		// 						"name": "urac",
		// 						"options": {
		// 							"deployConfig": {
		// 								"replication": {
		// 									"mode": "replicated",
		// 									"replicas": 1
		// 								},
		// 								"memoryLimit": 524288000
		// 							},
		// 							"gitSource": {
		// 								"owner": "soajs",
		// 								"repo": "soajs.urac",
		// 								"branch": "master",
		// 								"commit": "67890"
		// 							},
		// 							"custom": {
		// 								"sourceCode": {},
		// 								"name": "urac",
		// 								"type": "service"
		// 							},
		// 							"recipe": "5ab4d65bc261bdb38a9fe363",
		// 							"env": "DEV"
		// 						},
		// 						"deploy": true,
		// 						"type": "custom"
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"id": "1234abcd",
		// 							"mode": "replicated"
		// 						}
		// 					] //array of IDs
		// 				}
		// 			},
		//
		// 			"deployments.resources.nginx": {
		// 				"imfv": [
		// 					{
		// 						"name": "mynginx",
		// 						"type": "server",
		// 						"category": "nginx",
		// 						"locked": false,
		// 						"shared": false,
		// 						"plugged": false,
		// 						"config": null,
		// 						"deploy": {
		// 							"options": {
		// 								"deployConfig": {
		// 									"replication": {
		// 										"mode": "global"
		// 									},
		// 									"memoryLimit": 524288000
		// 								},
		// 								"custom": {
		// 									"sourceCode": {},
		// 									"secrets": [
		// 										{
		// 											"name": "private-key-cert",
		// 											"mountPath": "/etc/nginx/ssl",
		// 											"type": "certificate"
		// 										},
		// 										{
		// 											"name": "fullchain-cert",
		// 											"mountPath": "/etc/nginx/ssl",
		// 											"type": "certificate"
		// 										}
		// 									],
		// 									"name": "mynginx",
		// 									"type": "server"
		// 								},
		// 								"recipe": "5ab4d65bc261bdb38a9fe363",
		// 								"env": "DEV"
		// 							},
		// 							"deploy": true,
		// 							"type": "custom"
		// 						}
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": [
		// 						{
		// 							"id": "deployment service id of this resource",
		// 							"mode": "global"
		// 						}
		// 					]
		// 				}
		// 			}
		// 		},
		// 		"post": {
		// 			"infra.dns": {
		// 				"imfv": [
		// 					{
		// 						"recursive": {
		// 							"max": 5,
		// 							"delay": 300
		// 						},
		// 						"check": {
		// 							"dns": {
		// 								"type": "object",
		// 								"required": true
		// 							},
		// 							"ip": {
		// 								"type": "string",
		// 								"required": true
		// 							}
		// 						},
		// 						"command": {
		// 							"method": "post",
		// 							"routeName": "/bridge/executeDriver",
		// 							"data": {
		// 								"type": "infra",
		// 								"name": "google",
		// 								"driver": "google",
		// 								"command": "getDNSInfo",
		// 								"project": "demo",
		// 								"options": {
		// 									"envCode": "PORTAL"
		// 								}
		// 							}
		// 						}
		// 					}
		// 				],
		// 				"status": {
		// 					"done": true,
		// 					"data": {
		// 						"ip": "kaza",
		// 						"dns": {"a": "b"}
		// 					}
		// 				},
		// 			}
		// 		}
		// 	}
		// };
		// let deploy = currentScope.wizard.deploy;
		// currentScope.overview = mapDeployToOverview(deploy);
		
		console.log("--- ");
		console.log(currentScope);
		
	}
	
	return {
		go: go
	};
	
}]);