
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import Button from 'react-native-button';
import config from '../common/config';
import request from '../common/request';
import util from '../common/util';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ListView,
  TextInput,
  Modal,
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

var Detail = React.createClass ({

  getInitialState(){
    var data = this.props.data
    var ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2
    })
    return {
      data: data,
      // comments
      dataSource: ds.cloneWithRows([]),
      // video loads
      videoOk: true,
      videoLoaded: false,
      playing: false,
      paused: false,
      videoProgress: 0.01,
      videoTotal: 0,
      currentTime: 0,
      // modal
      content: '',
      animationType: 'none',
      modalVisible: false,
      isSending: false,

      // video player
      rate: 1,
      muted: false,
      resizeMode: 'contain',
      repeat: false
    }
  },
  //返回上一页
  _pop(){
      this.props.navigator.pop()
  },  

  _onLoadStart(){
    console.log('load start');
  },
  _onLoad(){
    console.log('loads');
  },
  //第一次开始播放视频时触发，每隔250毫秒触发一次
  _onProgress(data){
    if(!this.state.videoLoaded){
      this.setState({
        videoLoaded: true
      })
    }
    //视频播放的进度条值
    var duration = data.playableDuration  //视频总共播放的时间
    var currentTime = data.currentTime    //视频已经播放的时间
    var percent = Number((currentTime / duration).toFixed(2)) //保留小数后2位
    var newState= {
      videoTotal: duration,
      currentTime: Number(data.currentTime.toFixed(2)),
      videoProgress: percent  //视频播放的目前时间
    }
    if(!this.state.videoLoaded){
      newState.videoLoaded = true
    }
    if(!this.state.playing){
      newState.playing = true
    }
    this.setState(newState)

  },
  //播放视频结束触发
  _onEnd(){
    this.setState({
      videoProgress: 1,
      playing: false
    })

  },  
  //视频播放报错触发
  _onError(e){
    this.setState({
      videoOk: false
    })
  },
  //重新播放视频
  _rePlay(){
    this.refs.videoPlayer.seek(0)
  },
  //暂定视频触发
  _pause(){
    if(!this.state.paused){
      this.setState({
        paused: true
      })
    }
  },
  //从暂停开始播放触发
  _resume(){
    if(this.state.paused){
      this.setState({
        paused: false
      })
    }
  },
  //组件安装完触发
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
            that._fetchData()
          })
        }
      })
  },
  
  //请求评论列表
  _fetchData(page){
    var that = this
    this.setState({
      isLoadingTail: true  //显示上拉加载进度条
    })

    request.get(config.api.base + config.api.comment, {
      accessToken: this.state.user.accessToken,
      creation: this.state.data._id,
      page: page
    })
      .then((data) => {
        if(data && data.success){
          if(data.data.length > 0){
            var items = cachedResults.items.slice()  //拿到新列表数据

            items = items.concat(data.data) //将旧数据和新数据连接起来
            cachedResults.nextPage += 1  //每次请求页数加1
            cachedResults.items = items  //将新数据存储到cachedResults去
            cachedResults.total = data.total

            that.setState({
              isLoadingTail: false,
              dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
            });
          }
        }
      })
      .catch((error) => {
        this.setState({
          isLoadingTail: false
        });
        console.warn(error)
      });
  },
  // 判断有没有新的数据，如果不等于总数据值就是数据还没有加载完毕
  _hasMore(){
    return cachedResults.items.length !== cachedResults.total
  },
  //加载更多数据
  _fetchMoreData(){
    // 如果是没有更多的数据了或者是已经在加载中了
    if(!this._hasMore() || this.state.isLoadingTail){
      return 
    }
    var page = cachedResults.nextPage  //加载的下一页
    this._fetchData(page)  

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



  //评论用户列表模板
  _renderRow(row){
    return (
      <View key={row._id} style={styles.replyBox}>
        <Image style={styles.replyAvatar} source={{uri: util.avatar(row.replyBy.avatar)}}/>
        <View style={styles.reply}>
          <Text style={styles.replyNickname}>{row.replyBy.nickname}</Text>
          <Text style={styles.replyContent}>{row.content}</Text>
        </View>
      </View>
    )
  },
  //文本框获取焦点时触发，在整个详情页上面添加一个浮动层
  _focus(){
    this._setModalVisible(true)
  },
  //显示弹出浮层
  _setModalVisible(isVisible){
    this.setState({
      modalVisible: isVisible
    })
  },
  //失去焦点时触发
  _blur(){

  },
  //关闭弹出浮层
  _closeModal(){
    this._setModalVisible(false)
  },
  //定制ListView头部
  _renderHeader(){
    var data = this.state.data
    // 视频作者用户信息
    return (
      <View style={styles.listHeader}>
        <View style={styles.infoBox}>
          <Image style={styles.avatar} source={{uri: util.avatar(data.author.avatar)}}/>
          <View style={styles.descBox}>
            <Text style={styles.nickname}>{data.author.nickname}</Text>
            <Text style={styles.title}>{data.title}</Text>
          </View>
        </View>
        <View style={styles.commentBox}>
          <View style={styles.comment}>
            <TextInput
              placeholder='敢不敢评论一个'
              style={styles.content}
              multiline={true}
              onFocus={this._focus}
            />
          </View>
        </View>
        <View style={styles.commentArea}>
          <Text style={styles.commentTitle}>精彩评论</Text>
        </View>
      </View>
    )
  },
  //处理评论内容提交
  _submit(){
    var that = this
    if(!this.state.content){
      return AlertIOS.alert('留言不能为空！')
    }
    if(this.state.isSending){
      return AlertIOS.alert('正在评论中！')
    }
    this.setState({
      isSending: true
    }, function(){
      var body = {
        accessToken: this.state.user.accessToken,
        comment: {
          creation: this.state.data._id,
          content: this.state.content
        }
      }
      var url = config.api.base + config.api.comment

      request.post(url, body)
        .then(function(data){
          if(data && data.success){
            var items = cachedResults.items.slice()
            var content = that.state.content

            items = data.data.concat(items)
            cachedResults.items = items
            cachedResults.total = cachedResults.total + 1
            
            that.setState({
              content: '',
              isSending: false,
              dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
            })
            that._setModalVisible(false)
          }
        })
        .catch((err) => {
          console.log(err)
          that.setState({
            isSending: false
          })
          that._setModalVisible(false)
          AlertIOS.alert('留言失败，稍后重试！')
        })
    })
    
  },

  render(){
    var data = this.props.data
    /**
     * volume将当前的视频声音放大5倍。paused是打开详情页就播放。rate值如果是（0时暂停 1是播放）
     * muted 如果是true是静音 false是正常。resizeMode视频拉伸区域contain是包含。repeat是否重复播放
     * onLoadStart 当视频加载时调用该自定义方法
     * onLoad 当视频在不断加载时就会不断的调用该自定义方法
     * onProgress 当视频在播放时每隔250毫秒就会调用该自定义方法，同时会带上当前已播放时间作为参数
     * onEnd 视频结束触发事件。onError视频发送错误触发
     */
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          { //顶部返回
          }
          <TouchableOpacity style={styles.backBox} onPress={this._pop}>
            <Icon name='ios-arrow-back' style={styles.backIcon}/>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOflines={1}>视频详情页</Text>
        </View>
        <View style={styles.videoBox}>
          <Video
            ref='videoPlayer'
            source={{uri: util.video(data.qiniu_video)}}
            style={styles.video}
            volume={5}
            paused={this.state.paused}
            rate={this.state.rate}
            muted={this.state.muted}
            resizeMode={this.state.resizeMode}
            repeat={this.state.repeat}

            onLoadStart={this._onLoadStart}
            onLoad={this._onLoad}
            onProgress={this._onProgress}
            onEnd={this._onEnd}
            onError={this._onError} />

          { //视频出错了，文字提示
            !this.state.videoOk && <Text style={styles.failText}>视频出错了！很抱歉</Text>
          }  

          { //加载视频时的转动的提示进度条
            !this.state.videoLoaded && <ActivityIndicator color='#ee735c' style={styles.loading}/>
          }  

          { //重新播放视频按钮
            this.state.videoLoaded && !this.state.playing
            ? <Icon
                onPress={this._rePlay} 
                name='ios-play'
                size={48}
                style={styles.playIcon} />
             : null  
          }  

          { //在视频加载完和播放中，2个条件同时成立才能点击视频任意地方可以暂定视频
            this.state.videoLoaded && this.state.playing
            ? <TouchableOpacity onPress={this._pause} style={styles.pauseBtn}>
              
              { //如果点击了视频才会出现这个暂停按钮
                this.state.paused
                ? <Icon 
                    onPress={this._resume}
                    name='ios-play'
                    size={48}
                    style={styles.resumeIcon}/>
                : <Text></Text>    
              }
            </TouchableOpacity>
            : null
          }

          { 
            //视频播放的进度条 
          }
          <View style={styles.progressBox}>
            <View style={[styles.progressBar, {width: width * this.state.videoProgress}]}></View>
          </View> 
        </View>
        { //评论用户列表
          // automaticallyAdjustContentInsets 控制调整内容的默认true
          // showsVerticalScrollIndicator隐藏滚动条
        }
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
          renderHeader={this._renderHeader}
          renderFooter={this._renderFooter}
          onEndReached={this._fetchMoreData}
          onEndReachedThreshold={20}
          enableEmptySections={true}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
        />
        { // 评论浮层
          // 弹出浮层，animationType呼出动画形式，visible是否可见
          // onRequestClose 当关闭弹出浮层时触发回调函数
        }
        <Modal
          animationType={'fade'}
          visible={this.state.modalVisible}
          onRequestClose={() => {this._setModalVisible(false)}} >
          <View style={styles.modalContainer}>
            <Icon
              onPress={this._closeModal}
              name='ios-close-outline'
              style={styles.closeIcon} />
            <View style={styles.commentBox}>
              <View style={styles.comment}>
                <TextInput
                  placeholder='敢不敢评论一个'
                  style={styles.content}
                  multiline={true}
                  defaultValue={this.state.content}
                  onChangeText={(text) => {
                    this.setState({
                      content: text
                    })
                  }}
                />
              </View>
            </View>  
            <Button style={styles.submitBtn} onPress={this._submit}>评论
            </Button>
          </View>
        </Modal>
      </View>
    )
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  //弹出浮层评论
  modalContainer: {
    flex: 1,
    paddingTop: 45,
    backgroundColor: '#fff'
  },
  closeIcon: {
    alignSelf: 'center',
    fontSize: 30,
    color: '#ee753c'
  },
  //提交评论内容按钮
  submitBtn: {
    width: width - 20,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ee753c',
    borderRadius: 4,
    fontSize: 18,
    color: '#ee753c'
  },
  //顶部容器
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: 64,
    paddingTop: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  //返回点击内容
  backBox: {
    position: 'absolute',
    left: 12,
    top: 32,
    width: 50,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    width: width - 120,
    textAlign: 'center'
  },
  backIcon: {
    color: '#999',
    fontSize: 20,
    marginRight: 5
  },
  backText: {
    color: '#999'
  },
  //包含视频容器
  videoBox: {
    width: width,
    height: width * 0.56,
    backgroundColor: '#000'
  },
  //视频 
  video: {
    width: width,
    height: width * 0.56,
    backgroundColor: '#000'
  },
  //视频播放报错文字提示
  failText: {
    position: 'absolute',
    left: 0,
    top: 90,
    width: width,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: 'transparent'
  },
  loading: {
    position: 'absolute',
    left: 0,
    top: 80,
    width: width,
    alignSelf: 'center',
    backgroundColor: 'transparent'
  },
  //播放进度条背景
  progressBox: {
    width: width,
    height: 2,
    backgroundColor: '#ccc'
  },
  //播放进度条
  progressBar: {
    width: 1,
    height: 2,
    backgroundColor: '#ff6600'
  },
  //重新播放按钮
  playIcon: {
    position: 'absolute',
    top: 90,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    paddingTop: 8,
    paddingLeft: 22,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },
  //暂停视频按钮
  pauseBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width,
    height: 360
  },
  resumeIcon: {
    position: 'absolute',
    top: 80,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    paddingTop: 8,
    paddingLeft: 22,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },
  //视频作者信息
  infoBox: {
    width: width,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  avatar: {
    width: 60,
    height: 60,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 30
  },
  descBox: {
    flex: 1
  },
  nickname: {
    fontSize: 18
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    color: '#666'
  },
  //评论用户列表
  replyBox: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10
  },
  replyAvatar: {
    width: 40,
    height: 40,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 20
  },
  replyNickname: {
    color: '#666'
  },
  replyContent: {
    marginTop: 4,
    color: '#666'
  },
  reply: {
    flex: 1
  },
  //加载动作条
  loadingMore: {
    marginVertical: 20
  },
  //上拉加载完提示文字
  loadingText: {
    color: '#777',
    textAlign: 'center'
  },
  //评论框
  listHeader: {
    width: width,
    marginTop: 10
  },
  commentBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    width: width
  },
  content: {
    paddingLeft: 2,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 14,
    height: 80
  },
  //精彩评论
  commentArea: {
    width: width,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  }

});

module.exports = Detail;