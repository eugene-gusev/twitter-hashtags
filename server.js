/**
 * Created by eugenegusev on 29.01.16.
 */
var express = require("express");
var app = express();
var parser = require("./hashtag_parser");
var config = require("./config");
var clean = require("./oldTweetsRemover");
var async = require("async");

var items = [function (db) {
    db.collection("unparsed").insert(temp, function (err, result) {
            if (err) {
                console.log(err);
            }
            temp = [];
        });
    },
    parser, clean];

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
    var curs = mongo.collection('hashtags').find({}).sort({"hits_1": -1}).limit(15);

    curs.toArray(function (err, result) {
        res.render('index.jade', {list : result});
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

    var curs = mongo.collection('hashtags').find(fnd[period]).sort(
        srt[period]).limit(15).skip(parseInt(req.params.skip));

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
    var curs = mongo.collection('hashtags').find({_id : "ObjectId(" + req.params.hashtag + ")"});

    curs.toArray(function (err, result) {
        if (result.length==0) {
            res.send({mes:"error"});
        }
        else {
            res.send({mes : result[0]});
        }
    });
});

var temp = [];

app.listen(2000);

MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        console.log('Connection established to', url);
        mongo = db;
        //clean(db,0);
       // parser(db);
        setInterval(function () {
            async.each(items, function (item) {
                item(db, 0);
            });
           /* items.forEach(function (item) {
                item(db);
            });*/
           /* db.collection("unparsed").insert(temp, function (err, result) {
                if (err) {
                    console.log(err);
                }
                temp = [];
                parser(db);
            });*/


          //  parser(db); //найти хэштеги в свежих твитах
           // clean(db);  //найти устаревшие твиты и обновить инф. о тегах
        }, 300000);

       // var collection = db.collection('unparsed');

        twit.stream('statuses/sample', function(stream) {
            stream.on('data', function (data) {
                if( (/[а-яА-ЯёЁ]/.test(data.text)) && (/#\S/.test(data.text))) {
                 /*   collection.insert({date: parseInt(data.timestamp_ms), text: data.text}, function (err, result) {
                        if (err) {
                            console.log(err);
                        }
                    });*/
                    temp.push({date: parseInt(data.timestamp_ms), text: data.text});
                }
            });

            stream.on('error', function(error) { throw error; });
        });
    }
});