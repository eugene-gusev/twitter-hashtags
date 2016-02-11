/**
 * Created by eugenegusev on 02.02.16.
 */
var config = {};

config.twitter = {};
config.mongo = {};
config.filters = {};

config.twitter.consumer_key = '4...X';
config.twitter.consumer_secret = 'M...6';
config.twitter.access_token_key = '4...I';
config.twitter.access_token_secret = 'M...y';

config.mongo.url = "mongodb://localhost:27017/twitter";
config.mongo.storagePeriod = 7;
config.mongo.periods = {
    "Неделя"  : [0,1,2,3,4,5,6],
    "3 дня"   : [0,1,2],
    "Сегодня" : [0]
};
config.mongo.defaultPeriod = "3 дня"; //при открытии сайта

config.filters.rules = ["Урожай собран", "gameinsight"];
config.filters.isOK = function (str) {
    var re = new RegExp(config.filters.rules.join("|"), "i");
    return(str.match(re) === null);
};

module.exports = config;