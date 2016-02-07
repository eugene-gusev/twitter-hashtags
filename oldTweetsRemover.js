/**
 * Created by eugenegusev on 02.02.16.
 */
var async = require("async");

function clean (db, period) {
    var date = new Date();
    var time = date.getTime();
    var limits = [time-86400000,    //сутки
                  time-259200000,   //3 дня
                  time-604800000];  //неделя
   /* var cursors=[db.collection('tweets_0').find({date: {$lte: limits[0]}}),
                 db.collection('tweets_1').find({date: {$lte: limits[1]}}),
                 db.collection('tweets_2').find({date: {$lte: limits[2]}})];*/
    var cursor = db.collection('tweets_'+period).find({date: {$lte: limits[period]}});

        var hashs = [];
        var upd = [{$inc: {"hits_0": -1}},{$inc: {"hits_1": -1}},{$inc: {"hits_2": -1}}];

        cursor.toArray(function (err, result) {
            async.each(result, function (doc) {
                hashs = hashs.concat(doc.hashtags);
            },
            function (err) {
                if (err) console.log(err);

                var dat = new Date();
                console.log("cleaned " + period + " / " + dat.toLocaleString());

                db.collection('tweets_'+period).remove({date: {$lte: limits[period]}}, function (err, removed) {
                    if (err) console.log(err);

                    if (period!=2) { //если твиты не старше 7 дней
                        db.collection('tweets_' + (period + 1)).insert(result, function (err, result) {
                            if (err)  console.log(err);
                        });
                    }

                    hashs.forEach(function (hashtag) {
                        db.collection('hashtags').update({_id: "ObjectId("+hashtag+")"}, upd[period], {upsert:false,safe:false}, function (err, result) {
                            if (err)  console.log(err);
                        });
                    });
                });
            });
        });
    /*
        cursor.each(function (err, doc) {
            if (err) {
                console.log(err);
            }
            else if (doc !== null) {
                hashs = hashs.concat(doc.hashtags);
                objs.push({date: doc.date, hashtags: doc.hashtags});
                count++;
                if (count==dbsize) {
                    var dat = new Date();
                    console.log("cleaned " + i + " / " + dat.toLocaleString());

                    db.collection('tweets_'+i).remove({date: {$lte: limits[i]}}, function (err, removed) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    if (i!=2) { //если твиты не старше 7 дней
                        db.collection('tweets_' + (i + 1)).insert(objs, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }

                    hashs.forEach(function (hashtag) {
                        db.collection('hashtags').update({_id: "ObjectId("+hashtag+")"}, upd[i], {upsert:false,safe:false}, function (err, result) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    });
                }
            }

        });

    db.collection('hashtags').remove({hits_2: 0},function(err, removed){
        if (err) {
            console.log(err);
        }
    });*/
}

module.exports = clean;