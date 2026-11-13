import Taro from '@tarojs/taro'
import { createApp } from 'vue'

import './app.less'
import { CLOUD_ENV, IS_CLOUD_MODE } from './constants'
import { installGuardTracker } from './services/guard'
import { initStore, startClock } from './store'

if (IS_CLOUD_MODE) {
  try {
    Taro.cloud.init({
      env: CLOUD_ENV,
      traceUser: true
    })
  } catch (error) {
    console.warn('[app] 云开发初始化失败，请检查环境 ID', error)
  }
}

const App = createApp({
  onLaunch() {
    startClock()
    installGuardTracker()
    void initStore()
  },
  onShow() {
    startClock()
    void initStore()
  }
})

export default App
