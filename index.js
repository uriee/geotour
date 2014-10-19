var Q = require("q");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var os = require("os");
var redis = require('./redis')(Q);

function get_locations(users,tour) {
  return redis.Get('tour:'+tour).then(function(T){
    T = JSON.parse(T);
    var locations = [];
    users.forEach(function(user) {
        var deferred = Q.defer();
        redis.Get('userLocation:'+tour+':'+user).then(function(ret){
          var Jret = JSON.parse(ret);
          var diff = Math.pow((parseInt(T.H)*60+parseInt(T.M)) - Jret.time,2);
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

/*---------------Routers--------------------------------------*/

app.get('/init', function(req, res){
  res.render('init', {
    users: 4,
    title: "EJS example",
    header: "Some users"
  });
});

app.get('/', function(req, res){
  res.render('welcome',{'massage' : ''});
});

app.get('/geto/:tourname', function(req, res){
  res.render('byLink',{tourname : req.params.tourname});
});

app.get('/share/:tourname', function(req, res){
  res.render('link',{
    tourname : req.params.tourname,
    url : req.protocol + '://' + req.get('host') 
  });
});

app.get('/tour/:tourname/:username', function(req, res){
  redis.Get('tour:'+req.params.tourname).then(function(d){
    console.log("gg:",d)
    var data = JSON.parse(d);
    if(d===null) {
      res.render('welcome',{'massage' : 'No such Point'});
      return;
    }
    console.log(d);
    redis.Sadd('tourUsers:'+req.params.tourname,req.params.username);
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

/*-----------------------Socket Connection-------------------------------*/

io.on('connection', function(socket){
 console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });  
  
  socket.on('addTour', function (data) {
    console.log("kkk:",data,JSON.parse(data));
    var inp = JSON.parse(data)
    redis.Get('tour:'+inp.name).then(function(T){
      if(T) {
        socket.emit('validated', '0');
        return 0;
      }
      else {
        if (parseInt( inp.args.H) >= 0 && parseInt( inp.args.M) >= 0 && inp.name > ''){
          redis.Set('tour:'+inp.name,JSON.stringify(inp.args)).then(function(){
            run(inp.name);
            socket.emit('validated', '1');
          });
        }  
        else socket.emit('validated', '2');
      }
    });
  });
  
 
  socket.on('time', function (inp) {
    inp = JSON.parse(inp);
    redis.Get('tour:'+inp.tour).then(function(data){
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
    redis.Set('userLocation:'+data.tour+':'+data.name,JSON.stringify(obj));
    socket.join(data.tour);
  });
  
   
  socket.on('getLocations', function (tour) {
    redis.Smembers('tourUsers:'+tour).then(function(ret){
      return get_locations(ret,tour);
    }).then( function(locations){
        console.log("loc",locations);
        socket.emit('getLocations',JSON.stringify(locations));        
    });
  });
});

/*---------------------------------------------------------------------------*/

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var run  = function(tour){
  var tourInterval = setInterval(function(){
    var h = -2,
        m = 0;
    redis.Get('tour:'+tour).then(function(data){
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
      redis.Set('tour:'+tour,JSON.stringify(data)).then();
    });  
  },60000);
}

