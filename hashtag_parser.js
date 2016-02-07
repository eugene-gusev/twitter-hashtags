/**
 * Created by eugenegusev on 31.01.16.
 */
var config = require("./config");

function getHashtags (str) {
    var hashtags = str.match(/#[а-яА-ЯёЁa-zA-Z0-9_]+/g); //найти все хэштеги
    if (hashtags==null)
        return [];
    for (var i = 0;i<hashtags.length;i++) {
        hashtags[i]=hashtags[i].substr(1).toLocaleLowerCase(); //убрать символы #
    }
    return hashtags;
}

function parse (db) {
    var unparsed = db.collection('unparsed');
    var cursor = unparsed.find({});
    var temp = [];
    var hashs_local,hashs_global=[], dbsize;

    cursor.count(function(error, size) {      //получить кол-во записей в бд
        dbsize=size;
    });

    cursor.each(function (err, doc) {
        if (err) {
            console.log(err);
        }

        else if ((doc !== null) && (config.filters.isOK(doc.text))) {   //отфильтровать ненужные твиты
            hashs_local=getHashtags(doc.text);

            if (hashs_local.length==0) {         //убрать твиты без хэштегов
                dbsize--;
            }
            else {
                temp.push({date: doc.date, hashtags: hashs_local});
                hashs_global=hashs_global.concat(hashs_local);
                if (temp.length == dbsize) {
                    var dat = new Date();
                    console.log("parsed    / " + dat.toLocaleString());

                    db.collection('tweets_0').insert(temp, function (err, result) {
                        if (err) console.log(err);

                        unparsed.remove({},function(err, removed){
                            if (err) console.log(err);

                            hashs_global.forEach(function (hashtag) {
                                db.collection('hashtags').update({_id: "ObjectId("+hashtag+")"},
                                    {$inc: {hits_0: 1, hits_1: 1, hits_2:1}}, {upsert:true,safe:false}, function (err, result) {
                                        if (err)    console.log(err);
                                    });
                            });
                        });
                    });
                }
            }
        }
        else {  //не прошедшие фильтр
            dbsize--;
        }
    });
}

module.exports = parse;
