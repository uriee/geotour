module.exports = function(Q) {
  var R = require("redis"),
      client = R.createClient();
      client.on("error", function (err) {
      console.log("error event - " + client.host + ":" + client.port + " - " + err);
  });
  ret ={}; 
  ret.Smembers = function(key){
    var d = Q.defer();
    client.smembers(key,function(err,ret){
      if(err) {console.log("Err Smembers",key,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Sadd = function(key,val){
    var d = Q.defer();
    client.sadd(key,val,function(err,ret){
      if(err) {console.log("Err Sadd",key,val,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Srem = function(key,val){
    var d = Q.defer();
    client.srem(key,val,function(err,ret){
      if(err) {console.log("Err Srem",key,val,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Sismember = function(key,val){
    var d = Q.defer();
    client.sismember(key,val,function(err,ret){
      if(err) {console.log("Err Sismember",key,val,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Set = function(key,val){
    var d = Q.defer();
    client.set(key,val,function(err,ret){
      if(err) {console.log("Err hmset",key,val,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Get = function(key){
    var d = Q.defer();
    client.get(key,function(err,ret){
      if(err) {console.log("Err get",key,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  ret.Hgetall = function(key){
    var d = Q.defer();
    client.hgetall(key,function(err,ret){
      if(err) {console.log("Err hgetall",key,err); d.reject(err);}
      else d.resolve(ret);
    });
    return d.promise;
  };

  return ret;
}
