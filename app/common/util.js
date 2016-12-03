'use strict'

var config = require('./config')

exports.thumb = function(key){
    if(key.indexOf('http') > -1) return key

    return config.qiniu.thumb + key
}

exports.avatar = function(key){
    if(!key){
        return config.backup.avatar
    }
    
    if(key.indexOf('http') > -1) return key

    if(key.indexOf('data:image') > -1) return key

    if(key.indexOf('avatar/') > -1){
        return config.cloudinary.base + '/image/upload/' + key
    }
    return config.qiniu.avatar + key
}

exports.video = function(key){
    if(key.indexOf('http') > -1) return key

    if(key.indexOf('video/') > -1){
        return config.cloudinary.base + '/video/upload/' + key
    }
    return config.qiniu.video + key
}
