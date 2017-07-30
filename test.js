let History = require("./model/history");
let Event = require("./model/event");
let Model = require("./model/model");

let h = new History("test.db");

h.setup(function() {
	for(var n=0; n<1000; n++) {
		let weekend = Math.random() > (2/7) ? 1 : 0;
		let uur = Math.round(Math.random() * 24);
		let aan = (!weekend && (uur >= 8 && uur <= 9) || (uur >= 18 && uur <= 23)) || (weekend && (uur >= 10 && uur <=23));
		
		let randomFlip = Math.random() < 0.01 ? !aan : aan;
		
		console.log("Train", uur, weekend, randomFlip ? 1 : -1);
		h.save(new Event("light", randomFlip ? 1 : -1, {uur: uur, weekend: weekend}));
	}

	h.save(new Event("light", -1, { "uur": 23, "weekend": 0 }), function() {		
		let model = new Model();
		model.train("light", h, function() {
			console.log('model is trained!', model.svm.toJSON());	
			
			var ys = [];
			var wys = [];
			for(var u=0; u<24; u++) {
				ys.push(model.predict({uur: u, weekend: 0 })[0]);
				wys.push(model.predict({uur: u, weekend: 1 })[0]);
			}
			console.log("Week\t\t", ys.join("\t"));
			console.log("Weekends\t", wys.join("\t"));
		});
	});	
});
