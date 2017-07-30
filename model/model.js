let History = require("./history");
let SVM = require("svm");

class Model {
	constructor() {
		this.svm = null;
		this.xns = [];
		this.independents = {};
		
		this.options = {
		  kernel: 'rbf',
		  C: 4.0,
		  rbfsigma: 0.2
		}
	}
	
	train(variable, history, callback) {
		var self = this;
		
		history.getIndependentsFor(variable, function(inds) {
			self.independents = inds;
			self.xns = [];
		
			for(var k in inds) {
				if(inds.hasOwnProperty(k)) self.xns.push(k);
			}
			
			var data = [];
			var labels = [];
			
			history.getEventsFor(variable, function(events) {
				for(var a=0; a<events.length; a++) {
					let event = events[a];
				
					// Create data row
					var dataRow = [];
					for(var k=0; k<self.xns.length; k++) {
						let val = event.environment[self.xns[k]];
						let independent = self.independents[self.xns[k]];
						let normalizedVal = (independent[1] > independent[0]) ? (val - independent[0]) / (independent[1] - independent[0]) : 0;
						dataRow.push(normalizedVal);
					}
					data.push(dataRow);
					labels.push(parseInt(event.value));
				}
				
				self.svm = new SVM.SVM();
				self.svm.train(data, labels, self.options);
				return callback();
			});
		});
	}
	
	predict(env) {
		// Generate data row
		var data = [];
		for(var k=0; k<this.xns.length; k++) {
			let varName = this.xns[k];
			let value = env[varName] || 0;
			let independent = this.independents[varName];
			let normalizedValue = (independent[1] > independent[0]) ? (value - independent[0]) / (independent[1] - independent[0]) : 0;
			
			data.push(normalizedValue);
		}
		
		return this.svm.predict([data]);
	}
};

module.exports = Model;