/**
 * 视频列表页
 */
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';

import request from '../common/request';
import config from '../common/config';
import util from '../common/util';
import Detail from './detail';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableHighlight,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  AlertIOS,
  AsyncStorage,
} from 'react-native';

//获取到当前屏幕可视化宽度
var width = Dimensions.get('window').width;
//存储加载页数数据
var cachedResults = {
  nextPage: 1,
  items: [],
  total: 0
}

//视频列表也 item项
var Item = React.createClass({
  getInitialState(){
    var row = this.props.row
    return {
      up: row.voted,  //点攒
      row: row
    }
  },
  // 处理点赞喜欢请求
  _up(){
    var that = this  //拿到当前这个this的上下文
    var up = !this.state.up
    var row = this.state.row
    var url = config.api.base + config.api.up
    //提交post数据
    var body = {
      id: row._id,
      up: up ? 'yes' : 'no',
      accessToken: this.props.user.accessToken
    }

    request.post(url, body)
      .then(function(data){
        if(data && data.success){
          that.setState({
            up: up
          })
        }else{
          AlertIOS.alert('点赞失败，稍后重试')
        }
      })
      .catch(function(err){
        console.log(err)
        AlertIOS.alert('点赞失败，稍后重试')
      })

  },
  
  render() {
    var row = this.state.row
    return (
      <TouchableHighlight onPress={this.props.onSelect}>
        <View style={styles.item}>
          <Text style={styles.title}>{row.title}</Text>
          <Image
            source={{uri: util.thumb(row.qiniu_thumb)}}
            style={styles.thumb} >
            <Icon
              name='ios-play'
              size={28}
              style={styles.play} />
          </Image>
          <View style={styles.itemFooter}>
            <View style={styles.handleBox}>
              <Icon
                name={this.state.up ? 'ios-heart' : 'ios-heart-outline'}
                size={28}
                onPress={this._up}
                style={[styles.up, this.state.up ? null : styles.down]} />
              <Text style={styles.handleText} onPress={this._up}>喜欢</Text>  
            </View>
            <View style={styles.handleBox}>
              <Icon
                name='ios-chatboxes-outline'
                size={28}
                style={styles.commentIcon} />
              <Text style={styles.handleText}>评论</Text>  
            </View>
          </View>
        </View>
      </TouchableHighlight>
    )
  }
})

