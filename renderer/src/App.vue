<template>
  <div id="app">
    <Header msg="Welcome to Your Vue.js App" />
    <Body />
  </div>
</template>

<script>
import Header from "./components/Header.vue";
import Body from "./components/Body.vue";
import "element-ui/lib/theme-chalk/index.css";

export default {
  name: "App",
  components: {
    Header,
    Body,
  },
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
}
p, span {
  user-select: none;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100vh;
  margin: 0;
  background: repeating-linear-gradient(
      45deg,
      #2b2b2b 0%,
      #2b2b2b 10%,
      #222222 0%,
      #222222 50%
    )
    0 / 15px 15px;
}
.el-table {
  transition: box-shadow 0.2s;
}
.el-table:hover {
  box-shadow: rgb(148, 148, 148) 0px 0px 7px 3px;
}
</style>
