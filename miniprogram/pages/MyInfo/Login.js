// pages/MyInfo/Login.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    showLoginDlg: {
      type: String,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    confirmLoginDlg() {
      console.log("login.confirmLoginDlg()")
      this.properties.showLoginDlg= false
      console.log("showLoginDlg:", this.properties.showLoginDlg)
    },

    cancelLoginDlg() {
      console.log("login.cancelLoginDlg()")
      this.properties.showLoginDlg = false
      console.log("showLoginDlg:", this.properties.showLoginDlg)
    },
  }
})