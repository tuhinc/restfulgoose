var url = require('url');
var _ = require('underscore');
var querystring = require('querystring');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var BSON = mongodb.BSONPure;

module.exports = function(params){
//build models if none passed in
  if (params.hasOwnProperty('url')){
    mongoose.connect(params.url);
    var db = mongoose.connection;
    db.on('error',console.error.bind(console, 'connection error:'));
    db.once('open',function(){
      for (var coll in params.collections){
        params.collections[coll].model = mongoose.model(coll, params.collections[coll].schema);
      }

    });
  }


  return function(req,res,next){
    var routes = {
      'GET': [
        {
          root:  function(model){
            console.log("find all by model");
            model.find({}, function(err, documents){
              res.end(JSON.stringify(documents));
            });
          },
          id: function(model, query){
            console.log('finding by id: ' + query);
              model.findById(query, function(err, document) {
                res.end(JSON.stringify(document));
              });
           },
          query: function(collection, query){
            console.log('query');
            res.end(JSON.stringify("queried by query"));
            client.close();
          }
        }
      ],
      'POST': [
        {
          root: function(model){
            console.log("Insert a new record");
            model.create(req.body, function(err, document){
              console.log(document + " inserted");
              res.end(JSON.stringify(document));
            });
          }
        }
      ],
      'PUT': [
      {
        id: function(model, query){
          console.log('updating record ' + query);
          model.findByIdAndUpdate(query, req.body, function(err, document){
            console.log(JSON.stringify(document));
            res.end(JSON.stringify(document));
          });
        }
      }
      ],
      'DELETE': [
      {
        id: function(model, query){
          console.log('deleting record ' + query);
          model.findByIdAndRemove(query, function(err, docx){
            console.log('found record ' + docx);
            res.end("Document removed");
          });
        }
      }
      ]
    };
    var trailblazer = function(model, query, method){
      if (query){
        console.log(query);
        routes[method][0].id.apply(null,[model, query]);
      } else {
        routes[method][0].root.apply(null,[model]);
      }
    };

    var bar = url.parse(req.url, true);
    var pathParts = bar.pathname.split('/');
    var api = pathParts[1];
    var collectionName = pathParts[2];
    var id = pathParts[3];
    var queryParams = bar.query;


    function idValid(id){
      var regID = /[0-9a-z]{24}$/;
      return regID.test(id);
    }

    function buildQuery(idOrQuery) {
      if (idValid(idOrQuery)){
        console.log("searching by id: " + idOrQuery);
        return idOrQuery;
      } else {
        console.log("constructing query from string: " + idOrQuery);
        return idOrQuery; //TODO no good
      }
    }

    function callPath() {
      var query = buildQuery(id);
      console.log("query: " + query);
      trailblazer(model, query, req.method);  //pathParts - 1 = api exposure root, 2 = collection, 3 = id
    }

    if (params.collections.hasOwnProperty(collectionName) && _.contains(params.collections[collectionName].methods,req.method) && params.basepath === api){
      var auth = params.collections[collectionName].auth;
      var model = params.collections[collectionName].model;
      if (typeof auth === "function") {
        auth(req, res, callPath);
      }
      else {
        callPath();
      }
    } else {
      next();
    }
  };
};

