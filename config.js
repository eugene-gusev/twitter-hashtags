/**
 * Created by eugenegusev on 02.02.16.
 */
var config = {};

config.twitter = {};
config.mongo = {};
config.filters = {};

config.twitter.consumer_key = '45iTZLa10cdi0fZ7NESVCy0sX';
config.twitter.consumer_secret = 'MBg2ndN0NvUyP5VDS5uJsCQ0jvayYzTBugZbwMP537zKY792s6';
config.twitter.access_token_key = '485027767-YLctmuM3ROlKXkeRBuF9x3tBhZoo17KRWJNs4OEI';
config.twitter.access_token_secret = 'MCeU7KKhbAbb8ChBQaEzH54iWWeoad2RbGKM0CyqsZpXy';

config.mongo.url = "mongodb://localhost:27017/twitter";

config.filters.rules = ["Урожай собран", "gameinsight"];
config.filters.isOK = function (str) {
    var re = new RegExp(config.filters.rules.join("|"), "i");
    return(str.match(re) === null);
};

module.exports = config;