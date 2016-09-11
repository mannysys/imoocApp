/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
//页面
var List = require('./app/creation/index');
var Edit = require('./app/edit/index');
var Account = require('./app/account/index');

import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TabBarIOS,
  Navigator,
} from 'react-native';


var imoocApp = React.createClass ({
  getInitialState(){
    return {
      selectedTab: 'list'
    }
  },

  /*
   * initialRoute 初始化component 组件List
   * 从右边栏呼出（ Navigator.SceneConfigs.FloatFromRight ）
   * route.component 拿到初始化后组件List进行渲染出来
   * navigator 表示将navigator对象传递给组件List
   */
  render(){
    return (
      <TabBarIOS tintColor="#ee735c">
        <Icon.TabBarItem
          iconName='ios-videocam-outline'
          selectedIconName='ios-videocam'
          selected={this.state.selectedTab === 'list'}
          onPress={() => {
            this.setState({
              selectedTab: 'list',
            });
          }}>
          <Navigator
            initialRoute={{
              name: 'list',
              component: List
            }}
            configureScene={(route) => {
              return Navigator.SceneConfigs.FloatFromRight  
            }}
            renderScene={(route, navigator) => {
              var Component = route.component 
              return <Component {...route.params} navigator={navigator} />
            }}
          />
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName='ios-recording-outline'
          selectedIconName='ios-recording'
          selected={this.state.selectedTab === 'edit'}
          onPress={() => {
            this.setState({
              selectedTab: 'edit',
            });
          }}>
          <Edit />
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName='ios-more-outline'
          selectedIconName='ios-more'
          selected={this.state.selectedTab === 'account'}
          onPress={() => {
            this.setState({
              selectedTab: 'account',
            });
          }}>
           <Account />
        </Icon.TabBarItem>
      </TabBarIOS>
    );
  },
  
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('imoocApp', () => imoocApp);
