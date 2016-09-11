
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';

import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

//获取到当前屏幕可视化宽度
var width = Dimensions.get('window').width;

var Detail = React.createClass ({

  getInitialState(){
    var data = this.props.data
    return {
      data: data,

      videoOk: true,
      videoLoaded: false,
      playing: false,
      paused: false,

      videoProgress: 0.01,
      videoTotal: 0,
      currentTime: 0,

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
            source={{uri: data.video}}
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
      </View>
    )
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
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
    height: 360,
    backgroundColor: '#000'
  },
  //视频
  video: {
    width: width,
    height: 360,
    backgroundColor: '#000'
  },
  //视频播放报错文字提示
  failText: {
    position: 'absolute',
    left: 0,
    top: 180,
    width: width,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: 'transparent'
  },
  loading: {
    position: 'absolute',
    left: 0,
    top: 140,
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
    top: 140,
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
    top: 140,
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
  
  
});

module.exports = Detail;