//视频列表页
var List = React.createClass ({
  getInitialState(){
    var ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2
    });
    return {
      isRefreshing: false,
      isLoadingTail: false,
      dataSource: ds.cloneWithRows([])
    }
  },
  //列表项目
  _renderRow(row){
    return <Item 
      key={row._id} 
      user={this.state.user}
      onSelect={() => this._loadPage(row)} 
      row={row} />
  },
  // 组件安装完成后执行该方法
  componentDidMount(){
    var that = this

    AsyncStorage.getItem('user')
      .then((data) => {
        var user
        if(data){
          user = JSON.parse(data)
        }
        
        if(user && user.accessToken){
          that.setState({
            user: user
          }, function(){
            that._fetchData(1)
          })
        }
      })
     
  },
  // 请求获取api数据
  _fetchData(page){
    var that = this
    //判断是下拉还是上拉加载
    if(page !== 0){
      this.setState({
        isLoadingTail: true  //显示上拉加载进度条
      })
    }else {
      this.setState({
        isRefreshing: true  //显示下拉刷新进度条
      })
    }
    request.get(config.api.base + config.api.creations, {
      accessToken: this.state.user.accessToken,
      page: page
    })
      .then((data) => {
        if(data && data.success){
          //如果返回data是空数据的话，就不用执行更新了
          if(data.data.length > 0){
            var items = cachedResults.items.slice()  //拿到新列表数据

            if(page !== 0){
              items = items.concat(data.data) //将旧数据和新数据连接起来
              cachedResults.nextPage += 1  //每次请求页数加1
            }else{
              items = data.data.concat(items)
            }
            cachedResults.items = items  //将新数据存储到cachedResults去
            cachedResults.total = data.total
            if(page !== 0){
              that.setState({
                isLoadingTail: false,
                dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
              });
            }else{
              that.setState({
                isRefreshing: false,
                dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
              });
            }
          }
          
          
        }
      })
      .catch((error) => {
        if(page !== 0){
          this.setState({
            isLoadingTail: false
          });
        }else{
          this.setState({
            isRefreshing: false
          });
        }
        console.warn(error)
      });
  },
  // 判断有没有新的数据，如果不等于总数据值就是数据还没有加载完毕
  _hasMore(){
    return cachedResults.items.length !== cachedResults.total
  },
  //加载更多数据
  _fetchMoreData(){
    // 如果是没有数据了或者是已经在加载中了，直接返回
    if(!this._hasMore() || this.state.isLoadingTail){
      return 
    }
    var page = cachedResults.nextPage  //加载的下一页
    this._fetchData(page)  

  },
  //下拉刷新
  _onRefresh() {
    if(!this._hasMore() || this.state.isRefreshing) {
      return 
    }

    this._fetchData(0); 
  },
  //加载动作条，如果没有数据显示提示信息
  _renderFooter(){
    if(!this._hasMore() && cachedResults.total !== 0){
      return (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}> :) 没有更多了 </Text>
        </View>
      )
    }
    if(!this.state.isLoadingTail){
      return <View style={styles.loadingMore} />
    }
    return <ActivityIndicator style={styles.loadingMore} />
  },
  //打开详情页，拿到这个navigator属性
  _loadPage(row){
    this.props.navigator.push({
      name: 'detail',
      component: Detail, //跳转到详情页组件
      params: {  //将数据传递给详情页
        data: row
      }
    })
  },
  // ListView是基于ScrollView组件的所以它的属性同时也生效
  // automaticallyAdjustContentInsets 控制调整内容的默认true
  // onEndReached滑动到底部触发，onEndReachedThreshold是离底部距离20dp尺寸时加载，显示一个预加载转动进度条
  // showsVerticalScrollIndicator隐藏滚动条
  render(){
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>列表页面</Text>
        </View>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
          renderFooter={this._renderFooter}
          onEndReached={this._fetchMoreData}
          refreshControl={
            <RefreshControl
              refreshing={this.state.isRefreshing}
              onRefresh={this._onRefresh}
              // tintColor='#ff6600'
              // title='拼命加载中...'
            />
          }
          onEndReachedThreshold={20}
          enableEmptySections={true}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
        />
      </View>
    )
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  header: {
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600'
  },
  //列表每一项
  item: {
    width: width,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  //封面图
  thumb: {
    width: width,
    height: width * 0.56,
    resizeMode: 'cover'
  },
  //标题
  title: {
    padding: 10,
    fontSize: 18,
    color: '#333'
  },
  //封面图底部容器
  itemFooter: {
    flexDirection: 'row',  //显示并排一行
    justifyContent: 'space-between', //两端对齐
    backgroundColor: '#eee'
  },

  handleBox: {
    padding: 10,
    flexDirection: 'row',
    width: width / 2 - 0.5,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  play: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 46,
    height: 46,
    paddingTop: 9,
    paddingLeft: 18,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 23,
    color: '#ed7b66'
  },
  handleText: {
    paddingLeft: 12,
    fontSize: 18,
    color: '#333'
  },
  // 喜欢 点赞图标
  down: {
    fontSize: 22,
    color: '#333'
  },
  up: {
    fontSize: 22,
    color: '#ed7b66'
  },
  //评论图标
  commentIcon: {
    fontSize: 22,
    color: '#333'
  },
  //加载动作条
  loadingMore: {
    marginVertical: 20
  },
  //文字
  loadingText: {
    color: '#777',
    textAlign: 'center'
  }


});

module.exports = List;