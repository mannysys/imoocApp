/**
 * App轮播图
 */
'use strict'
import React, { Component } from 'react';
import Swiper from 'react-native-swiper';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableHighlight,
  Dimensions,
} from 'react-native';

//获取到当前屏幕可视化宽度
const {height, width} = Dimensions.get('window')


var Slider = React.createClass ({
  
  getInitialState(){
      return {
          loop: false,
          banners: [
              require('../assets/images/s1.jpg'),
              require('../assets/images/s2.jpg'),
              require('../assets/images/s3.jpg')
          ]
      }

  },

  _enter() {
    this.props.enterSlide()    
  },
  render() {
      console.log(this.state.banners)
      // dot是配置轮播图上点点图形  loop是否是不断的轮播（false是轮播一次）
      return (
        <Swiper 
            dot={<View style={styles.dot}/>} 
            activeDot={<View style={styles.activeDot}/>}
            paginationStyle={styles.pagination}
            loop={this.state.loop}>
            <View style={styles.slide}>
                <Image style={styles.image} source={this.state.banners[0]}/>
            </View>
            <View style={styles.slide}>
                <Image style={styles.image} source={this.state.banners[1]}/>
            </View>
            <View style={styles.slide}>
                <Image style={styles.image} source={this.state.banners[2]}/>
                <TouchableHighlight style={styles.btn} onPress={this._enter}>
                    <Text style={styles.btnText}>马上体验</Text>
                </TouchableHighlight>
            </View>
        </Swiper>
      )
  }
  
});

var styles = StyleSheet.create({
    slide: {
        flex: 1,
        width: width,
    },
    image: {
        flex: 1,
        width: width,
        height: height
    },
    dot: {
        width: 14,
        height: 14,
        backgroundColor: 'transparent',
        borderColor: '#ff6600',
        borderRadius: 7,
        borderWidth: 1,
        marginLeft: 12,
        marginRight: 12
    },
    activeDot: {
        width: 14,
        height: 14,
        borderWidth: 1,
        marginLeft: 12,
        marginRight: 12,
        borderRadius: 7,
        borderColor: '#ee735c',
        backgroundColor: '#ee735c',
    },
    pagination: {
        bottom: 30
    },

    btn: {
        position: 'absolute',
        width: width - 20,
        left: 10,
        bottom: 60,
        height: 50,
        padding: 15,
        backgroundColor: '#ee735c',
        borderColor: '#ee735c',
        borderWidth: 1,
        borderRadius: 3
    },
    btnText: {
        color: '#fff',
        fontSize: 20,
        textAlign: 'center'
    }
  
 
});

module.exports = Slider;