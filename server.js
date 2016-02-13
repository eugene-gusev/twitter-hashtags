/**
 * Created by eugenegusev on 29.01.16.
 */
var express = require("express");
var app = express();
var config = require("./config");
var updater = require("./midnightUpdater");
var cron = require("cron").CronJob;

var mongodb = require('mongodb');
var mongo;  //для передачи клиенту

var MongoClient = mongodb.MongoClient;

var url = 'mongodb://localhost:27017/twitter';

var twitter = require('twitter');

var twit = new twitter({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token_key: config.twitter.access_token_key,
    access_token_secret: config.twitter.access_token_secret
});

app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));

//отображение начальной страницы
app.get('/', function(req, res) {
    var sort = JSON.parse('{"value.'+config.mongo.defaultPeriod+'" : -1}');
    var curs = mongo.collection('hash_stats').find({}).sort(sort).limit(15);

    curs.toArray(function (err, result) {
        res.render('index.jade', {list : result, def: config.mongo.defaultPeriod});
    });
});

//вывод 5 подсказок
app.get('/autocomplete/:text', function(req, res) {
    var search = "ObjectId\\("+req.params.text;
    var dbsize;
    var arr = [],counter=0;

    var curs = mongo.collection('hashtags').find({_id : new RegExp(search)}).sort({"hits_0": -1}).limit(5);

    curs.count(function(error, size) {
        dbsize=size;
    });

    curs.each(function (err, doc) {
        if (err) console.log(err);
        if (doc !== null) {
            arr.push(doc._id.slice(9,-1));
            counter++;
            if (counter==dbsize) {
                res.send({list: arr});
            }
        }
    });
});

//добавление элементов в таблицу
app.get('/show', function(req, res) {
    var find = JSON.parse('{"value.'+req.query.period+'":{"$gte":'+req.query.minimun+'}}');
    var sort = JSON.parse('{"value.'+req.query.period+'" : -1}');

    var curs = mongo.collection('hash_stats').find(find).sort(
        sort).limit(15).skip(parseInt(req.query.skip));

    curs.toArray(function (err, result) {
        if (result.length==0) {
            res.send({mes:"error"});
        }
        else {
            res.send({list : result});
        }
    });
});

//информация о хэштеге
app.get('/find/:hashtag', function (req,res) {
    var curs = mongo.collection('hash_stats').find({_id : req.params.hashtag});

    curs.toArray(function (err, result) {
        if (result.length==0) {
            res.send({mes:"error"});
        }
        else {
            res.send({mes : result[0]});
        }
    });
});

app.listen(2000);

MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        console.log('Connection established to', url);
        db.authenticate(config.mongo.user, config.mongo.pass, function(err, res) {
            console.log("Authenticated");

            mongo = db;

            //обновить поля hits_x в полночь
            var job = new cron('00 00 00 * * *', function() {
                    updater.newDay(db);
                },function () {
                    updater.deleteUnused(db);
                },
                true,
                'Europe/Moscow'
            );

            var map = function () {
                var value = {};
                for (var key in config.mongo.periods) {
                    function temp (obj) {
                        var result = 0;
                        for (var i = 0; i < config.mongo.periods[key].length; i++) {
                            if (!isNaN(parseInt(obj['hits_'+config.mongo.periods[key][i]]))) {
                                result += parseInt(obj['hits_' + config.mongo.periods[key][i]]);
                            }
                        }
                        return result;
                    }
                    value[key] = temp(this);
                }
                emit (this._id.slice(9,-1),value)
            };

            var reduce = function (key, val) {
                return val;
            };

            setInterval(function () {
                db.collection('hashtags').mapReduce(map,reduce,{out : {replace : 'hash_stats'}, scope : {config : config}},function (err, collection) {
                    if (err) console.log(err);
                    console.log("Updated. ")
                });
            },900000);

            twit.stream('statuses/sample', function(stream) {
                stream.on('data', function (data) {
                    if( (/[а-яА-ЯёЁ]/.test(data.text)) && (/#\S/.test(data.text)) && config.filters.isOK(data.text)) {
                        var hashs = getHashtags(data.text);
                        if (hashs.length > 0) {
                            hashs.forEach( function (hashtag) {
                                db.collection('hashtags').update({_id: "ObjectId("+hashtag+")"}, {$inc: {"hits_0": 1}}, {upsert:true,safe:true}, function (err, result) {
                                    if (err)  console.log(err);
                                });
                            });
                        }
                    }
                });
                stream.on('error', function(error) { throw error; });
            });
        });
    }
});

function getHashtags (str) {
    var hashtags = str.match(/#[а-яА-ЯёЁa-zA-Z0-9_]+/g); //найти все хэштеги
    if (hashtags==null)
        return [];
    for (var i = 0;i<hashtags.length;i++) {
        hashtags[i]=hashtags[i].substr(1).toLocaleLowerCase(); //убрать символы #
    }
    return hashtags;
}