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
        creations: 'api/creations',
        up: 'api/up'
    }

}