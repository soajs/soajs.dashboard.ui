var apiBuilderConfig = {
	form: {
		
	},
	permissions: {
		'listEndpoints': ['dashboard', '/apiBuilder/list', 'get'],
		
		'getEndpoints': ['dashboard', '/apiBuilder/get', 'get'],
		
		'editEndpoints': ['dashboard', '/apiBuilder/edit', 'put'],
		
		'swaggertoIMFV': ['dashboard', '/apiBuilder/convertSwaggerToImfv', 'post'],
		
		'IMFVToSwagger': ['dashboard', '/apiBuilder/convertImfvToSwagger', 'post'],
		
		'updateEndpointSchema': ['dashboard', '/apiBuilder/updateSchemas', 'put'],
		
		'deleteEndpoint': ['dashboard', '/apiBuilder/delete', 'delete'],
		
		'generateService': ['dashboard', '/dashboard/swagger/generate', 'post'],
		
		'regenerateService': ['dashboard', '/dashboard/swagger/generateExistingService', 'post']
	}
};
