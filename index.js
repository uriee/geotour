var redis = require("redis"),
    client = redis.createClient();

    client.on("error", function (err) {
    console.log("error event - " + client.host + ":" + client.port + " - " + err);
});
var Q = require("q");
var express = require('express');
var app = express();
var http = require('http').Server(app);
//app.use(express.static(__dirname + '/scripts'));
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('demo2.html');
});

var Smembers = function(key){
  var d = Q.defer();
  client.smembers(key,function(err,ret){
    if(err) {console.log("Err Smembers",key,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Sadd = function(key,val){
  var d = Q.defer();
  client.sadd(key,val,function(err,ret){
    if(err) {console.log("Err Sadd",key,val,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Set = function(key,val){
  var d = Q.defer();
  client.set(key,val,function(err,ret){
    if(err) {console.log("Err set",key,val,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Hmset = function(key,val){
  var d = Q.defer();
  client.hmset(key,val,function(err,ret){
    if(err) {console.log("Err hmset",key,val,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Get = function(key){
  var d = Q.defer();
  client.get(key,function(err,ret){
    if(err) {console.log("Err get",key,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Hgetall = function(key){
  var d = Q.defer();
  client.hgetall(key,function(err,ret){
    if(err) {console.log("Err hgetall",key,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

io.on('connection', function(socket){
 console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });  
  socket.on('addTour', function (data) {
    console.log(data,JSON.parse(data));
    var inp = JSON.parse(data);
    Hmset('tour:'+inp.name,inp.args).then(/*redirection*/);
  });
  socket.on('addUser', function (data) {
    console.log(data,JSON.parse(data));
    var inp = JSON.parse(data);
    Sadd('tourUsers:'+inp.tour,inp.user);
    Hmset('user:'+inp.user,inp.args);
  });
  socket.on('updateLocation', function (data) {
    console.log(data,JSON.parse(data));
    var inp = JSON.parse(data);
    Set('userLocation:'+inp.name,inp.location);
  });
  socket.on('getLocations', function (tour) {
    console.log(data,JSON.parse(tourName));
    var tour = JSON.parse(tourName);
    var locations = [];
    Smembers('tourUsers:'+tour).then(
      ret.forEach(function(U){
        Get('userLocation:'+U).then(function(err,ret){locations.push({'name':U,location:ret})});
      })
     ).then( 
        function(err,ret){
        socket.emit('getLocation',locations);        
        })
  });
  /*
  socket.on('',function(key){
    console.log("fetch",key);
    Smembers('userR:'+key).then(function(data){
      out = {}
      out.terms = data;
      out.user = key;
      io.emit('fetch', JSON.stringify(out));
    });
  });
  */
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

addTerms = function(user,term,cb) {
  console.log("in incT :",user,term);
  client.smembers('userTerms:'+user,function(err,ret){
    if(err) cb(1,0);
    console.log("in incT smembers:",ret);  
    ret.forEach(function(T){
      if(T != term) {
         client.sadd('termR:'+term, T,function(err,ret){
            if(err) cb(1,0);
            client.sadd('termR:'+T,term,function(err,ret){
              if(err) cb(1,0);            
            }); 
         });
      }
    })
    cb(0,1);
  });
}; 

addUsers = function(user,term,cb) {
  console.log("in incU :",user,term);
  client.smembers('userTerms:'+user, function(err,ret){
    if (err) cb(1,0);  
    console.log("in incU smembers:",err,ret);
    ret.forEach(function(U) {
      if(U != user) {
        console.log("in incU : fi",U);
        client.sadd('userR:'+user, U,function(err,ret){
          if(err) cb(1,0);
          client.sadd('userR:'+U, user,function(err,ret){
            if(err) cb(1,0);
          });
        });
      }
    });
  });
}
         
 

insertTerm = function(user,term,cb){
  console.log("in IT",user,term);
  client.sadd("termUsers:"+term, user,function(err,ret){
    if(err) cb(1,0);
    client.sadd("userTerms:"+user, term,function(err,ret){
      if(err) cb(1,0);
      client.incr('term:'+term,function(err,ret){
        console.log(err,ret);
        if(err) cb(1,0);
        addTerms(user,term,function(err,ret){
          if(err) cb(1,0);
          addUsers(user,term,function(err,ret){
            console.log("incUsers called back");
            if(err) cb(1,0);
            cb(0,1)
          });
        });
      });  
    });  
  });
}
