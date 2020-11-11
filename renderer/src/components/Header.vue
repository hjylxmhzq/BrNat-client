<template>
  <div class="header">
    <div class="header-row">
      <span :class="{ 'is-online': isOnline }">{{
        isOnline ? "已连接" : "未连接"
      }}</span>
      <el-switch
        v-model="isOnline"
        active-color="#13ce66"
        inactive-color="#dddddd"
        @change="handleSwitchChange"
      >
      </el-switch>
      <el-checkbox-group v-model="checkProtocals" size="small">
        <el-tooltip
          v-for="protocal in protocals"
          class="item"
          effect="dark"
          :content="protocal.desc"
          placement="bottom"
          :key="protocal.name"
        >
          <el-checkbox-button :label="protocal.name">{{
            protocal.name
          }}</el-checkbox-button>
        </el-tooltip>
      </el-checkbox-group>
      <el-checkbox
        v-model="inLan"
        label="SYSU内部转发"
        border
        size="small"
        style="background-color: white"
        @change="handleInlanChange"
      ></el-checkbox>
    </div>
    <div class="header-row">
      <el-button
        type="primary"
        @click="customBindsDialogVisible = true"
        size="small"
        >添加自定义绑定</el-button
      >
      <el-button type="primary" @click="tokenDialogVisible = true" size="small"
        >修改Token</el-button
      >
      <span>Token: </span
      ><span style="user-select: auto">{{ token || "未设置" }}</span>
    </div>
    <el-dialog
      top="20px"
      title="请输入Token"
      :visible.sync="tokenDialogVisible"
      modal
    >
      <div slot="title" class="dialog-footer">请输入Token</div>
      <el-input placeholder="Token" v-model="token" size="small"></el-input>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="handleChangeToken" size="small"
          >确 定</el-button
        >
      </div>
    </el-dialog>
    <el-dialog
      top="20px"
      title="添加自定义绑定"
      :visible.sync="customBindsDialogVisible"
      modal
    >
      <div slot="title" class="dialog-footer">添加自定义绑定</div>
      <el-input placeholder="名称" size="small" v-model="customBindInput.label">
      </el-input>
      <el-input
        placeholder="穿透主机ip/domain"
        size="small"
        v-model="customBindInput.host"
      >
      </el-input>
      <el-input
        placeholder="穿透主机端口"
        size="small"
        v-model="customBindInput.port"
      >
      </el-input>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="handleAddCustomBind" size="small"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { Switch, CheckboxGroup, CheckboxButton } from "element-ui";
import { frpController } from "./frpClient";
import path from "path";
import Datastore from "nedb";

const Hosts = {
  sysu: "s.data-online.link",
  frp: "data-online.link",
};

const db = new Datastore({
  filename: path.resolve(__dirname, "../../db/binds.dat"),
  autoload: true,
});
const tokenDb = new Datastore({
  filename: path.resolve(__dirname, "../../db/token.dat"),
  autoload: true,
});
window.tokenDb = tokenDb;
window.db = db;
const defaultProtocals = {
  SSH: { port: 22, host: "127.0.0.1", label: "SSH", remotePort: -1 },
  FTP: { port: 21, host: "127.0.0.1", label: "FTP", remotePort: -1 },
  SMB: { port: 445, host: "127.0.0.1", label: "SMB", remotePort: -1 },
  RDP: { port: 3389, host: "127.0.0.1", label: "RDP", remotePort: -1 },
  HTTP: { port: 80, host: "127.0.0.1", label: "HTTP", remotePort: -1 },
  HTTPS: { port: 443, host: "127.0.0.1", label: "HTTPS", remotePort: -1 },
};

