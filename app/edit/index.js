
import _ from 'lodash';
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import ImagePicker from 'react-native-image-picker';
import { CountDownText } from 'react-native-sk-countdown'; //倒计时组件
import {AudioRecorder, AudioUtils} from 'react-native-audio';
import * as Progress from 'react-native-progress';

import request from '../common/request';
import config from '../common/config';
import {
  StyleSheet,
  Text,
  View,
  Image,
  AlertIOS,
  Dimensions,
  AsyncStorage,
  ProgressViewIOS,
  TouchableOpacity,
} from 'react-native';

//获取到当前屏幕可视化宽度和高度
var width = Dimensions.get('window').width;
var height = Dimensions.get('window').height;

//配置
var videoOptions = {
  title: '选择视频',
  cancelButtonTitle: '取消',
  takePhotoButtonTitle: '录制 10 秒视频',
  chooseFromLibraryButtonTitle: '选择已有视频',
  videoQuality: 'medium', //中等视频质量
  mediaType: 'video',
  durationLimit: 10, //录制的视频控制10秒
  noData: false,  
  storageOptions: {  //存储的类型base64
    skipBackup: true,
    path: 'images'
  }
};

//初始所有状态
var defaultState = {
  previewVideo: null,

  // video upload
  video: null,
  videoUploaded: false,
  videoUploading: false,
  videoUploadedProgress: 0.01,

  // video loads
  videoProgress: 0.01,
  videoTotal: 0,
  currentTime: 0,

  // count down
  counting: false,
  recording: false,

  // audio
  audio: null,
  audioPlaying: false,
  recordDone: false,
  //录制音频的文件路径
  audioPath:  AudioUtils.DocumentDirectoryPath + '/gougou.aac', 

  audioUploaded: false,
  audioUploading: false,
  audioUploadedProgress: 0.14,

  // video player
  rate: 1,
  muted: true,
  resizeMode: 'contain',
  repeat: false
}

