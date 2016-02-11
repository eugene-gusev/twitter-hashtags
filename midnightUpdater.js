/**
 * Created by eugenegusev on 02.02.16.
 */
var config = require("./config");

var updater = {};

updater.newDay = function (db) {
    db.collection('hashtags').find({}).toArray(function (err, result) {
        if (err) console.log(err);

        result.forEach( function (doc) {
            var temp = {hits_0 : 0};

            for (var i = config.mongo.storagePeriod - 1;i>0;i--) {
                if ('hits_'+ (i-1) in doc) {
                    temp['hits_'+i] = doc['hits_'+ (i-1)];
                }
                else
                    temp['hits_'+i]=0;
            }

            db.collection('hashtags').update({_id: doc._id}, {$set: temp}, {upsert:true,safe:true}, function (err, result) {
                if (err)  console.log(err);
            });
        });
    });
};

updater.deleteUnused = function (db) {
    var aim = '{';
    for (var i = 0; i < config.mongo.storagePeriod-1; i++) {
        aim+='"hits_'+i+'":0,';
    }
    aim+='"hits_'+i+'":0}';
    db.collection('hashtags').remove(JSON.parse(aim), function (err, result) {
        if (err) console.log(err);
    });
};

module.exports = updater;