export default {
  name: "Header",
  components: {
    [Switch.name]: Switch,
    [CheckboxGroup.name]: CheckboxGroup,
    [CheckboxButton.name]: CheckboxButton,
  },
  methods: {
    isInvalidIP(ip) {
      const isIp = /(\d+\.){3}\d+/;
      const isValidIp = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
      return isIp.test(ip) && !isValidIp.test(ip);
    },
    handleInlanChange(inLan) {
      if (inLan) {
        this.bindHost = Hosts.sysu;
      } else {
        this.bindHost = Hosts.frp;
      }
      if (this.isOnline) {
        console.log("isInLan change: ", inLan);
        frpController.close();
        frpController.connect(
          this.token,
          this.$store.state.binds,
          this.bindHost,
          this.bindPort
        );
      }
    },
    handleChangeToken() {
      tokenDb.remove({}, { multi: true }, (err) => {
        if (!err) {
          tokenDb.insert({ token: this.token }, () => {
            console.log("add token: ", this.token);
          });
          this.tokenDialogVisible = false;
        }
      });
    },
    handleAddCustomBind() {
      let { label, host, port } = this.customBindInput;
      port = parseInt(port);
      if (!label) {
        this.$notify.error({
          title: "错误",
          message: "名称不能为空",
          duration: 0,
        });
        return;
      }
      if (!host) {
        this.$notify.error({
          title: "错误",
          message: "主机ip/domain不能为空",
          duration: 0,
        });
        return;
      }
      if (this.isInvalidIP(host)) {
        this.$notify.error({
          title: "错误",
          message: "ip格式错误",
          duration: 0,
        });
        return;
      }
      if (Number.isNaN(port) || port < 0 || port > 65535) {
        this.$notify.error({
          title: "错误",
          message: "端口号必须为范围在[0, 65535]的非负整数",
          duration: 0,
        });
        return;
      }
      for (let bind of this.binds) {
        if (
          bind.label === label ||
          (bind.port === port && bind.host === host) ||
          label in defaultProtocals
        ) {
          this.$notify.error({
            title: "错误",
            message: "绑定名称/主机:端口与已有绑定重复",
            duration: 0,
          });
          this.customBindsDialogVisible = true;
          return;
        }
      }
      const newCustomBind = {
        label,
        host,
        port,
        remotePort: -1,
        type: "custom",
      };
      this.customBinds.push(newCustomBind);
      db.insert(newCustomBind);
      this.$store.commit("addBind", newCustomBind);
      this.customBindsDialogVisible = false;
    },
    handleSwitchChange(value) {
      if (value) {
        const defaultBinds = this.checkProtocals.map((ptc) => {
          return defaultProtocals[ptc];
        });
        const combined = [...defaultBinds, ...this.customBinds];
        this.$store.commit("replaceBinds", combined);
        frpController.connect(
          this.token,
          combined,
          this.bindHost,
          this.bindPort
        );
      } else {
        frpController.close();
      }
    },
  },
  computed: {
    binds() {
      return this.$store.state.binds;
    },
    inLan: {
      set(value) {
        this.$store.commit("toggleInLan", value);
      },
      get() {
        return this.$store.state.inLan;
      },
    },
  },
  watch: {
    binds() {
      console.log(this.$store.state.binds);
      db.remove({}, { multi: true }, (err) => {
        if (!err) {
          const customBinds = this.$store.state.binds.filter((bind) => {
            return bind.type === "custom";
          });
          db.insert(customBinds);
          this.customBinds = customBinds;
        }
      });
      if (this.isOnline) {
        console.log("binds change");
        frpController.close();
        frpController.connect(
          this.token,
          this.$store.state.binds,
          this.bindHost,
          this.bindPort
        );
      }
    },
  },
  created() {
    tokenDb.findOne({ token: /.*/ }, (err, doc) => {
      console.log(doc);
      if (err) {
        console.error(err);
        return;
      }
      if (!doc) {
        this.tokenDialogVisible = true;
      } else {
        this.token = doc.token;
      }
    });
    this.statusListener = (status) => {
      if (status && status.binds) {
        const customBinds = this.$store.state.binds;
        Object.keys(status.binds).forEach((label) => {
          customBinds.forEach((bind) => {
            if (bind.label === label) {
              bind.remotePort = status.binds[label].remotePort;
            }
          });
        });
        this.$store.commit("replaceBinds", customBinds);
      }
      while (status && status.err.length) {
        frpController.close();
        const err = status.err.shift();
        this.$notify.error({
          title: "错误",
          message: err,
          duration: 0,
        });
      }
      const isOnline = status && status.isOnline ? true : false;
      this.isOnline = isOnline;
    };
    frpController.listenStatus(this.statusListener);
    db.find({ label: /.*/ }, (err, binds) => {
      if (err) {
        console.error(err);
      } else {
        this.customBinds = binds.map((bind) => ({
          label: bind.label,
          host: bind.label,
          port: bind.port,
          remotePort: -1,
          type: bind.type,
        }));
      }
    });
  },
  beforeDestroy() {
    frpController.removeStatusListener(this.statusListener);
  },
  data() {
    return {
      bindHost: Hosts.sysu,
      bindPort: 9998,
      tokenDialogVisible: false,
      customBinds: [],
      customBindsDialogVisible: false,
      token: "",
      isOnline: false,
      checkProtocals: ["HTTP"],
      customBindInput: { label: "", host: "", port: "" },
      protocals: [
        { name: "SSH", desc: "本地SSH连接(port:22)" },
        { name: "FTP", desc: "本地FTP连接(port:21)" },
        { name: "SMB", desc: "Server Message Block服务(port:445)" },
        { name: "RDP", desc: "本地远程桌面协议(port:3389)" },
        { name: "HTTP", desc: "本地HTTP服务(port:80)" },
        { name: "HTTPS", desc: "本地HTTPS服务(port:443)" },
      ],
    };
  },
  props: {
    msg: String,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@keyframes neon1 {
  from {
    text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff, 0 0 40px #ff1177,
      0 0 70px #ff1177, 0 0 80px #ff1177, 0 0 100px #ff1177, 0 0 150px #ff1177;
  }
  to {
    text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff, 0 0 20px #ff1177,
      0 0 35px #ff1177, 0 0 40px #ff1177, 0 0 50px #ff1177, 0 0 75px #ff1177;
  }
}
.header > .header-row {
  width: 100%;
  padding: 10px 0;
  display: flex;
  align-items: center;
}
.header > .header-row:nth-child(2) {
  padding-top: 0;
}
.header > .header-row > * {
  margin: 0 5px;
}
.header > .header-row > *:first-child {
  margin-left: 10px;
}
.header > .header-row > span {
  color: white;
  font-size: 12px;
  font-family: monoton;
}
.header > .header-row > span.is-online {
  animation: neon1 1.5s ease-in-out infinite alternate;
}
</style>
