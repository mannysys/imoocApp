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
    api: {
        base: 'http://rap.taobao.org/mockjs/7186/',
        creations: 'api/creations', //视频列表
        comment: 'api/comments', //评论列表
        up: 'api/up', //点赞
        signup: 'api/u/signup',  //发送验证码
        verify: 'api/u/verify', //登录验证接口
        update: 'api/u/update', //更新用户头像接口
        signature: 'api/signature'  //签名接口
    }

}