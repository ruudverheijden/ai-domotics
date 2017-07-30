let SQLite = require('sqlite3').verbose();
let Event = require("./event");

class History {
	constructor(filename) {
		var self = this;
		this.db = new SQLite.Database(filename);
	}
	
	setup(callback) {
		var self = this;
		
		this.db.serialize(function() {
			self.exists("event", function(exists) {
				if(!exists) {
					self.db.run("CREATE TABLE event (id INTEGER PRIMARY KEY, variable TEXT, value REAL)");
				}
				else {

				}
				
				self.exists("data", function(exists) {
					if(!exists) {
						console.log("Creating table data");
						self.db.run("CREATE TABLE data (event_id INTEGER, variable TEXT, value REAL)");
					}
					
					return callback();
				});
			});
		});
	}
	
	exists(table, callback) {
		var self = this;
		this.db.serialize(function() {
			self.db.get("SELECT 1 FROM sqlite_master WHERE type='table' AND name=$name", {$name: table}, function(err, res) {
				return callback(!!res);
			});
			
		});
	}
	
	save(event, callback) {
		var self = this;
		
		self.db.serialize(function() {
			self.db.run("INSERT INTO event (variable, value) VALUES ($variable, $value)", {$variable: event.variable, $value: event.value}, function(err, res) {
				let eventID = this.lastID;
				
				var save = [];
				for(var k in event.environment) {
					if(event.environment.hasOwnProperty(k)) {
						save.push({$variable: k, $value: event.environment[k], $eventID: eventID});
					}
				}
				
				// Start saving environment
				function popAndSave() {
					if(save.length > 0) {
						let record = save.shift();
						self.db.run("INSERT INTO data (event_id, variable, value) VALUES ($eventID, $variable, $value)", record, function(err) {
							popAndSave();
						});
					}
					else {
						if(callback) callback();
					}
				}
				
				popAndSave();
			});
		});
	}
	
	getIndependentsFor(variable, callback) {
		var self = this;
		
		self.db.serialize(function() {
			self.db.all("SELECT data.variable, MIN(data.value*1) AS mn, MAX(data.value*1) AS mx FROM data LEFT JOIN event ON event.id = data.event_id WHERE event.variable = $variable GROUP BY data.variable", {$variable: variable}, function(err, rows) {
				var env = {};
				let vars = rows.forEach(function(r) {
					env[r.variable] = [r.mn, r.mx];
				});
				return callback(env);
			});
		});
	}
	
	getEventsFor(variable, callback) {
		var self = this;
		
		self.db.serialize(function() {
			self.db.all("SELECT event.id AS eid, event.value AS y, data.variable AS xn, data.value AS xv FROM data LEFT JOIN event ON event.id = data.event_id WHERE event.variable = $variable ORDER BY event.id ASC", {$variable: variable}, function(err, rows) {
				var events = [];
				
				var event = null;
				for(var a=0; a<rows.length; a++) {
					let row = rows[a];
					
					if(event == null || event.id != row.eid) {
						if(event!==null) {
							events.push(event);
						}
						event = new Event(variable, row.y, {});
						event.id = row.eid;
					}
					
					event.environment[row.xn] = row.xv;
				}
				
				if(event!==null) {
					events.push(event);
				}
				
				return callback(events);
			});
		});
	}
};

module.exports = History;