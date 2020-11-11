import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui';
import Vuex from 'vuex'

Vue.use(Vuex)
const store = new Vuex.Store({
  state: {
    binds: [],
    inLan: true,
  },
  mutations: {
    addBind(state, bind) {
      state.binds.push(bind);
    },
    removeBind(state, label) {
      const index = state.binds.findIndex(b => b.label === label);
      if (index !== -1) {
        state.binds.splice(index, 1);
      }
    },
    replaceBinds(state, binds) {
      state.binds = binds;
    },
    toggleInLan(state, isInLan) {
      state.inLan = isInLan;
    }
  }
})

Vue.config.productionTip = false

Vue.use(ElementUI);
new Vue({
  render: h => h(App),
  store
}).$mount('#app')