var Edit = React.createClass ({
  getInitialState(){
    var user = this.props.user || {}
    var state = _.clone(defaultState) //克隆这个对象
    
    state.user = user
    return state

  },

  _onLoadStart(){
    console.log('load start');
  },
  _onLoad(){
    console.log('loads');
  },
  //第一次开始播放视频时触发，每隔250毫秒触发一次
  _onProgress(data){
    
    //视频播放的进度条值
    var duration = data.playableDuration  //视频总共播放的时间
    var currentTime = data.currentTime    //视频已经播放的时间
    var percent = Number((currentTime / duration).toFixed(2)) //保留小数后2位

    this.setState({
      videoTotal: duration,
      currentTime: Number(data.currentTime.toFixed(2)),
      videoProgress: percent  //视频播放的目前时间  
    })

  },
  //播放视频结束触发
  _onEnd(){
    if(this.state.recording){
      //结束录制音频
      AudioRecorder.stopRecording()

      this.setState({
        videoProgress: 1,
        recordDone: true,
        recording: false
      })
    }

  },  
  //视频播放报错触发
  _onError(e){
    this.setState({
      videoOk: false
    })
  },
 
  //控制预览音频
  _preview(){
    if(this.state.audioPlaying){
      AudioRecorder.stopPlaying()
    }
    this.setState({
      videoProgress: 0,
      audioPlaying: true
    })
    //开始播放音频
    AudioRecorder.playRecording()
    //视频也重新开始播放
    this.refs.videoPlayer.seek(0)
  },
  //倒计时结束后，调用该方法
  _record(){
    this.setState({
      videoProgress: 0,
      counting: false,
      recordDone: false,
      recording: true
    })

    //启动音频的录制
    AudioRecorder.startRecording()
    //将videoPlayer组件设置为0表示从头开始
    this.refs.videoPlayer.seek(0)
  },
  //启动倒计时
  _counting(){
    if(!this.state.counting && !this.state.recording && !this.state.audioPlaying){
      this.setState({
        counting: true
      })
      //将视频直接播放到最后10毫秒
      this.refs.videoPlayer.seek(this.state.videoTotal - 0.01)
    }
  },

  //请求给服务器端返回签名值（携带签名值将视频上传到七牛）qiniu和cloudinary
  _getToken(body){
    var signatureURL = config.api.base + config.api.signature
    
    body.accessToken = this.state.user.accessToken

    return request.post(signatureURL, body)
     
  },
  //上传视频到七牛或者cloudinary
  _upload(body, type){
    var that = this
    var xhr = new XMLHttpRequest() //实例异步请求接口
    var url = config.qiniu.upload

    if(type === 'audio'){
      url = config.cloudinary.video
    }
    
    var state = {}
    state[type + 'UploadedProgress'] = 0
    state[type + 'Uploading'] = true  //视频上传中状态 
    state[type + 'Uploaded'] = false  //上传结束状态

    this.setState(state)

    xhr.open('POST', url)
    xhr.onload = () => {  //绑定个事件，请求完毕触发
      if(xhr.status !== 200){
        AlertIOS.alert('请求失败')
        console.log(xhr.responseText)
        return
      }
      if(!xhr.responseText){
        AlertIOS.alert('请求失败')
        return
      }
      var response
      try {
        response = JSON.parse(xhr.response)   //将返回纯文本转换成json对象
      }catch(e){
        console.log(e)
        console.log('parse fails')
      }
      if(response){
        var newState = {}
        newState[type] = response
        newState[type + 'Uploading'] = false
        newState[type + 'Uploaded'] = true

        that.setState(newState)

        if(type === 'video') {
          //返回上传到七牛或者cloudinary视频数据，post请求到服务器保存数据
          var uploadURL = config.api.base + config.api[type]
          var accessToken = this.state.user.accessToken
          var uploadBody = {
            accessToken: accessToken
          }
          uploadBody[type] = response
          request.post(uploadURL, uploadBody)
          .catch((err) => {
            console.log(err)
            AlertIOS.alert('视频同步出错，请重新上传！')
          })
          .then((data) => {
            if(!data || !data.success){
              AlertIOS.alert('视频同步出错，请重新上传！')
            }
          })
        }
      }

    }
    if(xhr.upload){ //如果有上传事件
      xhr.upload.onprogress = (event) => { //绑定上传进度事件
        if(event.lengthComputable){ //有这个可计算的长度的值
          //已经上传过的值 除以 总共的数据量，取小数点后2位转成number类型
          var percent = Number((event.loaded / event.total).toFixed(2)) 

          var progressState = {} 
          progressState[type + 'UploadedProgress'] = percent //上传的进度值
          that.setState(progressState)
        }
      }
    }
    xhr.send(body)

  },
  //选择视频后，调用
  _pickVideo(){
    var that = this
    ImagePicker.showImagePicker(videoOptions, (res) => {
      if (res.didCancel) { //取消按钮
        return
      }

      var state = _.clone(defaultState)
      var uri = res.uri

      state.previewVideo = uri
      state.user = this.state.user
      that.setState(state)

      //请求服务器返回签名
      that._getToken({
        type: 'video',
        cloud: 'qiniu'
      })
      .catch((err) => {
        console.log(err)
        AlertIOS.alert('上传出错')
      })
        .then((data) => {
          if(data && data.success){
            var token = data.data.token  // 服务端返回生成签名值
            var key = data.data.key
            var body = new FormData() // post提交给七牛参数FormData
            body.append('token', token)
            body.append('key', key)
            body.append('file', {
              type: 'video/mp4',
              uri: uri,
              name: key
            })
            //携带签名值上传视频到七牛
            that._upload(body, 'video')
          }
        })
    })

  },
  //上传音频到cloudinary上
  _uploadAudio(){
    var that = this
    var tags = 'app,audio'
    var folder = 'audio'

    this._getToken({
      type: 'audio',
      timestamp: Date.now(),
      cloud: 'cloudinary'
    })
    .catch((err) => {
      console.log(err)
    })
    .then((data) => {
      if(data && data.success){
        var signature = data.data.token
        var key = data.data.key
        var body = new FormData()

        body.append('folder', folder)         //指定上传到目录
        body.append('signature', signature)   //签名值
        body.append('tags', tags)       
        body.append('timestamp', timestamp)    //时间戳
        body.append('api_key', config.cloudinary.api_key)
        body.append('resource_type', 'video')
        body.append('file', {
          type: 'video/mp4',
          uri: that.state.audioPath,
          name: key
        })

        that._upload(body, 'audio')
      }
    })
  },
  //音频初始化
  _initAudio(){
    //调用音频文件
    var audioPath = this.state.audioPath
   
    //音频参数初始化
    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: "High", //音频质量设置高
      AudioEncoding: "aac"
    })
    //以下2个音频监听方法
    AudioRecorder.onProgress = (data) => {
      this.setState({
        currentTime: Math.floor(data.currentTime)
      });
    }
    AudioRecorder.onFinished = (data) => {
      this.setState({
        finished: data.finished
      });
      console.log(`Finished recording: ${data.finished}`);
    }

  },
  //获取登录用户的信息，异步读取
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
          })
        }
      })

      //初始化音频组件
      this._initAudio()
  },
  
  render(){
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>
            {this.state.previewVideo ? '点击按钮配音' : '理解狗狗，从配音开始'}
          </Text>
          {
            this.state.previewVideo && this.state.videoUploaded
            ? <Text style={styles.toolbarExtra} onPress={this._pickVideo}>更换视频</Text>
            : null
          }
        </View>

        <View style={styles.page}>
          {
            this.state.previewVideo
            ? <View style={styles.videoBox}>
                <View style={styles.videoBox}>
                   <Video
                    ref='videoPlayer'
                    source={{uri: this.state.previewVideo}}
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
                  { //视频还没有上传完成，就显示进度条
                    !this.state.videoUploaded && this.state.videoUploading
                    ? <View style={styles.progressTipBox}>
                        <ProgressViewIOS 
                          style={styles.progressBar}
                          progressTintColor='#ee735c'
                          progress={this.state.videoUploadedProgress} />
                        <Text style={styles.progressTip}>
                          正在生成静音视频，已完成{(this.state.videoUploadedProgress * 100).toFixed(2)}%
                        </Text>    
                      </View>
                    : null    
                  }    
                  
                  { //显示录制声音进度条，或者在音频播放时候也可以出现进度条
                    this.state.recording || this.state.audioPlaying
                    ? <View style={styles.progressTipBox}>
                        <ProgressViewIOS 
                          style={styles.progressBar}
                          progressTintColor='#ee735c'
                          progress={this.state.videoProgress} />
                        { 
                          //录制时候，显示以下文本
                          this.state.recording
                          ? <Text style={styles.progressTip}>
                              录制声音中
                            </Text> 
                          : null
                        }
                      </View>
                    : null
                  }
                  { //音频录制完毕后，显示预览录制的音频
                    this.state.recordDone
                    ? <View style={styles.previewBox}>
                        <Icon name='ios-play' style={styles.previewIcon} />
                        <Text style={styles.previewText}
                          onPress={this._preview}>预览</Text>
                      </View>
                    : null
                  }
                </View>
              </View>
            : <TouchableOpacity style={styles.uploadContainer}
                onPress={this._pickVideo}>
                <View style={styles.uploadBox}>
                  <Image source={require('../assets/images/record.png')} style={styles.uploadIcon} />
                  <Text style={styles.uploadTitle}>点我上传视频</Text>
                  <Text style={styles.uploadDesc}>建议时长不超过 20秒</Text>
                </View>
              </TouchableOpacity>  
          }
          { //倒计时，开始录制音频
            this.state.videoUploaded 
            ? <View style={styles.recordBox}>
                <View style={[styles.recordIconBox, 
                  (this.state.recording || this.state.audioPlaying) && styles.recordOn]}>
                  { //没有录制之前并且正在倒计时的状态，显示倒计时组件
                    this.state.counting && !this.state.recording
                    ? <CountDownText
                        style={styles.countBtn}
                        countType='seconds'  //计时类型： seconds / date
                        auto={true}  //自动开始
                        afterEnd={this._record}  //结束回调
                        timeLeft={3}  //正向计时 时间起点为0秒
                        step={-1}  //计时步长，以秒为单位，正数则为正计时，负数则为倒计时
                        startText='准备录制' //开始的文本
                        endText='Go'  //结束的文本
                        intervalText={(sec) => {   //定时的文本回调
                          return sec === 0 ? 'Go' : sec
                        }} />
                    : <TouchableOpacity onPress={this._counting}>
                        <Icon name='ios-mic' style={styles.recordIcon} />
                      </TouchableOpacity>
                  }
                </View>
              </View>
            : null
          }
          { //上传音频到cloudinary云存储上
            //当商品上传结束同时录音结束时，显示下一步按钮
            this.state.videoUploaded && this.state.recordDone
            ? <View style={styles.uploadAudioBox}>
                { 
                  //当音频的正在上传的过程中，或者音频上传结束时
                  !this.state.audioUploaded && !this.state.audioUploading
                  ? <Text style={styles.uploadAudioText} 
                      onPress={this._uploadAudio}>下一步</Text>
                  : null
                }
                { //只要是音频上传，就显示上传进度条
                  this.state.audioUploading
                  ? <Progress.Circle 
                      showsText={true}
                      size={60} 
                      color={'#ee735c'}
                      progress={this.state.audioUploadedProgress} />
                  : null
                }
                </View>
              : null
           }

        </View>
      </View>
    )
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  //顶部导航
  toolbar: {
    flexDirection: 'row',
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },
  //顶部标题
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },
  //用户编辑
  toolbarExtra: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: '#fff',
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14
  },
  //视频上传
  page: {
    flex: 1,
    alignItems: 'center'
  },
  uploadContainer: {
    marginTop: 90,
    width: width - 40,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#fff'
  },
  uploadTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 16,
    color: '#000'
  },
  uploadDesc: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12
  },
  uploadIcon: {
    width: 110,
    resizeMode: 'contain'
  },
  uploadBox: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  //显示上传的视频
  videoContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  videoBox: {
    width: width,
    height: height * 0.6,
  },
  video: {
    width: width,
    height: height * 0.6,
    backgroundColor: '#333'
  },
  //上传视频的进度条
  progressTipBox: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: width,
    height: 30,
    backgroundColor: 'rgba(244,244,244,0.65)'
  },
  progressTip: {
    color: '#333',
    width: width - 10,
    padding: 5
  },
  progressBar: {
    width: width
  },
  //录制音频
  recordBox: {
    width: width,
    height: 60,
    alignItems: 'center'
  },
  recordIconBox: {
    width: 68,
    height: 68,
    marginTop: -30,
    borderRadius: 34,
    backgroundColor: '#ee735c',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordIcon: {
    fontSize: 58,
    backgroundColor: 'transparent', //背景透明
    color: '#fff'
  },
  countBtn: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff'
  },
  recordOn: {
    backgroundColor: '#ccc'
  },
  //预览音频录制
  previewBox: {
    width: 80,
    height: 30,
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewIcon: {
    marginRight: 5,
    fontSize: 20,
    color: '#ee735c'
  },
  previewText: {
    fontSize: 20,
    color: '#ee735c'
  },
  //上传音频cloudinary
  uploadAudioBox: {
    width: width,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadAudioText: {
    width: width - 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 30,
    color: '#ee735c'
  }

});

module.exports = Edit;