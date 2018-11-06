'use strict';

const config = require('./config');

const path = require('path');
const fs = require('fs');

const express = require('express');
const app = express();
const port = config.port;

fs.stat(path.normalize(__dirname + "/../default.config.js"), (error, stats) => {
	if(error){
		if(error.code === 'ENOENT' && !stats) {
			fs.copyFile(path.normalize(__dirname + "/../config.js"), path.normalize(__dirname + "/../default.config.js"), (err) => {
				if (err) throw err;
				
				checkUIConfig();
			});
		}
		else{
			throw error;
		}
	}
	else{
		checkUIConfig();
	}
});

function checkUIConfig(){
	fs.unlink(path.normalize(__dirname + "/../config.js"), (error) => {
		if(error){
			throw error;
		}
		
		fs.copyFile(path.normalize(__dirname + "/./uiConfig.js"), path.normalize(__dirname + "/../config.js"), (error) => {
			if(error){
				throw error;
			}
			
			//bind the ui
			app.use(express.static(path.join(__dirname, '../')));
			
			//start the express app
			app.listen(port, () => {
				console.log(`SOAJS UI Console started on ${config.host} and listening on port ${port}!`);
			});
			
		});
	});
}