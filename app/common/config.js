'use strict';

// fetch 请求地址和头部
module.exports = {
    header: {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    },
    //上传到七牛
    qiniu: {
        upload: 'http://upload.qiniu.com/'
    },
    //上传到cloudinary，图床参数值
    cloudinary: {
        cloud_name: 'dk7g9s6hq',
        api_key: '273449438826248',
        base: 'http://res.cloudinary.com/dk7g9s6hq',
        image: 'https://api.cloudinary.com/v1_1/dk7g9s6hq/image/upload', //图片上传地址
        video: 'https://api.cloudinary.com/v1_1/dk7g9s6hq/video/upload', //视频上传地址
        audio: 'https://api.cloudinary.com/v1_1/dk7g9s6hq/audio/upload'  //音频上传地址
    },
    api: {
        base: 'http://localhost:1234/',
        // base: 'http://rap.taobao.org/mockjs/7186/',
        creations: 'api/creations', //视频列表
        comment: 'api/comments', //评论列表
        up: 'api/up', //点赞
        signup: 'api/u/signup',  //发送验证码
        verify: 'api/u/verify', //登录验证接口
        update: 'api/u/update', //更新用户头像接口
        signature: 'api/signature'  //签名接口
    }

}