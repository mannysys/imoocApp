
import React, { Component } from 'react';
import Button from 'react-native-button';
import { CountDownText } from 'react-native-sk-countdown'; //倒计时组件
import request from '../common/request';
import config from '../common/config';
import {
  StyleSheet,
  Text,
  View,
  AsyncStorage,
  TextInput,
  AlertIOS,
} from 'react-native';

var Login = React.createClass ({
  
  getInitialState(){
      return({
          verifyCode: '',  //验证码
          phoneNumber: '', //手机号
          countingDone: false,
          codeSent: false
      })

  },
  //显示验证码输入框
  _showVerifyCode(){
      this.setState({
          codeSent: true
      })
  },
  _countingDone(){
      this.setState({
          countingDone: true
      })

  },
  //给用户的手机上发送验证码
  _sendVerifyCode(){
      var that = this
      var phoneNumber = this.state.phoneNumber
      if(!phoneNumber){
          return AlertIOS.alert('手机号不能为空！')
      }
      var body = {
          phoneNumber: phoneNumber
      }
      var signupURL = config.api.base + config.api.signup
      request.post(signupURL, body)
        .then((data) => {
            if(data && data.success){
                that._showVerifyCode()
            }else{
                AlertIOS.alert('获取验证码失败，请检查手机号是否正确')
            }
        })
        .catch((err) => {
            AlertIOS.alert('获取验证码失败，请检查网络是否良好')
        })
  },
  //用户登录，同时提交手机号和验证码
  _submit(){
      var that = this
      var phoneNumber = this.state.phoneNumber
      var verifyCode = this.state.verifyCode

      if(!phoneNumber || !verifyCode){
          return AlertIOS.alert('手机号或验证码不能为空！')
      }
      var body = {
          phoneNumber: phoneNumber,
          verifyCode: verifyCode
      }
      var verifyURL = config.api.base + config.api.verify
      request.post(verifyURL, body)
        .then((data) => {
            if(data && data.success){
                //将用户数据传递给父组件
                that.props.afterLogin(data.data)  
            }else{
                AlertIOS.alert('获取验证码失败，请检查手机号是否正确')
            }
        })
        .catch((err) => {
            AlertIOS.alert('获取验证码失败，请检查网络是否良好')
        })

  },
  render(){
    // autoCaptialize 忽略纠正大小写
    // autoCorrect 忽略纠正内容对于错
    // keyboradType 设置数字键盘
    return (
      <View style={styles.container}>
        <View style={styles.signupBox}>
            <Text style={styles.title}>快速登录</Text>
            <TextInput
                placeholder='输入手机号'
                autoCaptialize={'none'}
                autoCorrect={false}
                keyboradType={'number-pad'}
                style={styles.inputField}
                onChangeText={(text) => {
                    this.setState({
                        phoneNumber: text
                    })
                }}
            />

            {   //如果发送验证码了，显示验证码输入框
                this.state.codeSent
                ? <View style={styles.verifyCodeBox}>
                    <TextInput
                        placeholder='输入验证码'
                        autoCaptialize={'none'}
                        autoCorrect={false}
                        keyboardType={'number-pad'}
                        style={styles.inputField}
                        onChangeText={(text) => {
                            this.setState({
                                verifyCode: text
                            })
                        }}
                    />
                    {   //显示倒计时按钮组件
                        this.state.countingDone
                        ? <Button 
                            style={styles.countBtn}
                            onPress={this._sendVerifyCode}>获取验证码</Button>
                        : <CountDownText
                            style={styles.countBtn}
                            countType='seconds' 
                            auto={true} 
                            afterEnd={this._countingDone} 
                            timeLeft={60} 
                            step={-1} 
                            startText='获取验证码' 
                            endText='获取验证码' 
                            intervalText={(sec) => '剩余秒数:' + sec} 
                          />
                    }
                </View>
                : null
            }

            {   //如果验证码发出去了，就切换登录按钮状态。
                this.state.codeSent
                ? <Button
                    style={styles.btn}
                    onPress={this._submit}>登录</Button>
                : <Button
                    style={styles.btn}
                    onPress={this._sendVerifyCode}>获取验证码</Button>    
            }
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
  signupBox: {
      marginTop: 30
  },
  title: {
      marginBottom: 20,
      color: '#333',
      fontSize: 20,
      textAlign: 'center'
  },
  //文本框
  inputField: {
      flex: 1,
      height: 40,
      padding: 5,
      color: '#666',
      fontSize: 16,
      backgroundColor: '#fff',
      borderRadius: 4
  },
  //验证码输入框
  verifyCodeBox: {
      margin: 10,
      flexDirection: 'row',
      justifyContent: 'space-between'
  },
  //倒计时按钮
  countBtn: {
      width: 110,
      height: 40,
      padding: 10,
      marginLeft: 8,
      backgroundColor: '#ee735c',
      borderColor: '#ee735c',
      color: '#fff',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: 15,
      borderRadius: 2
  },
  // button按钮
  btn: {
      margin: 10,
      padding: 10,
      backgroundColor: 'transparent', //透明背景色
      borderColor: '#ee735c',
      borderWidth: 1,
      borderRadius: 4,
      color: '#ee735c'
  }
 
});

module.exports = Login;