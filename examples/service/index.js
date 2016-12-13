'use strict';
var soajs = require('soajs');
var config = require('./config.js');
var service = new soajs.server.service({ "config": config });

var entries = [];

service.init(function() {

	service.get('/list', function(req, res) {
		res.json(req.soajs.buildResponse(null, entries));
	});

	service.post('/add', function(req, res) {
		var found;
		entries.forEach(function(oneEntry) {
			if(oneEntry.title === req.soajs.inputmaskData.title) {
				found = true;
			}
		});

		if(!found) {
			entries.push({
				'title': req.soajs.inputmaskData.title,
				'description': req.soajs.inputmaskData.description,
				'created': new Date().getTime()
			})
		}
		res.json(req.soajs.buildResponse(null, true));
	});

	service.start();
});