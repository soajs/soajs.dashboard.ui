"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	/**
	 * Deploy Heapster to enable Auto Scaling.
	 * Kubernetes only.
	 * @param currentScope
	 */
	function deployHeapster(currentScope){
    	currentScope.isKubernetes = currentScope.envDeployer.selected.split('.')[1] === "kubernetes";
    	if(currentScope.isKubernetes && !currentScope.isAutoScalable){
		    var config = {
			    "method": "post",
			    "routeName": "/dashboard/cloud/plugins/deploy",
			    "data": {
			    	"env": currentScope.envCode,
				    "plugin": "heapster"
			    }
		    };

		    overlayLoading.show();
		    getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
			    overlayLoading.hide();
			    if (error) {
				    currentScope.displayAlert('danger', error.message);
			    }
			    else {
				    currentScope.displayAlert('success', 'Heapster is deployed successfully and will be available in a few minutes');
				    $timeout(function () {
					    currentScope.listServices();
				    }, 2000);
				    currentScope.isAutoScalable = true;
			    }
		    });
	    }
	    else{
    		if(!currentScope.isKubernetes) {
			    currentScope.displayAlert('danger', 'Heapster is only deployed in Kubernetes!!');
		    }else{
			    currentScope.displayAlert('danger', 'Heapster is already deployed!!');
		    }
	    }
    }
	
	/**
	 * Deploy Metrics server to enable metrics.
	 * Kubernetes only.
	 * @param currentScope
	 */
	function deployMetricsServer(currentScope){
		currentScope.isKubernetes = currentScope.envDeployer.selected.split('.')[1] === "kubernetes";
		if(currentScope.isKubernetes && !currentScope.isMetricsServerDeployed){
			var config = {
				"method": "post",
				"routeName": "/dashboard/cloud/plugins/deploy",
				"data": {
					"env": currentScope.envCode,
					"plugin": "metrics-server"
				}
			};
			
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.displayAlert('success', 'Metrics server is deployed successfully and will be available in a few minutes');
					$timeout(function () {
						currentScope.listServices();
					}, 2000);
					currentScope.isMetricsServerDeployed = true;
				}
			});
		}
		else{
			if(!currentScope.isKubernetes) {
				currentScope.displayAlert('danger', 'Metrics server is only deployed in Kubernetes!!');
			}else{
				currentScope.displayAlert('danger', 'Metrics server is already deployed!!');
			}
		}
	}

    return {
	    'deployHeapster': deployHeapster,
	    'deployMetricsServer': deployMetricsServer
    }
}]);
