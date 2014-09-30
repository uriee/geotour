var Q = require("q");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require("redis"),
    client = redis.createClient();

    client.on("error", function (err) {
    console.log("error event - " + client.host + ":" + client.port + " - " + err);
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

var Srem = function(key,val){
  var d = Q.defer();
  client.srem(key,val,function(err,ret){
    if(err) {console.log("Err Srem",key,val,err); d.reject(err);}
    else d.resolve(ret);
  });
  return d.promise;
};

var Sismember = function(key,val){
  var d = Q.defer();
  client.sismember(key,val,function(err,ret){
    if(err) {console.log("Err Sismember",key,val,err); d.reject(err);}
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

function get_locations(users,tour) {
  return Get('tour:'+tour).then(function(T){
    T = JSON.parse(T);
    var locations = [];
    users.forEach(function(user) {
        var deferred = Q.defer();
        Get('userLocation:'+user).then(function(ret){
          var Jret = JSON.parse(ret);
          var diff = Math.pow((parseInt(T.H)*60+parseInt(T.M)) - Jret.time,2);
          console.log('diff:',diff,(T.H*60+T.M),Jret.time,user);          
          var active = diff < 10 ? 1 : 0;
          deferred.resolve({'name':user,location : ret, active :active});
        });
        locations.push(deferred.promise);
    });
    return Q.all(locations);
  });  
}


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
  res.render('welcome',{'massage' : 'all fine!'});
});

app.get('/tour/:tourname/:username', function(req, res){
  Get('tour:'+req.params.tourname).then(function(d){
    var data = JSON.parse(d);
    if(!d) {
      res.render('welcome',{'massage' : 'No such Point'});
      return;
    }
    console.log(d);
    Sadd('tourUsers:'+req.params.tourname,req.params.username);
    res.render('tour', {
      tourname :  req.params.tourname,
      username :  req.params.username,
      H : data.H,
      M : data.M,
      lat : data.lat,
      lng : data.lng
    });    
  });

});


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
  socket.on('time', function (inp) {
    inp = JSON.parse(inp);
    Get('tour:'+inp.tour).then(function(data){
      data = JSON.parse(data);
      var minuts = data.M,
          houres = data.H;
      socket.emit('time',JSON.stringify({H: houres, M: minuts}));
     });  
  });
  socket.on('location', function (data) {
     data = JSON.parse(data);
    var obj = {}
    obj.lat = data.location.latitude;
    obj.lng = data.location.longitude;
    obj.time = data.H * 60 + data.M;
    Set('userLocation:'+data.name,JSON.stringify(obj));
  });
  
  socket.on('getLocations', function (tour) {
    Smembers('tourUsers:'+tour).then(function(ret){
      return get_locations(ret,tour);
    }).then( function(locations){
        console.log("loc",locations);
        socket.emit('getLocations',JSON.stringify(locations));        
    });
  });
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
      if(minuts == -120) {
        clearInterval(tourInterval);
        //client.del('tour:'+tour);
        //client.del('tourUsers'+tour);
      }
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
  },60000);
}

