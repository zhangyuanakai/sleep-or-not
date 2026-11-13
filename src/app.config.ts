export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/wallet/index',
    'pages/sleep/index',
    'pages/wake/index',
    'pages/enroll/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationStyle: 'custom',
    backgroundColor: '#0B1120',
    navigationBarBackgroundColor: '#0B1120',
    navigationBarTitleText: '睡了么',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#64748B',
    selectedColor: '#F59E0B',
    backgroundColor: '#0B1120',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '挑战',
        iconPath: 'assets/tabbar/challenge.png',
        selectedIconPath: 'assets/tabbar/challenge-active.png'
      },
      {
        pagePath: 'pages/wallet/index',
        text: '战绩',
        iconPath: 'assets/tabbar/wallet.png',
        selectedIconPath: 'assets/tabbar/wallet-active.png'
      }
    ]
  },
  lazyCodeLoading: 'requiredComponents'
})
