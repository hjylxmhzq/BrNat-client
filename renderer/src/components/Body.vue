<template>
  <div class="container">
    <el-table :data="tableData" style="width: calc(100vw - 18px); margin: auto; border-radius: 5px" height="calc(100vh - 103px)">
      <el-table-column prop="label" label="名称"></el-table-column>
      <el-table-column prop="host" label="主机"></el-table-column>
      <el-table-column prop="port" label="本地端口"></el-table-column>
      <el-table-column prop="remotePort" label="远程端口" width="200">
        <template slot-scope="scope">
          {{
            scope.row.remotePort && scope.row.remotePort !== -1
              ? `${inLan ? 's.data-online.link' : 'data-online.link'}:${scope.row.remotePort}`
              : "未绑定"
          }}
        </template></el-table-column
      >
      <el-table-column label="操作" width="60">
        <template slot-scope="scope">
          <el-button @click="deleteBind(scope.row)" type="text" size="small"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: "Body",
  created() {
    // this.statusListener = (status) => {
    //   if (status && status.binds) {
    //     const tableData = Object.keys(status.binds).map((label) => ({
    //       label: label,
    //       ...status.binds[label],
    //     }));
    //     this.tableData = tableData;
    //   }
    // };
    // frpController.listenStatus(this.statusListener);
  },
  computed: {
    tableData() {
      return this.$store.state.binds;
    },
    inLan() {
      return this.$store.state.inLan;
    }
  },
  methods: {
    deleteBind(row) {
      this.$store.commit('removeBind', row.label);
      console.log(row);
    },
  },
  beforeDestroy() {
    // frpController.removeStatusListener(this.statusListener);
  },
  data() {
    return {};
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
