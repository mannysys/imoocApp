
import React, { Component } from 'react';
import sha1 from 'sha1';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Progress from 'react-native-progress';
import ImagePicker from 'react-native-image-picker';
import Button from 'react-native-button';

import request from '../common/request';
import config from '../common/config';
import {
  StyleSheet,
  Text,
  View,
  AsyncStorage,
  TouchableOpacity,
  Dimensions,
  Image,
  AlertIOS,
  Modal,
  TextInput,
} from 'react-native';

//获取到当前屏幕可视化宽度
var width = Dimensions.get('window').width;
//相册组件的配置
var photoOptions = {
  title: '选择头像',
  cancelButtonTitle: '取消',
  takePhotoButtonTitle: '拍照',
  chooseFromLibraryButtonTitle: '选择相册',
  quality: 0.75,  //图片质量
  allowsEditing: true, //允许内部对图片裁剪或拉伸等处理
  noData: false,  
  storageOptions: {  //存储的类型base64
    skipBackup: true,
    path: 'images'
  }
};


var Account = React.createClass ({
  
  getInitialState(){
    var user = this.props.user || {}
    
    return ({
      user: user,
      avatarProgress: 0,
      avatarUploading: false,  //标记告诉用户图片正在上传中
      modalVisible: false
    })
  },
  //点击编辑按钮，浮层打开
  _edit() {
    this.setState({
      modalVisible: true
    })
  },
  //关闭浮层
  _closeModal() {
    this.setState({
      modalVisible: false
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

  //请求给服务器端返回签名值
  _getQiniuToken(){
    var accessToken = this.state.user.accessToken
    var signatureURL = config.api.base + config.api.signature
    
    return request.post(signatureURL, {
        accessToken: accessToken,
        type: 'avatar',
        cloud: 'qiniu'
      })
      .catch((err) => {
        console.log(err)
      })
      
  },
  //调用相册选取组件
  _pickPhoto(){
    var that = this
    ImagePicker.showImagePicker(photoOptions, (res) => {
      if (res.didCancel) { //取消了选择相册
        return
      }
      //图像数据
      var avatarData = 'data:image/jpeg;base64,' + res.data 
      var uri = res.uri

      that._getQiniuToken()
        .then((data) => {
          if(data && data.success){
            var token = data.data.token  // 服务端返回生成签名值
            var key = data.data.key

            var body = new FormData() // post提交给图床参数FormData
            body.append('token', token)
            body.append('key', key)
            body.append('file', {
              type: 'image/jpeg',
              uri: uri,
              name: key
            })

            that._upload(body)

          }
        })

    })

  },
  //上传图片异步请求到图床
  _upload(body){
    var that = this
    var xhr = new XMLHttpRequest() //实例异步请求接口
    var url = config.qiniu.upload
    
    this.setState({
      avatarUploading: true,
      avatarProgress: 0
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
        var user = this.state.user

        //来自 cloudinary 图床的
        if(response.public_id){
          user.avatar = response.public_id
        }
        //七牛的
        if(response.key){
          user.avatar = response.key
        }

        that.setState({
          avatarUploading: false,
          avatarProgress: 0,
          user: user
        })
        //头像图片上传到图床成功后，同步一下服务器上的数据
        that._asyncUser(true)
      }
    }
    
    if(xhr.upload){ //如果有上传事件
      xhr.upload.onprogress = (event) => { //绑定上传进度事件
        if(event.lengthComputable){ //有这个可计算的长度的值
          //已经上传过的值 除以 总共的数据量，取小数点后2位转成number类型
          var percent = Number((event.loaded / event.total).toFixed(2))  
          that.setState({
            avatarProgress: percent  //上传的进度值
          })
        }
      }
    }
    xhr.send(body)

  },
  //将上传到图床返回的图片地址，提交给服务器保存
  _asyncUser(isAvatar){
    var that = this
    var user = this.state.user
    if(user && user.accessToken){
      var url = config.api.base + config.api.update //更新服务器上的图片数据api
      
      request.post(url, user)
        .then((data) => {
          if(data && data.success){
            var user = data.data
            
            if(isAvatar){
              AlertIOS.alert('头像更新成功')
            }
            that.setState({
              user: user
            }, function(){
              that._closeModal()
              AsyncStorage.setItem('user', JSON.stringify(user))//将更新后的用户数据保存到本地存储
            })
          }
        })
    }

  },
  //用户编辑更新用户昵称
  _changeUserState(key, value){
    var user = this.state.user
    user[key] = value
    this.setState({
      user: user
    })
  },
  //保存用户编辑资料
  _submit(){
    this._asyncUser()
  },
  _logout(){
    this.props.logout()
  },

  //拼接图片上传到图床后返回图片url
  _avatar(id, type){
    if(id.indexOf('http') > -1){
      return id
    }
    if(id.indexOf('data:image') > -1){
      return id
    }
    if(id.indexOf('avatar/') > -1){
      return config.cloudinary.base + '/' + type + '/upload/' + id
    }
    
    //返回七牛上传地址
    return 'http://of4rf89l2.bkt.clouddn.com/' + id

  },

  render(){
    var user = this.state.user
    
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>狗狗的账号</Text>
          <Text style={styles.toolbarExtra} onPress={this._edit}>编辑</Text>
        </View>

        { //判断用户头像是否存在
          user.avatar
          ? <TouchableOpacity onPress={this._pickPhoto} style={styles.avatarContainer}>
              <Image source={{uri: this._avatar(user.avatar, 'image')}} style={styles.avatarContainer}>
                <View style={styles.avatarBox}>
                  { //如果是true显示正在上传图片一个进度条
                    this.state.avatarUploading
                    ? <Progress.Circle 
                        showsText={true}
                        size={75} 
                        color={'#ee735c'}
                        progress={this.state.avatarProgress} />
                    : <Image
                        source={{uri: this._avatar(user.avatar, 'image')}}
                        style={styles.avatar} />
                  }
                </View>
                <Text style={styles.avatarTip}>戳这里换头像</Text>
              </Image>
            </TouchableOpacity>
          : <TouchableOpacity onPress={this._pickPhoto} style={styles.avatarContainer}>
              <Text style={styles.avatarTip}>添加狗狗头像</Text>
              <View style={styles.avatarBox}>
                { //如果是true显示正在上传图片一个进度条
                  this.state.avatarUploading
                  ? <Progress.Circle 
                      showsText={true}
                      size={75} 
                      color={'#ee735c'}
                      progress={this.state.avatarProgress} />
                  : <Icon
                      name='ios-cloud-upload-outline'
                      style={styles.plusIcon} />
                }
              </View>
            </TouchableOpacity>
        }
        {
          //用户编辑浮出层，animationType设置有动画效果，visible是否可见
        }
        <Modal
          animationType={'slide'}
          visible={this.state.modalVisible} >
          <View style={styles.modalContainer}>
            <Icon
              name='ios-close-outline'
              onPress={this._closeModal}
              style={styles.closeIcon} />
            <View style={styles.fieldItem}>
              <Text style={styles.label}>昵称</Text>
              <TextInput
                placeholder={'输入你的昵称'}
                style={styles.inputField}
                autoCapitalize={'none'}  
                autoCorrect={false}
                defaultValue={user.nickname}
                onChangeText={(text) => {
                  this._changeUserState('nickname', text)
                }}
              />
            </View>   

            <View style={styles.fieldItem}>
              <Text style={styles.label}>品种</Text>
              <TextInput
                placeholder={'狗狗的品种'}
                style={styles.inputField}
                autoCapitalize={'none'}  
                autoCorrect={false}
                defaultValue={user.breed}
                onChangeText={(text) => {
                  this._changeUserState('breed', text)
                }}
              />
            </View>  

            <View style={styles.fieldItem}>
              <Text style={styles.label}>年龄</Text>
              <TextInput
                placeholder={'狗狗的年龄'}
                style={styles.inputField}
                autoCapitalize={'none'}  
                autoCorrect={false}
                defaultValue={user.age}
                onChangeText={(text) => {
                  this._changeUserState('age', text)
                }}
              />
            </View> 

            <View style={styles.fieldItem}>
              <Text style={styles.label}>性别</Text>
              <Icon.Button
                onPress={() => {
                  this._changeUserState('gender', 'male')
                }}
                style={[
                  styles.gender,
                  user.gender === 'male' && styles.genderChecked
                ]}
                name='ios-paw'>男</Icon.Button>
                <Icon.Button
                onPress={() => {
                  this._changeUserState('gender', 'female')
                }}
                style={[
                  styles.gender,
                  user.gender === 'female' && styles.genderChecked
                ]}
                name='ios-paw-outline'>女</Icon.Button>
            </View> 
            <Button
              style={styles.btn}
              onPress={this._submit}>保存资料</Button>
          </View>
        </Modal>

        <Button
          style={styles.btn}
          onPress={this._logout}>退出登录</Button>
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
  //头像容器
  avatarContainer: {
    width: width,
    height: 140,
    alignItems: 'center',  
    justifyContent: 'center', //上下居中
    backgroundColor: '#666'
  },
  //头像文字
  avatarTip: {
    color: '#fff',
    backgroundColor: 'transparent',
    fontSize: 14
  },
  //头像盒子
  avatarBox: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center'
  }, 
  //头像
  avatar: {
    marginBottom: 15,
    width: width * 0.2,
    height: width * 0.2,
    resizeMode: 'cover', //铺满
    borderRadius: width * 0.1
  },
  //图标
  plusIcon: {
    padding: 20,
    paddingLeft: 25,
    paddingRight: 25,
    color: '#999',
    fontSize: 24,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  //用户编辑浮层输入框
  modalContainer: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingLeft: 15,
    paddingRight: 15,
    borderColor: '#eee',
    borderBottomWidth: 1
  },
  label: {
    color: '#ccc',
    marginRight: 10
  },
  //浮层关闭按钮
  closeIcon: {
    position: 'absolute',
    width: 40,
    height: 40,
    fontSize: 32,
    right: 20,
    top: 30,
    color: '#ee735c'
  },
  //性别选择
  gender: {
    backgroundColor: '#ccc'
  },
  genderChecked: {
    backgroundColor: '#ee735c'
  },
  //表单input框
  inputField: {
    flex: 1,
    height: 50,
    color: '#666',
    fontSize: 14
  },
  // button按钮
  btn: {
      margin: 25,
      padding: 10,
      marginLeft: 10,
      marginRight: 10,
      backgroundColor: 'transparent', //透明背景色
      borderColor: '#ee735c',
      borderWidth: 1,
      borderRadius: 4,
      color: '#ee735c'
  }






});

module.exports = Account;