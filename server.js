/**
 * Created by eugenegusev on 29.01.16.
 */
var express = require("express");
var app = express();
var parser = require("./hashtag_parser");
var config = require("./config");
var clean = require("./oldTweetsRemover");

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
    var arr = [],counter=0;

    var curs = mongo.collection('hashtags').find({}).sort({"hits_1": -1}).limit(15);

    curs.each(function (err, doc) {
        if (err) console.log(err);
        if (doc!==null) {
            arr.push(doc);
            counter++;
            if (counter==15) {
                res.render('index.jade', {list : arr});
            }
        }
    });

});

//вывод 5 подсказок
app.get('/autocomplete/:text', function(req, res) {
    var search = "ObjectId\\("+req.params.text;
    var dbsize;
    var arr = [],counter=0;

    var curs = mongo.collection('hashtags').find({_id : new RegExp(search)}).sort({"hits_2": -1}).limit(5);

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
app.get('/show/:period/:skip/:min', function(req, res) {
    var srt = [{hits_0:-1},{hits_1:-1},{hits_2:-1}];
    var limit = parseInt(req.params.min);
    var period = req.params.period;
    var fnd = [{hits_0: {$gte: limit}}, {hits_1: {$gte: limit}}, {hits_2: {$gte: limit}}];
    var arr = [],counter= 0, dbsize;

    var curs = mongo.collection('hashtags').find(fnd[period]).sort(
        srt[period]).limit(15).skip(parseInt(req.params.skip));

    curs.count(function(error, size) {
        dbsize=size;
    });

    curs.each(function (err, doc) {
        if (err) console.log(err);
        if (doc!==null) {
            arr.push(doc);
            counter++;
            if (counter==dbsize) {
                res.send({list : arr});
            }
        }
    });
});

//информация о хэштеге
app.get('/find/:hashtag', function (req,res) {
    var curs = mongo.collection('hashtags').find({_id : "ObjectId(" + req.params.hashtag + ")"});

    curs.count(function(error, size) {
        if (size==0) {
            res.send({mes:"error"});
        }
        else {
            curs.each(function (err, doc) {
                if (err) console.log(err);
                if (doc!==null) {
                    res.send({mes : doc});
                }
            });
        }
    });
});

app.listen(2000);

MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        console.log('Connection established to', url);
        mongo = db;
        setInterval(function () {
            parser(db); //найти хэштеги в свежих твитах
            clean(db);  //найти устаревшие твиты и обновить инф. о тегах
        }, 300000);

        var collection = db.collection('unparsed');

        twit.stream('statuses/sample', function(stream) {
            stream.on('data', function (data) {
                if( (/[а-яА-ЯёЁ]/.test(data.text)) && (/#\S/.test(data.text))) {
                    collection.insert({date: parseInt(data.timestamp_ms), text: data.text}, function (err, result) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            });

            stream.on('error', function(error) { throw error; });
        });
    }
});