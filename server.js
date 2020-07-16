var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var multer = require('multer');
var path = require('path')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
})

var upload = multer({ storage: storage });


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

let mydb, cloudant;
var vendor; // Because the MongoDB and Cloudant use different API commands, we
            // have to check which command should be used based on the database
            // vendor.
var dbName = 'mydb';

// Separate functions are provided for inserting/retrieving content from
// MongoDB and Cloudant databases. These functions must be prefixed by a
// value that may be assigned to the 'vendor' variable, such as 'mongodb' or
// 'cloudant' (i.e., 'cloudantInsertOne' and 'mongodbInsertOne')

var insertOne = {};
var getAll = {};

insertOne.cloudant = function(doc, response) {
  mydb.insert(doc, function(err, body, header) {
    if (err) {
      console.log('[mydb.insert] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
}

getAll.cloudant = function(response) {
  var names = [];  
  mydb.list({ include_docs: true }, function(err, body) {
    if (!err) {
      body.rows.forEach(function(row) {
        if(row.doc.name)
          names.push(row.doc.name);
      });
      response.json(names);
    }
  });
  //return names;
}

let collectionName = 'mycollection'; // MongoDB requires a collection name.

insertOne.mongodb = function(doc, response) {
  mydb.collection(collectionName).insertOne(doc, function(err, body, header) {
    if (err) {
      console.log('[mydb.insertOne] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
}

getAll.mongodb = function(response) {
  var names = [];
  mydb.collection(collectionName).find({}, {fields:{_id: 0, count: 0}}).toArray(function(err, result) {
    if (!err) {
      result.forEach(function(row) {
        names.push(row.name);
      });
      response.json(names);
    }
  });
}



var cookieParser = require('cookie-parser');
var session = require('express-session')
app.use(cookieParser());

app.use(session({
  secret: '34SDgsdgspxxxxxxxdfsG', // just a long random string
  resave: false,
  saveUninitialized: true
}));


/* Endpoint to greet and add a new visitor to database.
* Send a POST request to localhost:3000/api/visitors with body
* {
*   "name": "Bob"
* }
*/
// ##############################################################################################################




/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */

app.get("/api/files", function (request, response) {
  var files = [];
  if(!mydb) {
    response.json(files);
    return;
  }
  getAll[vendor](response);
});

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['compose-for-mongodb'] || appEnv.getService(/.*[Mm][Oo][Nn][Gg][Oo].*/)) {
  // Load the MongoDB library.
  var MongoClient = require('mongodb').MongoClient;

  dbName = 'mydb';

  // Initialize database with credentials
  if (appEnv.services['compose-for-mongodb']) {
    MongoClient.connect(appEnv.services['compose-for-mongodb'][0].credentials.uri, null, function(err, db) {
      if (err) {
        console.log(err);
      } else {
        mydb = db.db(dbName);
        console.log("Created database: " + dbName);
      }
    });
  } else {
    // user-provided service with 'mongodb' in its name
    MongoClient.connect(appEnv.getService(/.*[Mm][Oo][Nn][Gg][Oo].*/).credentials.uri, null,
      function(err, db) {
        if (err) {
          console.log(err);
        } else {
          mydb = db.db(dbName);
          console.log("Created database: " + dbName);
        }
      }
    );
  }

  vendor = 'mongodb';
} else if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/[Cc][Ll][Oo][Uu][Dd][Aa][Nn][Tt]/)) {
  // Load the Cloudant library.
  var Cloudant = require('@cloudant/cloudant');

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
    // CF service named 'cloudantNoSQLDB'
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
     // user-provided service with 'cloudant' in its name
     cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }
} else if (process.env.CLOUDANT_URL){
  cloudant = Cloudant(process.env.CLOUDANT_URL);
}
if(cloudant) {
  //database name
  dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);

  vendor = 'cloudant';
}

// API //

var itemsTagged = {
  "Recycle":["CD","DVDs","Cell Phones","Aerosol cans","Plastic Bottle","Potato Chip Bag","Plastic Container","Plastic Tub","Plastic Lid","Lawn Furniture","Laundry Basket","5-Gallon Bucket","Soda Crate","Garbage Can","Glass Bottles","Liquor Bottles","Beer Bottles","Soda Bottles","Wine Bottles","Glass Jars","Newspaper","Books","Phonebooks","Magazines","Milk Carton","Juice Carton","Scrap Paper","Junk Mail","Paper Towel Cardboard Roll","Toilet Paper Cardboard Roll","Pizza Box","Aluminum","Pots and Pans","Tins","Utensils","Steel Cans","Tin Cans","Paper Coffee Cups","Cardboard Boxes","Garbage","Food Waste","Takeout Containers","Wrapping Paper","Garden Hoses","Incandescent Light Bulbs","Latex Paint Can","Wet Strength Paper","Paper Towels","Tissues","Napkins","Hangers","Yard Waste","Christmas Tree","Tires","Electronics","Air Conditioners","LED Light Bulbs","Fluorescent Light Bulbs","Household Hazards","Household Cleaners","Pesticides","Fertilizers","Pool Chemicals","Oil Paints","Acrylic Paints","Oil-Based Paints","Acrylic-Based Paints","Propane Tanks","Batteries","Styrofoam","Paper Shredding","Plastic Bags","Rechargeable Batteries","Aerosol Spray Cans","Aerosol Cans","Antifreeze","Appliances","Automobiles","Bicycles","Building Materials","Carpet/Rugs","Clothing/Textiles","Cooking Oil","Crayons","Fire Extinguisher/Smoke Detector","Smoke Detector","Furniture","Gas","Ink Cartridges","Medical Waste","Motor Oil","Pallets","Pharmaceuticals","Toys","Plastic air pillows found inside shipping packages","Plastic straws","Concrete","Dehumidifier","Plastic Bubble Wrap","Packing Peanuts"],
  "Compost":["food", "fruit","banana","Egg shells","Coffee grounds","Coffee filters","Tea bags ","Loose leaf tea ","Spoiled soy","paper napkins","pizza boxes","Paper bags","crumbs","Cooked pasta ","Cooked rice ","Stale bread","Stale tortilla ","Spoiled pasta ","Soil","Paper towel","Stale ","Stale cereal ","Cardboard box","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],
  "Garbage":["Masks", "masks","plastic gloves","Hot drink cups","Cold drink cups","Plastic bubble wrap","Laminated plastic","Dryer and disposable mop sheets","baby wipes","Drink pouches","Gum packages","Ribbons","Broken mugs","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],
  "NA":["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]
}



var testobj = {
  table: []
};

var testobj2 = {
  table: []
};
let globalsessionID = "";
let globalFilepath = "";
let count = 0;
app.post('/uploads', upload.single('photo'), (req, res) => {
  if(req.file) {
      res.status(204).send();
      globalFilepath = req.file.path;
      globalsessionID = req.session.id;
      count = count + 1;
      testobj.table.push({count, globalsessionID, globalFilepath});
      var json = JSON.stringify(testobj);
      var fs = require('fs');
      fs.writeFile( __dirname + '/views/clientData.json', json, 'utf8', (error) => { "Error" });
      //console.log(globalFilepath);
 

var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
var fs = require('fs');

var visualRecognition = new VisualRecognitionV3({
	version: '2018-03-19',
	iam_apikey: 'OwIJy-h9k3FfXWtYelpMA1dfl3fn7-bygSqLq4KKwd_g'
});

var images_file= fs.createReadStream(globalFilepath);
var classifier_ids = ["default"];
var threshold = 0.6;

var params = {
	images_file: images_file,
	classifier_ids: classifier_ids,
	threshold: threshold
};
var Compost = "Compost";
var Recycle = "Recycle";
var Garbage = "Garbage";

visualRecognition.classify(params, function(err, response) {
	if (err) { 
		console.log(err);
	} else {
  ApiData = response.images[0].classifiers[0].classes;
  
  //console.log(ApiData)
  for (let i = 0; i < ApiData.length; i++){
    if (itemsTagged.Compost.find(element => element == ApiData[i].class)){
      testobj2.table.push("Compost");
      
    }
    else if(itemsTagged.Recycle.find(element => element == ApiData[i].class)){
      testobj2.table.push("Recycle");
      
    }
    else if(itemsTagged.Garbage.find(element => element == ApiData[i].class)){
      testobj2.table.push("Garbage");
      
    }
  }
  
  var json = JSON.stringify(testobj2);
  var fs = require('fs');
  fs.writeFile( __dirname + '/views/apitData.json', json, 'utf8', (error) => { "Error" });


	}
});

}
else throw 'error';
});

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));
app.use('/uploads', express.static('uploads'));



var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
