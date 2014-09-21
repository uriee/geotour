var redis = require("redis"),
    client = redis.createClient();

    client.on("error", function (err) {
    console.log("error event - " + client.host + ":" + client.port + " - " + err);
});
var Q = require("q");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/scripts'));
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.get('/init', function(req, res){
  res.render('init', {
    users: 4,
    title: "EJS example",
    header: "Some users"
  });
});

app.get('/', function(req, res){
  res.render('welcome');
});

app.get('/tour/:tourname/:username', function(req, res){
  data = {}
  Get('tour:'+req.params.tourname).then(function(d){
    res.render('tour', {
      tourname :  req.params.tourname,
      username :  req.params.username,
      H : d.H,
      M : d.M,
      lat : d.lat,
      lng : d.lng
    });    
  });

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
    console.log("kkk:",data,JSON.parse(data));
    var inp = JSON.parse(data);
    console.log('Hmset(tour:','tour:'+inp.name,inp.args);
    Set('tour:'+inp.name,JSON.stringify(inp.args)).then(run(inp.name));
  });
  socket.on('addUser', function (data) {
    console.log(data,JSON.parse(data));
    var inp = JSON.parse(data);
    Sadd('tourUsers:'+inp.tour,inp.user);
    Set('user:'+inp.user,inp.tour);
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


var run  = function(tour){
  var tourInterval = setInterval(function(){
    var h = -2,
        m = 0;
    Get('tour:'+tour).then(function(data){
      data = JSON.parse(data);
      var minuts = data.M,
          houres = data.H;
      minuts--;
      if(minuts == -120) clearInterval(tourInterval);
      if(minuts === 0 & houres === 0) {
        /* time ended */
      }
      if(minuts == -1 & houres > 0){
        minuts=59;
        houres--;
      }
      data.M = minuts;
      data.H = houres;
      Set('tour:'+tour,JSON.stringify(data)).then();
    });  
  }, 1000);
}

