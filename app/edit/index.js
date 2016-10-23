
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import ImagePicker from 'react-native-image-picker';
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


var Edit = React.createClass ({
  getInitialState(){
    var user = this.props.user || {}
    
    return ({
      user: user,
      previewVideo: null,

      // video upload
      video: null,
      videoUploaded: false,
      videoUploading: false,
      videoUploadedProgress: 0.01,
      // video loads
      playing: false,
      paused: false,
      videoProgress: 0.01,
      videoTotal: 0,
      currentTime: 0,
      // video player
      rate: 1,
      muted: true,
      resizeMode: 'contain',
      repeat: false
    })
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
  //请求给服务器端返回签名值（携带签名值将视频上传到七牛）
  _getQiniuToken(){
    var accessToken = this.state.user.accessToken
    var signatureURL = config.api.base + config.api.signature
    
    return request.post(signatureURL, {
        accessToken: accessToken,
        type: 'video',
        cloud: 'qiniu'
      })
      .catch((err) => {
        console.log(err)
      })
  },
  //上传视频到七牛
  _upload(body){
    var that = this
    var xhr = new XMLHttpRequest() //实例异步请求接口
    var url = config.qiniu.upload
    this.setState({
      videoUploadedProgress: 0,
      videoUploading: true,  //视频上传中状态 
      videoUploaded: false  //上传结束状态
    })

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
        that.setState({
          video: response,
          videoUploading: false,
          videoUploaded: true
        })
        //返回上传到七牛视频数据，post请求到服务器保存数据
        var videoURL = config.api.base + config.api.video
        var accessToken = this.state.user.accessToken
        request.post(videoURL, {
          accessToken: accessToken,
          video: response
        })
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
    if(xhr.upload){ //如果有上传事件
      xhr.upload.onprogress = (event) => { //绑定上传进度事件
        if(event.lengthComputable){ //有这个可计算的长度的值
          //已经上传过的值 除以 总共的数据量，取小数点后2位转成number类型
          var percent = Number((event.loaded / event.total).toFixed(2))  
          that.setState({
            videoUploadedProgress: percent  //上传的进度值
          })
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
      var uri = res.uri

      that.setState({
        previewVideo: uri
      })
      //请求服务器返回签名
      that._getQiniuToken()
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
            that._upload(body)
          }
        })

    })

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

  },
  render(){
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>
            {this.state.previewVideo ? '点击按钮配音' : '理解狗狗，从配音开始'}
          </Text>
          {
            this.state.previewVideo && this.state.videoLoaded
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
  }


});

module.exports = Edit;